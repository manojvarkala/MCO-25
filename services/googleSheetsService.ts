import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData } from '../types.ts';
import toast from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";

// --- API Client for WordPress Backend ---
const WP_API_BASE = '/api'; // Use the proxy for all API calls

const apiFetch = async (endpoint: string, token: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
       headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${WP_API_BASE}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
        let finalErrorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            // WP_Error objects have 'code' and 'message' properties.
            if (errorData && errorData.message) {
                finalErrorMessage = errorData.message;
            }
        } catch (e) {
            // The response was not JSON, stick with the original HTTP error.
            console.error("API response was not valid JSON.", e);
        }
        // Add specific advice for common, critical errors
        if (response.status === 403) {
            finalErrorMessage += ' (This often means your login session is invalid or has expired. Please try logging out and back in.)';
        }
        if (response.status === 500) {
            finalErrorMessage += ' (A server error occurred. Check the WordPress debug logs if you are an admin.)';
        }
        throw new Error(finalErrorMessage);
    }
    
    if (response.status === 204) return null; // Handle No Content responses
    return response.json();
};

export const googleSheetsService = {
    // --- AI FEEDBACK ---
    getAIFeedback: async (prompt: string): Promise<string> => {
        if (!process.env.API_KEY) {
            console.error("Gemini API key is not configured.");
            throw new Error("The AI feedback feature is not configured. Please contact support.");
        }
        try {
            // Initialize the AI client only when the function is called
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
            const remoteResults: TestResult[] = await apiFetch('/user-results', token);
            const resultsMap = remoteResults.reduce((acc, result) => {
                acc[result.testId] = result;
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
                return Object.values(JSON.parse(storedResults));
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
        return apiFetch(`/certificate-data/${testId}`, token);
    },
    
    getDebugDetails: async (token: string): Promise<DebugData> => {
        return apiFetch('/debug-details', token);
    },

    updateUserName: async (token: string, newName: string): Promise<any> => {
        return apiFetch('/update-name', token, {
            method: 'POST',
            body: JSON.stringify({ fullName: newName })
        });
    },

    // --- QUESTION LOADING (VIA WP PROXY) ---
    getQuestions: async (exam: Exam, token: string): Promise<Question[]> => {
        const fetchedQuestions: Question[] = await apiFetch('/questions-from-sheet', token, {
            method: 'POST',
            body: JSON.stringify({
                sheetUrl: exam.questionSourceUrl,
                count: exam.numberOfQuestions
            })
        });

        if (fetchedQuestions.length === 0) {
            throw new Error("No valid questions were returned from the source.");
        }

        if (fetchedQuestions.length < exam.numberOfQuestions) {
            console.warn(`Warning: Not enough unique questions available for ${exam.name}. Requested ${exam.numberOfQuestions}, but only found ${fetchedQuestions.length}.`);
        }
            return fetchedQuestions;
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

        // Step 1: Save locally immediately for a fast UI response.
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
        
        // Step 2: Asynchronously send the result to the WordPress backend.
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

        // Return the result immediately.
        return Promise.resolve(newResult);
    }
};