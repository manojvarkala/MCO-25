import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData, SpinWheelResult, SearchedUser, ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";
import { getApiEndpoint } from './apiConfig.ts';

const apiFetch = async (endpoint: string, token: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
       headers['Authorization'] = `Bearer ${token}`;
    }

    const API_BASE_URL = getApiEndpoint();
    const isProxied = API_BASE_URL.startsWith('/');
    
    // FIX: Ensure a single slash between the base URL and the endpoint to prevent routing errors.
    const fullUrl = `${API_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
    
    const urlWithCacheBuster = new URL(fullUrl, isProxied ? window.location.origin : undefined);
    urlWithCacheBuster.searchParams.append('mco_cb', Date.now().toString());

    try {
        const fetchOptions: RequestInit = {
            ...options,
            headers,
            credentials: 'include'
        };
        const response = await fetch(urlWithCacheBuster.toString(), fetchOptions);
    
        if (!response.ok) {
            let finalErrorMessage = `Server error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    finalErrorMessage = errorData.message;
                }
            } catch (e) {
                console.error("API response was not valid JSON for an error.", e);
            }
            if (response.status === 403) {
                finalErrorMessage += ' (This often means your login session is invalid or has expired. Please try logging out and back in.)';
            }
            if (response.status === 500) {
                finalErrorMessage += ' (A server error occurred. Check the WordPress debug logs if you are an admin.)';
            }
            throw new Error(finalErrorMessage);
        }
        
        if (response.status === 204) return null;
        return response.json();

    } catch (networkError: any) {
        // If it's a custom error thrown from the !response.ok block, re-throw it.
        if (networkError.message.startsWith('Server error:')) {
            throw networkError;
        }

        // Otherwise, handle network/CORS errors
        console.error("API Fetch Network Error:", networkError);
        let errorMessage = `Could not connect to the API server (${API_BASE_URL}).`;
        if (networkError instanceof TypeError && networkError.message.includes('fetch')) {
            errorMessage += ' This might be a network issue or a CORS configuration problem on the server. Please check your connection and contact an administrator.';
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
        try {
            // The API returns an array of TestResult objects
            const serverResults: TestResult[] = await apiFetch('/user-results', token) || [];

            // The API returns an array, but we store it as an object keyed by testId
            const resultsObject: { [testId: string]: TestResult } = {};
            serverResults.forEach(result => {
                resultsObject[result.testId] = result;
            });

            // Get local results
            const key = `exam_results_${user.id}`;
            const storedResults = localStorage.getItem(key);
            const localResults = storedResults ? JSON.parse(storedResults) : {};

            // Merge, giving precedence to server data
            const mergedResults = { ...localResults, ...resultsObject };
            
            localStorage.setItem(key, JSON.stringify(mergedResults));
            console.log('Results successfully synced with the server.');
        } catch (error) {
            console.error("Failed to sync results with server:", error);
            // Re-throw the error so UI components can handle it (e.g., show a toast)
            throw error;
        }
    },

    getLocalTestResultsForUser: (userId: string): TestResult[] => {
        try {
            const storedResults = localStorage.getItem(`exam_results_${userId}`);
            if (storedResults) {
                const resultsData = JSON.parse(storedResults);
                // Ensure we have an object before calling Object.values
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
    getCertificateData: async (token: string, testId: string, user: User): Promise<ApiCertificateData | null> => {
        console.log("Generating certificate data from local results for offline functionality.");
        try {
            const result = googleSheetsService.getTestResult(user, testId);
            if (result) {
                return {
                    certificateNumber: `MCO-${result.timestamp}`, // Generate a unique-ish number
                    candidateName: user.name,
                    finalScore: result.score,
                    date: new Date(result.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    examId: result.examId,
                };
            }
            return null;
        } catch (error) {
            console.error("Failed to generate certificate data from local storage", error);
            return null;
        }
    },
    
    getDebugDetails: async (token: string): Promise<DebugData> => {
        try {
            const data = await apiFetch('/debug-details', token);
            return data as DebugData;
        } catch (error) {
            console.error("Failed to get debug details:", error);
            throw error;
        }
    },

    updateUserName: async (token: string, newName: string): Promise<any> => {
        try {
            return await apiFetch('/update-name', token, {
                method: 'POST',
                body: JSON.stringify({ fullName: newName }),
            });
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
            // Use the authenticated API proxy endpoint to fetch questions securely
            const fetchedQuestions: Question[] = await apiFetch('/questions-from-sheet', token, {
                method: 'POST',
                body: JSON.stringify({
                    sheetUrl: exam.questionSourceUrl,
                    count: exam.numberOfQuestions
                })
            });

            if (!fetchedQuestions || fetchedQuestions.length === 0) {
                throw new Error("No valid questions were returned from the source. Please check the Google Sheet configuration and ensure it is public.");
            }
            
            if (fetchedQuestions.length < exam.numberOfQuestions) {
                console.warn(`Warning: Not enough unique questions available for ${exam.name}. Requested ${exam.numberOfQuestions}, but only found ${fetchedQuestions.length}.`);
            }

            // Shuffle options for each question to randomize them for each attempt.
            const shuffledQuestions = fetchedQuestions.map(question => {
                if (!question.options || question.options.length === 0) {
                    return question;
                }
                // The correct answer from the sheet is 1-based index. Let's get the text.
                const correctAnswerText = question.options[question.correctAnswer - 1];
                
                // Shuffle the options array
                let optionsToShuffle = [...question.options];
                for (let i = optionsToShuffle.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsToShuffle[i], optionsToShuffle[j]] = [optionsToShuffle[j], optionsToShuffle[i]];
                }

                // Find the new index of the correct answer text
                const newCorrectAnswerIndex = optionsToShuffle.findIndex(option => option === correctAnswerText);

                return {
                    ...question,
                    options: optionsToShuffle,
                    // Return the new 1-based index
                    correctAnswer: newCorrectAnswerIndex + 1,
                };
            });

            return shuffledQuestions;

        } catch (error) {
            console.error("Failed to get questions via API proxy:", error);
            throw error; // Re-throw the error from apiFetch or our custom error
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
        
        (async () => {
            try {
                await apiFetch('/submit-result', token, {
                    method: 'POST',
                    body: JSON.stringify(newResult)
                });
                console.log('Result successfully synced with the server.');
            } catch (error) {
                console.error("Failed to sync result with server:", error);
                toast.error("Syncing result with the server failed. It's saved locally.");
            }
        })();

        return Promise.resolve(newResult);
    },

    // --- NEW FEEDBACK & REVIEW SUBMISSIONS (SIMULATED) ---
    submitFeedback: async (token: string, category: string, message: string): Promise<void> => {
        try {
            await apiFetch('/submit-feedback', token, {
                method: 'POST',
                body: JSON.stringify({ category, message }),
            });
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            throw error;
        }
    },

    submitReview: async (token: string, examId: string, rating: number, reviewText: string): Promise<void> => {
        try {
            await apiFetch('/submit-review', token, {
                method: 'POST',
                body: JSON.stringify({ examId, rating, reviewText }),
            });
        } catch (error) {
            console.error("Failed to submit review:", error);
            throw error;
        }
    },

    // --- NEW WHEEL OF FORTUNE ---
    spinWheel: async (token: string): Promise<SpinWheelResult> => {
        try {
            return await apiFetch('/spin-wheel', token, {
                method: 'POST',
            });
        } catch (error) {
            console.error("Failed to spin wheel:", error);
            throw error;
        }
    },

    // --- NEW ADMIN ACTIONS ---
    addSpins: async (token: string, userId: string, spins: number): Promise<{ success: boolean; newTotal: number; }> => {
        try {
            return await apiFetch('/admin/add-spins', token, {
                method: 'POST',
                body: JSON.stringify({ userId, spins }),
            });
        } catch (error) {
            console.error("Failed to add spins:", error);
            throw error;
        }
    },

    grantPrize: async (token: string, userId: string, prizeId: string): Promise<{ success: boolean; message: string; }> => {
        try {
            return await apiFetch('/admin/grant-prize', token, {
                method: 'POST',
                body: JSON.stringify({ userId, prizeId }),
            });
        } catch (error) {
            console.error("Failed to grant prize:", error);
            throw error;
        }
    },

    searchUser: async (token: string, searchTerm: string): Promise<SearchedUser[]> => {
        try {
            return await apiFetch('/admin/search-user', token, {
                method: 'POST',
                body: JSON.stringify({ searchTerm }),
            });
        } catch (error) {
            console.error("Failed to search user:", error);
            throw error;
        }
    },

    resetSpins: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        try {
            return await apiFetch('/admin/reset-spins', token, {
                method: 'POST',
                body: JSON.stringify({ userId }),
            });
        } catch (error) {
            console.error("Failed to reset spins:", error);
            throw error;
        }
    },

    removePrize: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        try {
            return await apiFetch('/admin/remove-prize', token, {
                method: 'POST',
                body: JSON.stringify({ userId }),
            });
        } catch (error) {
            console.error("Failed to remove prize:", error);
            throw error;
        }
    },
    
    // --- NEW EXAM STATS ---
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        try {
            return await apiFetch('/exam-stats', token);
        } catch (error) {
            console.error("Failed to get exam stats:", error);
            throw error;
        }
    },
};
