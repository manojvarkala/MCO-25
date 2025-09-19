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
        const response = await fetch(urlWithCacheBuster.toString(), { ...options, headers });
    
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
            const remoteData = await apiFetch('/user-results', token);

            // Defensive check: Ensure the API returned a valid array.
            if (!Array.isArray(remoteData)) {
                console.warn("Sync received non-array data for results, treating as empty.", remoteData);
                // Set empty results in localStorage to clear any stale data.
                localStorage.setItem(`exam_results_${user.id}`, JSON.stringify({}));
                console.log("Results synced with server (empty or invalid data received).");
                return; // Exit gracefully without showing an error toast.
            }

            const remoteResults: TestResult[] = remoteData;
            const resultsMap = remoteResults.reduce((acc, result) => {
                // Defensive check: Ensure each result has a testId before adding it to the map.
                if (result && result.testId) {
                    acc[result.testId] = result;
                } else {
                    console.warn("Skipping invalid result object during sync:", result);
                }
                return acc;
            }, {} as { [key: string]: TestResult });

            localStorage.setItem(`exam_results_${user.id}`, JSON.stringify(resultsMap));
            console.log("Results successfully synced with server.");
        } catch (error) {
            console.error("Background sync failed:", error);
            toast.error("Server sync failed. Displaying cached results.");
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
    getCertificateData: async (token: string, testId: string): Promise<ApiCertificateData | null> => {
        console.warn("getCertificateData is mocked and will not fetch from a server.");
        return Promise.resolve(null);
    },
    
    getDebugDetails: async (token: string): Promise<DebugData> => {
        console.warn("getDebugDetails is mocked and will not fetch from a server.");
        const mockError = {
            success: false,
            message: "Debug details are unavailable in offline mode.",
            data: null
        };
        return Promise.resolve({
            user: { id: 'offline', name: 'Offline User', email: 'offline@example.com' },
            purchases: [],
            results: [],
            sheetTest: mockError,
        });
    },

    updateUserName: async (token: string, newName: string): Promise<any> => {
        console.log("Mocking user name update to:", newName);
        return Promise.resolve({ success: true, newName });
    },

    // --- QUESTION LOADING ---
    getQuestions: async (exam: Exam, token: string): Promise<Question[]> => {
        if (!exam.questionSourceUrl) {
            throw new Error(`The exam "${exam.name}" is not configured with a valid question source. Please contact an administrator.`);
        }
        
        let sheetId = '';
        const match = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(exam.questionSourceUrl);
        if (match && match[1]) {
            sheetId = match[1];
        }

        if (!sheetId) {
            throw new Error('Could not extract Google Sheet ID from the provided URL.');
        }
        
        const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        const response = await fetch(csvExportUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch questions from Google Sheets. Status: ${response.status}`);
        }
        const csvText = await response.text();
        
        const lines = csvText.split(/\r\n|\n/).slice(1); // Split and remove header
        const allQuestions: Question[] = [];
        for (const line of lines) {
            if (!line.trim()) continue;
            const data = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
            if (data.length >= 7 && !isNaN(parseInt(data[0], 10)) && data[1] && data[1].trim() !== '') {
                 allQuestions.push({
                    id: parseInt(data[0], 10),
                    question: data[1],
                    options: [data[2], data[3], data[4], data[5]],
                    correctAnswer: parseInt(data[6], 10),
                });
            }
        }

        for (let i = allQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }
        const fetchedQuestions = allQuestions.slice(0, exam.numberOfQuestions);

        if (fetchedQuestions.length === 0) {
            throw new Error("No valid questions were returned from the source.");
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
        console.log("Mocking feedback submission:", { category, message });
        await new Promise(resolve => setTimeout(resolve, 750));
        return Promise.resolve();
    },

    submitReview: async (token: string, examId: string, rating: number, reviewText: string): Promise<void> => {
        console.log("Mocking review submission:", { examId, rating, reviewText });
        await new Promise(resolve => setTimeout(resolve, 750));
        return Promise.resolve();
    },

    // --- NEW WHEEL OF FORTUNE ---
    spinWheel: async (token: string): Promise<SpinWheelResult> => {
        throw new Error("The Spin & Win feature is unavailable in offline mode.");
    },

    // --- NEW ADMIN ACTIONS ---
    addSpins: async (token: string, userId: string, spins: number): Promise<{ success: boolean; newTotal: number; }> => {
         throw new Error("Admin actions are unavailable in offline mode.");
    },

    grantPrize: async (token: string, userId: string, prizeId: string): Promise<{ success: boolean; message: string; }> => {
        throw new Error("Admin actions are unavailable in offline mode.");
    },

    searchUser: async (token: string, searchTerm: string): Promise<SearchedUser[]> => {
        throw new Error("Admin actions are unavailable in offline mode.");
    },

    resetSpins: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        throw new Error("Admin actions are unavailable in offline mode.");
    },

    removePrize: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        throw new Error("Admin actions are unavailable in offline mode.");
    },
    
    // --- NEW EXAM STATS ---
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        throw new Error("Exam statistics are unavailable in offline mode.");
    },
};
