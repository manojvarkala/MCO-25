import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData, Organization, PostCreationData, ExamStat, VerificationData, BetaTester } from '../types';
import toast from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";
import { getApiBaseUrl } from './apiConfig';

declare const __DEV__: boolean;
let syncPromise: Promise<TestResult[]> | null = null;

const apiFetch = async (endpoint: string, method: 'GET' | 'POST', token: string | null, data: Record<string, any> = {}, isFormData: boolean = false) => {
    const API_BASE_URL = (getApiBaseUrl() || "").replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = API_BASE_URL.startsWith('http') 
        ? `${API_BASE_URL}/wp-json/mco-app/v1${cleanEndpoint}`
        : `/wp-json/mco-app/v1${cleanEndpoint}`;

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
        method,
        headers,
        mode: 'cors',
        // FIX: Changed from 'same-origin' to 'include' to allow cross-origin credentialed requests.
        // This resolves "Connection Blocked" issues when frontend and backend are on different domains.
        credentials: 'include' 
    };
    
    if (method === 'POST') {
        config.body = isFormData ? (data as unknown as FormData) : JSON.stringify(data);
    }

    try {
        const response = await fetch(fullUrl, config);
        
        if (response.status === 403 || response.status === 401) {
            const text = await response.text();
            if (text.includes('jwt_auth_expired_token') || text.includes('expired')) {
                 localStorage.removeItem('examUser');
                 localStorage.removeItem('authToken');
                 throw new Error("Your session has expired. Please log in again.");
            }
        }

        const responseText = await response.text();

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                console.error("Backend Error Response (Raw):", responseText);
                throw new Error(`Server Error: ${response.status}. Contact administrator.`);
            }
            
            throw new Error(errorData?.message || `Error ${response.status}: ${response.statusText}`);
        }
        
        return responseText ? JSON.parse(responseText) : {};
    } catch (error: any) {
        console.warn(`API FETCH FAILURE [${method} ${endpoint}]:`, error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
             throw new Error("Connection Blocked: Your browser could not establish a secure handshake with the server. Please check your CORS settings in WordPress.");
        }
        throw error;
    }
};

