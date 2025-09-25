import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData, SpinWheelResult, SearchedUser, ExamStat } from '../types.ts';
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
    
    let urlToFetch = fullUrl;

    if (method === 'POST') {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(urlToFetch, config);
        // The backend now returns a consistent JSON object for both success and error
        const jsonResponse = await response.json();

        if (!response.ok) {
            // Use the 'message' field from the structured JSON error response
            const errorMessage = jsonResponse?.message || response.statusText || `Server error: ${response.status}`;
            throw new Error(errorMessage);
        }
        
        return jsonResponse;

    } catch (networkError: any) {
        console.error(`API Fetch Network Error to ${endpoint}:`, networkError);
        let errorMessage = `Could not connect to the API server (${API_BASE_URL}).`;
        if (networkError instanceof TypeError && networkError.message.includes('fetch')) {
            errorMessage += ' This might be a network issue or a CORS configuration problem on the server.';
        } else if (networkError instanceof SyntaxError) {
             errorMessage = `The server returned an invalid response. This may be a temporary issue on the server.`;
        } else {
             errorMessage += ` Details: ${networkError.message}.`;
        }
        throw new Error(errorMessage);
    }
};

export const googleSheetsService = {
    // --- AI FEEDBACK ---
    getAIFeedback: async (prompt: string): Promise<string> => {
        if (!process.env.API_KEY) {
            console.error("Gemini API key is not configured.");
            throw new Error("The AI feedback feature is not configured. Please contact support.");
        }
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text;
        } catch (error) {
            console.error("Error getting AI feedback:", error);
            throw new Error("Failed to generate AI feedback. Please try again later.");
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
    submitTest: async (user: User, examId: string, answers: UserAnswer[], questions: Question[], token: string): Promise<TestResult> => {
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

    // --- NEW FEEDBACK & REVIEW SUBMISSIONS (DISABLED) ---
    submitFeedback: async (token: string, category: string, message: string): Promise<void> => {
        return Promise.reject(new Error("Feedback feature is not available. The backend endpoint is not implemented."));
    },

    submitReview: async (token: string, examId: string, rating: number, reviewText: string): Promise<void> => {
        return Promise.reject(new Error("Review feature is not available. The backend endpoint is not implemented."));
    },

    // --- NEW WHEEL OF FORTUNE (DISABLED) ---
    spinWheel: async (token: string): Promise<SpinWheelResult> => {
        return Promise.reject(new Error("Spin & Win feature is not available. The backend endpoint is not implemented."));
    },

    // --- NEW ADMIN ACTIONS (DISABLED) ---
    addSpins: async (token: string, userId: string, spins: number): Promise<{ success: boolean; newTotal: number; }> => {
        return Promise.reject(new Error("Admin feature is not available. The backend endpoint is not implemented."));
    },

    grantPrize: async (token: string, userId: string, prizeId: string): Promise<{ success: boolean; message: string; }> => {
        return Promise.reject(new Error("Admin feature is not available. The backend endpoint is not implemented."));
    },

    searchUser: async (token: string, searchTerm: string): Promise<SearchedUser[]> => {
        return Promise.reject(new Error("Admin feature is not available. The backend endpoint is not implemented."));
    },

    resetSpins: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        return Promise.reject(new Error("Admin feature is not available. The backend endpoint is not implemented."));
    },

    removePrize: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
         return Promise.reject(new Error("Admin feature is not available. The backend endpoint is not implemented."));
    },
    
    // --- NEW EXAM STATS ---
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        try {
            return await apiFetch('/exam-stats', 'GET', token);
        } catch (error) {
            console.error("Failed to get exam stats:", error);
            throw error;
        }
    },
};