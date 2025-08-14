import type { Question, TestResult, CertificateData, Organization, UserAnswer, User, Exam } from '@/types.ts';
import toast from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";

// This is safe to be exposed in the browser. The Vite config handles it.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- API Client for WordPress Backend ---
const WP_API_BASE = 'https://www.coding-online.net/wp-json/mco-app/v1';

const apiFetch = async (endpoint: string, token: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
       headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${WP_API_BASE}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
        let errorMessage = `API Error: Status ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            errorMessage = `Server returned a non-JSON error (status ${response.status}). Check server logs.`;
        }
        
        if (response.status === 403) {
            errorMessage += " This is often caused by an invalid or expired token, or a misconfigured JWT Secret Key in your WordPress settings.";
        }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204) return null; // Handle No Content responses
    return response.json();
};

export const googleSheetsService = {
    // --- CONFIGURATION (FETCHED FROM WP) ---
    getAppConfig: async (): Promise<Organization[]> => {
        // This is a public endpoint, no token needed.
        const response = await fetch(`${WP_API_BASE}/app-config`);
        if (!response.ok) {
            throw new Error("Failed to fetch application configuration from the server.");
        }
        return response.json();
    },

    // --- AI FEEDBACK ---
    getAIFeedback: async (prompt: string): Promise<string> => {
        try {
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

    // --- DATA SYNC & LOCAL STORAGE ---
    syncResults: async (token: string, user: User): Promise<void> => {
        try {
            const remoteResults: TestResult[] = await apiFetch('/user-results', token);
            const resultsMap = remoteResults.reduce((acc, result) => {
                acc[result.testId] = result;
                return acc;
            }, {} as { [key: string]: TestResult });

            localStorage.setItem(`exam_results_${user.id}`, JSON.stringify(resultsMap));
        } catch (error: any) {
            console.error("Failed to sync remote results:", error);
            const errorMessage = error.message || "Could not connect to the server. Please check your network connection.";
            toast.error(errorMessage);
        }
    },

    getTestResultsForUser: async (user: User): Promise<TestResult[]> => {
        try {
            const storedResults = localStorage.getItem(`exam_results_${user.id}`);
            const results = storedResults ? JSON.parse(storedResults) : {};
            return Promise.resolve(Object.values(results));
        } catch (error) {
            console.error("Failed to parse results from localStorage", error);
            return Promise.resolve([]);
        }
    },

    getTestResult: async (user: User, testId: string): Promise<TestResult | undefined> => {
        const results = await googleSheetsService.getTestResultsForUser(user);
        return results.find(r => r.testId === testId);
    },

    // --- DIRECT API CALLS (NOT CACHED LOCALLY) ---
    getCertificateData: async (token: string, testId: string): Promise<CertificateData | null> => {
        return apiFetch(`/certificate-data/${testId}`, token);
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