export const googleSheetsService = {
    registerBetaTester: async (registrationData: any): Promise<{ success: boolean; message: string; onboarding_token?: string; user_email?: string; }> => {
        return await apiFetch('/register-tester', 'POST', null, registrationData);
    },
    publicResendOnboardingEmail: async (token: string, email: string): Promise<{ success: boolean; message: string }> => {
        return await apiFetch('/resend-onboarding-email', 'POST', null, { token, email });
    },
    redeemTesterToken: async (testerToken: string): Promise<{ token: string }> => {
        return await apiFetch('/redeem-tester-token', 'POST', null, { testerToken });
    },
    recordSiteHit: async (): Promise<{ count: number }> => {
        return await apiFetch('/hit', 'POST', null);
    },
    verifyCertificate: async (certId: string): Promise<VerificationData> => {
        return await apiFetch(`/verify-certificate/${certId}`, 'GET', null);
    },

    // USER ENDPOINTS
    syncEntitlements: async (token: string): Promise<{ paidExamIds: string[]; isSubscribed: boolean; subscriptionInfo: any; isBetaTester: boolean; }> => {
        return await apiFetch('/sync-auth', 'GET', token);
    },
    createCheckoutSession: async (token: string, sku: string): Promise<{ checkoutUrl: string }> => {
        return await apiFetch('/create-checkout-session', 'POST', token, { sku });
    },
    getAIFeedback: async (prompt: string, token: string): Promise<string> => {
        if (!process.env.API_KEY) return "AI Service not configured.";
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            return response.text || "AI study guide could not be generated.";
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            return "AI feedback service is currently unavailable.";
        }
    },
    generateAIPostContent: async (programName: string, programDescription: string, keywords: string, hashtags: string): Promise<string> => {
        if (!process.env.API_KEY) return "AI Service not configured.";
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Generate a SEO-friendly blog post for: ${programName}. 
                Description: ${programDescription}. 
                Keywords: ${keywords}. Hashtags: ${hashtags}. 
                Format using WordPress block editor syntax.
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            return response.text || "AI blog content could not be generated.";
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            return "AI content generation service is currently unavailable.";
        }
    },
    syncResults: (user: User, token: string): Promise<TestResult[]> => {
        if (syncPromise) return syncPromise;
        syncPromise = (async () => {
            try {
                const remoteResultsData = await apiFetch('/user-results', 'GET', token);
                const remoteResults: TestResult[] = Array.isArray(remoteResultsData) ? remoteResultsData : Object.values(remoteResultsData || {});
                localStorage.setItem(`exam_results_${user.id}`, JSON.stringify(remoteResults));
                return remoteResults;
            } finally { syncPromise = null; }
        })();
        return syncPromise;
    },
    getLocalTestResultsForUser: (userId: string): TestResult[] => {
        try { return JSON.parse(localStorage.getItem(`exam_results_${userId}`) || '[]'); } catch { return []; }
    },
    getTestResult: (user: User, testId: string): TestResult | undefined => {
        return googleSheetsService.getLocalTestResultsForUser(user.id).find(r => r.testId === testId);
    },
    getQuestions: async (exam: Exam, token: string): Promise<Question[]> => {
        return await apiFetch('/questions-from-sheet', 'POST', token, { sheetUrl: exam.questionSourceUrl, count: exam.numberOfQuestions });
    },
    submitTest: async (user: User, examId: string, userAnswers: UserAnswer[], questions: Question[], token: string, proctoringViolations: number): Promise<TestResult> => {
        const correctCount = userAnswers.filter(ua => {
            const q = questions.find(q => q.id === ua.questionId);
            return q && q.correctAnswer === ua.answer + 1;
        }).length;
        
        const totalCount = questions.length;
        const scoreVal = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

        const result: TestResult = {
            testId: `test_${user.id}_${examId}_${Date.now()}`,
            userId: user.id,
            examId,
            answers: userAnswers,
            score: parseFloat(scoreVal.toFixed(2)),
            correctCount,
            totalQuestions: totalCount,
            timestamp: Date.now(),
            review: questions.map(q => ({
                questionId: q.id,
                question: q.question,
                options: q.options,
                userAnswer: userAnswers.find(ua => ua.questionId === q.id)?.answer ?? -1,
                correctAnswer: q.correctAnswer - 1,
            })),
            proctoringViolations
        };
        await apiFetch('/submit-result', 'POST', token, result);
        return result;
    },
    getCertificateData: async (token: string, testId: string): Promise<ApiCertificateData> => {
        return await apiFetch(`/certificate-data/${testId}`, 'GET', token);
    },
    updateUserName: async (token: string, fullName: string): Promise<{ message: string }> => {
        return await apiFetch('/update-name', 'POST', token, { fullName });
    },
    submitFeedback: async (token: string, category: string, message: string, examId?: string, examName?: string): Promise<{ success: boolean }> => {
        return await apiFetch('/submit-feedback', 'POST', token, { category, message, examId, examName });
    },
    submitReview: async (token: string, examId: string, rating: number, reviewText: string): Promise<{ success: boolean }> => {
        return await apiFetch('/submit-review', 'POST', token, { examId, rating, reviewText });
    },
    logEngagement: async (token: string, examId: string): Promise<void> => {
        apiFetch('/log-engagement', 'POST', token, { examId }).catch(() => {});
    },

    // ADMIN ENDPOINTS
    getDebugDetails: async (token: string): Promise<DebugData> => {
        return await apiFetch('/debug-details', 'GET', token);
    },
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        const response = await apiFetch('/exam-stats', 'GET', token);
        return Array.isArray(response) ? response : Object.values(response || {});
    },
    adminGetBetaTesters: async (token: string): Promise<BetaTester[]> => {
        const response = await apiFetch('/admin/beta-testers', 'GET', token);
        return Array.isArray(response) ? response : Object.values(response || {});
    },
    adminResendBetaEmail: async (token: string, userId: string): Promise<{ success: boolean, message: string }> => {
        return await apiFetch('/admin/resend-beta-email', 'POST', token, { userId });
    },
    adminGetSystemStatus: async (token: string): Promise<any> => {
        return await apiFetch('/admin/system-status', 'GET', token);
    },
    adminTestSheetUrl: async (token: string, sheetUrl: string): Promise<any> => {
        return await apiFetch('/admin/test-sheet-url', 'POST', token, { sheetUrl });
    },
    adminClearConfigCache: async (token: string): Promise<{ success: boolean, message: string }> => {
        return await apiFetch('/admin/clear-config-cache', 'POST', token);
    },
    adminClearQuestionCaches: async (token: string): Promise<{ success: boolean, message: string }> => {
        return await apiFetch('/admin/clear-question-caches', 'POST', token);
    },
    adminClearAllResults: async (token: string): Promise<{ success: boolean, message: string }> => {
        return await apiFetch('/admin/clear-all-results', 'POST', token);
    },
    adminUpdateExamProgram: async (token: string, programId: string, updateData: any): Promise<any> => {
        return await apiFetch('/admin/update-exam-program', 'POST', token, { programId, updateData });
    },
    adminCreateExamProgram: async (token: string, programName: string, productLinkData: any): Promise<any> => {
        return await apiFetch('/admin/create-exam-program', 'POST', token, { programName, productLinkData });
    },
    adminUpsertProduct: async (token: string, productData: any): Promise<any> => {
        return await apiFetch('/admin/upsert-product', 'POST', token, productData);
    },
    adminDeletePost: async (token: string, postId: string, postType: string): Promise<any> => {
        return await apiFetch('/admin/delete-post', 'POST', token, { postId, postType });
    },
    adminToggleBetaStatus: async (token: string, status: boolean): Promise<{ token: string }> => {
        return await apiFetch('/admin/toggle-beta-status', 'POST', token, { isBetaTester: status });
    },
    getPostCreationData: async (token: string): Promise<PostCreationData> => {
        return await apiFetch('/admin/post-creation-data', 'GET', token);
    },
    createPostFromApp: async (token: string, postPayload: any): Promise<{ success: boolean, post_id: number, post_url: string }> => {
        return await apiFetch('/admin/create-post-from-app', 'POST', token, postPayload);
    },
    adminUpdateGlobalSettings: async (token: string, settings: any): Promise<any> => {
        return await apiFetch('/admin/update-global-settings', 'POST', token, settings);
    }
};