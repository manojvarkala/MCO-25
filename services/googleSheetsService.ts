import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData, SpinWheelResult, SearchedUser, ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";
import { getApiBaseUrl } from './apiConfig.ts';

const apiFetch = async (action: string, token: string | null, data: Record<string, any> = {}) => {
    const API_BASE_URL = getApiBaseUrl();
    const fullUrl = `${API_BASE_URL}/wp-admin/admin-ajax.php`;

    // Use FormData for compatibility with admin-ajax.php
    const formData = new FormData();
    formData.append('action', `mco_${action}`); // All WP actions are prefixed
    
    if (token) {
        formData.append('token', token);
    }

    // Append other data to the form
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            formData.append(key, data[key]);
        }
    }

    try {
        const response = await fetch(fullUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
    
        if (!response.ok) {
            let finalErrorMessage = `Server error: ${response.status}`;
            const textError = await response.text();
            if (textError.toLowerCase().includes('<!doctype html')) {
                finalErrorMessage = `Unexpected token '<', "${textError.substring(0, 15)}..." is not valid JSON`;
            } else if (response.statusText) {
                finalErrorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(finalErrorMessage);
        }
        
        const jsonResponse = await response.json();

        if (jsonResponse.success === false) {
            throw new Error(jsonResponse.data?.message || jsonResponse.data || 'An unknown API error occurred.');
        }
        
        return jsonResponse.data;

    } catch (networkError: any) {
        if (networkError.message.startsWith('Server error:') || networkError.message.startsWith('Unexpected token')) {
            throw networkError;
        }

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
    apiFetch,
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
            const serverResults: TestResult[] = await apiFetch('user_results', token) || [];

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
            return await apiFetch('certificate_data', token, { testId });
        } catch (error) {
            console.error("Failed to get certificate data from server:", error);
            throw error;
        }
    },
    
    getDebugDetails: async (token: string): Promise<DebugData> => {
        try {
            return await apiFetch('debug_details', token);
        } catch (error) {
            console.error("Failed to get debug details:", error);
            throw error;
        }
    },

    updateUserName: async (token: string, newName: string): Promise<any> => {
        try {
            return await apiFetch('update_name', token, { fullName: newName });
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
            const fetchedQuestions: Question[] = await apiFetch('questions_from_sheet', token, {
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
                // We need to stringify the complex object to send it via FormData
                await apiFetch('submit_result', token, { result: JSON.stringify(newResult) });
                console.log('Result successfully synced with the server.');
            } catch (error) {
                console.error("Failed to sync result with server:", error);
                toast.error("Syncing result with the server failed. It's saved locally.");
            }
        })();

        return Promise.resolve(newResult);
    },

    // --- NEW FEEDBACK & REVIEW SUBMISSIONS ---
    submitFeedback: async (token: string, category: string, message: string): Promise<void> => {
        try {
            await apiFetch('submit_feedback', token, { category, message });
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            throw error;
        }
    },

    submitReview: async (token: string, examId: string, rating: number, reviewText: string): Promise<void> => {
        try {
            await apiFetch('submit_review', token, { examId, rating, reviewText });
        } catch (error) {
            console.error("Failed to submit review:", error);
            throw error;
        }
    },

    // --- NEW WHEEL OF FORTUNE ---
    spinWheel: async (token: string): Promise<SpinWheelResult> => {
        try {
            return await apiFetch('spin_wheel', token, {});
        } catch (error) {
            console.error("Failed to spin wheel:", error);
            throw error;
        }
    },

    // --- NEW ADMIN ACTIONS ---
    addSpins: async (token: string, userId: string, spins: number): Promise<{ success: boolean; newTotal: number; }> => {
        try {
            return await apiFetch('admin_add_spins', token, { userId, spins });
        } catch (error) {
            console.error("Failed to add spins:", error);
            throw error;
        }
    },

    grantPrize: async (token: string, userId: string, prizeId: string): Promise<{ success: boolean; message: string; }> => {
        try {
            return await apiFetch('admin_grant_prize', token, { userId, prizeId });
        } catch (error) {
            console.error("Failed to grant prize:", error);
            throw error;
        }
    },

    searchUser: async (token: string, searchTerm: string): Promise<SearchedUser[]> => {
        try {
            return await apiFetch('admin_search_user', token, { searchTerm });
        } catch (error) {
            console.error("Failed to search user:", error);
            throw error;
        }
    },

    resetSpins: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        try {
            return await apiFetch('admin_reset_spins', token, { userId });
        } catch (error) {
            console.error("Failed to reset spins:", error);
            throw error;
        }
    },

    removePrize: async (token: string, userId: string): Promise<{ success: boolean; message: string; }> => {
        try {
            return await apiFetch('admin_remove_prize', token, { userId });
        } catch (error) {
            console.error("Failed to remove prize:", error);
            throw error;
        }
    },
    
    // --- NEW EXAM STATS ---
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        try {
            return await apiFetch('exam_stats', token);
        } catch (error) {
            console.error("Failed to get exam stats:", error);
            throw error;
        }
    },
};