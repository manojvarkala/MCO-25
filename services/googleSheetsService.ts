

import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData, Organization, PostCreationData, ExamStat, VerificationData, BetaTester } from '../types';
import toast from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";
import { getApiBaseUrl } from './apiConfig';

declare const __DEV__: boolean;
let syncPromise: Promise<TestResult[]> | null = null;

const apiFetch = async (endpoint: string, method: 'GET' | 'POST', token: string | null, data: Record<string, any> = {}, isFormData: boolean = false) => {
    const API_BASE_URL = getApiBaseUrl().replace(/\/$/, "");
    const fullUrl = `${API_BASE_URL}/wp-json/mco-app/v1${endpoint}`;

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
        mode: 'cors'
    };
    
    if (method === 'POST') {
        config.body = isFormData ? (data as unknown as FormData) : JSON.stringify(data);
    }

    try {
        console.log(`MCO API: Requesting ${method} ${fullUrl}`);
        const response = await fetch(fullUrl, config);
        const responseText = await response.text();

        if (!response.ok) {
            console.error(`MCO API: Server returned ${response.status}`, responseText);
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Server Error: ${response.status}. The backend might be experiencing issues.`);
            }

            if (errorData?.code === 'jwt_auth_expired_token' || errorData?.code === 'jwt_auth_invalid_token') {
                localStorage.removeItem('examUser');
                localStorage.removeItem('authToken');
                const authError: any = new Error("Session expired. Please log in again.");
                authError.code = errorData?.code;
                throw authError;
            }
            
            throw new Error(errorData?.message || `Error ${response.status}: ${response.statusText}`);
        }
        
        return responseText ? JSON.parse(responseText) : {};
    } catch (error: any) {
        console.error("MCO API Connection Error:", error);
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
             throw new Error("Connection Blocked: The browser could not reach the API. This is usually caused by: 1. Permalinks not set to 'Post Name' in WP. 2. Missing .htaccess rules. 3. CORS blocking the request.");
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
    createCheckoutSession: async (token: string, sku: string): Promise<{ checkoutUrl: string }> => {
        return await apiFetch('/create-checkout-session', 'POST', token, { sku });
    },
    recordSiteHit: async (): Promise<{ count: number }> => {
        return await apiFetch('/hit', 'POST', null);
    },
    notifyAdmin: async (token: string, subject: string, message: string, context: object): Promise<void> => {
        try {
            await apiFetch('/notify-admin', 'POST', token, { subject, message, context });
        } catch (e) {}
    },
    getAIFeedback: async (prompt: string, token: string): Promise<string> => {
        if (!process.env.API_KEY) return "AI Service not configured.";
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            return response.text as string;
        } catch (error: any) {
            return "AI feedback service is currently unavailable.";
        }
    },
    generateAIPostContent: async (programTitle: string, programDescription: string, keywords: string, hashtags: string): Promise<string> => {
        if (!process.env.API_KEY) throw new Error("AI key missing.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write an SEO blog post about preparing for the ${programTitle} certification. Description: ${programDescription}. Keywords: ${keywords}.`,
        });
        return response.text as string;
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
        const correctCount = userAnswers.filter(ua => questions.find(q => q.id === ua.questionId)?.correctAnswer === ua.answer + 1).length;
        const result: TestResult = {
            testId: `test_${user.id}_${examId}_${Date.now()}`,
            userId: user.id,
            examId,
            answers: userAnswers,
            score: (correctCount / questions.length) * 100,
            correctCount,
            totalQuestions: questions.length,
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
    getCertificateData: async (token: string, testId: string, isAdminView: boolean = false): Promise<ApiCertificateData> => {
        return await apiFetch(`/certificate-data/${testId}${isAdminView ? '?admin_view=true' : ''}`, 'GET', token);
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
    verifyCertificate: async (certId: string): Promise<VerificationData> => {
        return await apiFetch(`/verify-certificate/${certId}`, 'GET', null);
    },
    logEngagement: async (token: string, examId: string): Promise<void> => {
        apiFetch('/log-engagement', 'POST', token, { examId }).catch(() => {});
    },
    getDebugDetails: async (token: string): Promise<DebugData> => {
        return await apiFetch('/debug-details', 'GET', token);
    },
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        return await apiFetch('/exam-stats', 'GET', token);
    },
    adminGetBetaTesters: async (token: string): Promise<BetaTester[]> => {
        return await apiFetch('/admin/beta-testers', 'GET', token);
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
    getPostCreationData: async (token: string): Promise<PostCreationData> => {
        return await apiFetch('/admin/post-creation-data', 'GET', token);
    },
    createPostFromApp: async (token: string, postPayload: any): Promise<{ success: boolean, post_id: number, post_url: string }> => {
        return await apiFetch('/admin/create-post-from-app', 'POST', token, postPayload);
    },
    adminToggleBetaStatus: async (token: string, status: boolean): Promise<{ token: string }> => {
        return await apiFetch('/admin/toggle-beta-status', 'POST', token, { isBetaTester: status });
    },
};