import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData, SpinWheelResult, SearchedUser, ExamStat, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";
import { getApiBaseUrl } from './apiConfig.ts';

// A simple module-level lock to prevent concurrent sync operations.
let isSyncing = false;

const apiFetch = async (endpoint: string, method: 'GET' | 'POST', token: string | null, data: Record<string, any> = {}) => {
    const API_BASE_URL = getApiBaseUrl();
    const fullUrl = `${API_BASE_URL}/wp-json/mco-app/v1${endpoint}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method,
        headers,
    };
    
    if (method === 'POST') {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(fullUrl, config);
        // Get response as text to handle potential non-JSON responses gracefully.
        const responseText = await response.text();

        if (!response.ok) {
            let errorData;
            try {
                // An error response from the WP REST API should be JSON.
                errorData = JSON.parse(responseText);
            } catch (e) {
                // If it's not JSON, it's likely an HTML error page from the server.
                // Throw the raw text as it might contain useful debug info.
                throw new Error(responseText || response.statusText || `Server error: ${response.status}`);
            }
            
            if (errorData?.code === 'jwt_auth_missing_token') {
                throw new Error("Authorization header missing. This is a server configuration issue. Please check the Admin Debug Sidebar for the solution.");
            }
            const errorMessage = errorData?.message || response.statusText || `Server error: ${response.status}`;
            throw new Error(errorMessage);
        }
        
        // If the response was successful (2xx status), try to parse the body as JSON.
        try {
            // Handle empty successful responses (e.g. 204 No Content) which would have an empty body.
            return responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            // This catches cases where the server returns a 200 OK but the body is not valid JSON (e.g., PHP notices).
            console.error(`API Call to ${endpoint} returned OK but with invalid JSON:`, responseText);
            throw new Error('The server returned an invalid response. This is often caused by a PHP error from your theme or another plugin. Check your browser\'s developer console for the full server output.');
        }

    } catch (error: any) {
        console.error(`API Fetch Error to ${endpoint}:`, error);

        // Handle network errors specifically.
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            throw new Error(`Could not connect to the API server at ${API_BASE_URL}. Please check your internet connection.`);
        }
        
        // Re-throw any other errors, which will be our custom, more informative errors from the blocks above.
        throw error;
    }
};

export const googleSheetsService = {
    // --- ADMIN NOTIFICATION ---
    notifyAdmin: async (token: string, subject: string, message: string, context: object): Promise<void> => {
        try {
            await apiFetch('/notify-admin', 'POST', token, { subject, message, context });
        } catch (error) {
            // We don't want to throw an error here, just log it. 
            // The user experience shouldn't be interrupted if the notification fails.
            console.error("Failed to send admin notification:", error);
        }
    },

    // --- AI FEEDBACK ---
    getAIFeedback: async (prompt: string, token: string): Promise<string> => {
        if (!process.env.API_KEY) {
            console.error("Gemini API key is not configured.");
            return "We're sorry, but the AI feedback feature is not configured correctly. Please contact support.";
        }
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text;
        } catch (error: any) {
            console.error("Error getting AI feedback from Gemini:", error);

            const errorMessage = error.message || 'An unknown error occurred with the Gemini API.';
            googleSheetsService.notifyAdmin(
                token, 
                "Gemini AI Feedback Failure", 
                errorMessage,
                { prompt_start: prompt.substring(0, 200) + '...' }
            );
            
            return "We're sorry, but the AI feedback service is currently unavailable due to high demand or a temporary issue. Our technical team has been automatically notified. Please try again in a little while.";
        }
    },
    
    // --- RESULTS HANDLING (CACHE-FIRST APPROACH) ---
    syncResults: async (user: User, token: string): Promise<void> => {
        // This lock prevents a race condition where multiple sync requests (e.g., from a button
        // click and a component mount) could be fired simultaneously. The second request will be
        // safely ignored, preventing a spurious error notification from a cancelled network request.
        if (isSyncing) {
            console.warn("Synchronization already in progress. Skipping this request.");
            return;
        }
        isSyncing = true;

        try {
            const serverResults: TestResult[] = await apiFetch('/user-results', 'GET', token) || [];

            const resultsObject: { [testId: string]: TestResult } = {};
            serverResults.forEach(result => {
                resultsObject[result.testId] = result;
            });

            const key = `exam_results_${user.id}`;
            const storedResults = localStorage.getItem(key);
            const localResults = storedResults ? JSON.parse(storedResults) : {};

            const mergedResults = { ...localResults, ...resultsObject };
            
            localStorage.setItem(key, JSON.stringify(mergedResults));
            console.log('Results successfully synced with the server.');
        } catch (error) {
            console.error("Failed to sync results with server:", error);
            throw error;
        } finally {
            isSyncing = false;
        }
    },

    getLocalTestResultsForUser: (userId: string): TestResult[] => {
        try {
            const storedResults = localStorage.getItem(`exam_results_${userId}`);
            if (storedResults) {
                const resultsData = JSON.parse(storedResults);
                if (resultsData && typeof resultsData === 'object') {
                    return Object.values(resultsData);
                }
            }
            return [];
        } catch (error) {
            console.error("Failed to parse results from localStorage", error);
            return [];
        }
    },

    getTestResult: (user: User, testId: string): TestResult | undefined => {
        try {
            const storedResults = localStorage.getItem(`exam_results_${user.id}`);
            const results = storedResults ? JSON.parse(storedResults) : {};
            return results[testId];
        } catch (error) {
            console.error("Failed to parse results from localStorage", error);
            return undefined;
        }
    },

    // --- DIRECT API CALLS (NOT CACHED LOCALLY) ---
    getCertificateData: async (token: string, testId: string): Promise<ApiCertificateData> => {
        try {
            return await apiFetch(`/certificate-data/${testId}`, 'GET', token);
        } catch (error) {
            console.error("Failed to get certificate data from server:", error);
            throw error;
        }
    },
    
    getDebugDetails: async (token: string): Promise<DebugData> => {
        try {
            return await apiFetch(`/debug-details`, 'GET', token);
        } catch (error) {
            console.error("Failed to get debug details from server:", error);
            throw error;
        }
    },

    updateUserName: async (token: string, newName: string): Promise<any> => {
        try {
            return await apiFetch('/update-name', 'POST', token, { fullName: newName });
        } catch (error) {
            console.error("Failed to update user name:", error);
            throw error;
        }
    },

    // --- QUESTION LOADING ---
    getQuestions: async (exam: Exam, token: string): Promise<Question[]> => {
        if (!exam.questionSourceUrl) {
            throw new Error(`The exam "${exam.name}" is not configured with a valid question source. Please contact an administrator.`);
        }

        try {
            const fetchedQuestions: Question[] = await apiFetch('/questions-from-sheet', 'POST', token, {
                sheetUrl: exam.questionSourceUrl,
                count: exam.numberOfQuestions
            });

            if (!fetchedQuestions || fetchedQuestions.length === 0) {
                throw new Error("No valid questions were returned from the source. Please check the Google Sheet configuration and ensure it is public.");
            }
            
            if (fetchedQuestions.length < exam.numberOfQuestions) {
                console.warn(`Warning: Not enough unique questions available for ${exam.name}. Requested ${exam.numberOfQuestions}, but only found ${fetchedQuestions.length}.`);
            }

            const shuffledQuestions = fetchedQuestions.map(question => {
                if (!question.options || question.options.length === 0) {
                    return question;
                }
                const correctAnswerText = question.options[question.correctAnswer - 1];
                
                let optionsToShuffle = [...question.options];
                for (let i = optionsToShuffle.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsToShuffle[i], optionsToShuffle[j]] = [optionsToShuffle[j], optionsToShuffle[i]];
                }

                const newCorrectAnswerIndex = optionsToShuffle.findIndex(option => option === correctAnswerText);

                return {
                    ...question,
                    options: optionsToShuffle,
                    correctAnswer: newCorrectAnswerIndex + 1,
                };
            });

            return shuffledQuestions;

        } catch (error) {
            console.error("Failed to get questions via API proxy:", error);
            throw error;
        }
    },
    
    // --- DUAL-MODE SUBMISSION ---
    submitTest: async (user: User, examId: string, answers: UserAnswer[], questions: Question[], token: string, proctoringViolations: number): Promise<TestResult> => {
        const questionPool = questions;
        const answerMap = new Map(answers.map(a => [a.questionId, a.answer]));
        let correctCount = 0;
        const review: TestResult['review'] = [];

        questionPool.forEach(question => {
            const userAnswerIndex = answerMap.get(question.id);
            const isAnswered = userAnswerIndex !== undefined;
            const isCorrect = isAnswered && (userAnswerIndex === question.correctAnswer -1);
            if (isCorrect) correctCount++;
            review.push({
                questionId: question.id,
                question: question.question,
                options: question.options,
                userAnswer: isAnswered ? userAnswerIndex : -1,
                correctAnswer: question.correctAnswer - 1,
            });
        });

        const totalQuestions = questionPool.length;
        const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        
        const newResult: TestResult = {
            testId: `test-${Date.now()}`,
            userId: user.id,
            examId,
            answers,
            score: parseFloat(score.toFixed(2)),
            correctCount,
            totalQuestions,
            timestamp: Date.now(),
            review,
            proctoringViolations,
        };

        // Save locally first for responsiveness
        try {
            const key = `exam_results_${user.id}`;
            const storedResults = localStorage.getItem(key);
            const results = storedResults ? JSON.parse(storedResults) : {};
            results[newResult.testId] = newResult;
            localStorage.setItem(key, JSON.stringify(results));
        } catch (error) {
            console.error("Failed to save result to localStorage", error);
            toast.error("Could not save your test result locally.");
        }
        
        // Sync with server in the background
        (async () => {
            try {
                await apiFetch('/submit-result', 'POST', token, newResult);
                console.log('Result successfully synced with the server.');
            } catch (error) {
                console.error("Failed to sync result with server:", error);
                toast.error("Syncing result with the server failed. It's saved locally.");
            }
        })();

        return Promise.resolve(newResult);
    },

    // --- FEEDBACK & REVIEW SUBMISSIONS ---
    submitFeedback: async (token: string, category: string, message: string): Promise<void> => {
        try {
            await apiFetch('/submit-feedback', 'POST', token, { category, message });
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            throw error;
        }
    },

    submitReview: async (token: string, examId: string, rating: number, reviewText: string): Promise<void> => {
        try {
            await apiFetch('/submit-review', 'POST', token, { examId, rating, reviewText });
        } catch (error) {
            console.error("Failed to submit review:", error);
            throw error;
        }
    },

    // --- WHEEL OF FORTUNE ---
    spinWheel: async (token: string): Promise<SpinWheelResult> => {
        try {
            return await apiFetch('/spin-wheel', 'POST', token);
        } catch (error) {
            console.error("Failed to spin the wheel:", error);
            throw error;
        }
    },

    // --- ADMIN ACTIONS ---
    addSpins: async (token: string, userId: string, spins: number): Promise<{ success: boolean; newTotal: number; }> => {
        try {
            return await apiFetch('/admin/add-spins', 'POST', token, { userId, spins });
        } catch (error) {
            console.error("Failed to add spins:", error);
            throw error;
        }
    },

    grantPrize: async (token: string, userId: string, prizeId: string): Promise<{ success: boolean; message: string; }> => {
         try {
            return await apiFetch('/admin/grant-prize', 'POST', token, { userId, prizeId });
        } catch (error) {
            console.error("Failed to grant prize:", error);
            throw error;
        }
    },

    searchUser: async (token: string, searchTerm: string): Promise<SearchedUser[]> => {
        try {
            return await apiFetch('/admin/search-users', 'POST', token, { searchTerm });
        } catch (error) {
            console.error("Failed to search for users:", error);
            throw error;
        }
    },

    resetSpins: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        try {
            return await apiFetch('/admin/reset-spins', 'POST', token, { userId });
        } catch (error) {
            console.error("Failed to reset spins:", error);
            throw error;
        }
    },

    removePrize: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
         try {
            return await apiFetch('/admin/remove-prize', 'POST', token, { userId });
        } catch (error) {
            console.error("Failed to remove prize:", error);
            throw error;
        }
    },

    adminUpdateExamProgram: async (token: string, programId: string, updateData: any): Promise<{ organizations: Organization[] }> => {
        try {
            return await apiFetch('/admin/update-exam-program', 'POST', token, { programId, updateData });
        } catch (error) {
            console.error("Failed to update exam program:", error);
            throw error;
        }
    },
    
    adminUpsertProduct: async (token: string, productData: { sku: string; name?: string; price?: number; regularPrice?: number; isBundle?: boolean }): Promise<any> => {
        try {
            return await apiFetch('/admin/upsert-product', 'POST', token, productData);
        } catch (error) {
            console.error("Failed to upsert product:", error);
            throw error;
        }
    },

    adminTestSheetUrl: async (token: string, sheetUrl: string): Promise<any> => {
        try {
            return await apiFetch('/admin/test-sheet-url', 'POST', token, { sheetUrl });
        } catch (error) {
            console.error("Failed to test sheet URL:", error);
            throw error;
        }
    },

    adminClearConfigCache: async (token: string): Promise<any> => {
        try {
            return await apiFetch('/admin/clear-config-cache', 'POST', token);
        } catch (error) {
            console.error("Failed to clear config cache:", error);
            throw error;
        }
    },

    adminClearQuestionCaches: async (token: string): Promise<any> => {
        try {
            return await apiFetch('/admin/clear-question-caches', 'POST', token);
        } catch (error) {
            console.error("Failed to clear question caches:", error);
            throw error;
        }
    },

    // --- EXAM STATS ---
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        try {
            return await apiFetch('/exam-stats', 'GET', token);
        } catch (error) {
            console.error("Failed to get exam stats:", error);
            throw error;
        }
    },
};