import type { Question, TestResult, CertificateData, UserAnswer, User, Exam, ApiCertificateData, DebugData, Organization, PostCreationData, ExamStat, VerificationData } from '../types.ts';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";
import { getApiBaseUrl } from './apiConfig.ts';

// FIX: Declare a global constant for development mode, defined in vite.config.ts.
declare const __DEV__: boolean;

// A module-level promise to prevent concurrent sync operations and handle race conditions.
let syncPromise: Promise<TestResult[]> | null = null;

const apiFetch = async (endpoint: string, method: 'GET' | 'POST', token: string | null, data: Record<string, any> = {}, isFormData: boolean = false) => {
    const API_BASE_URL = getApiBaseUrl();
    const fullUrl = `${API_BASE_URL}/wp-json/mco-app/v1${endpoint}`;

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
        method,
        headers,
    };
    
    if (method === 'POST') {
        config.body = isFormData ? (data as unknown as FormData) : JSON.stringify(data);
    }

    try {
        const response = await fetch(fullUrl, config);
        const responseText = await response.text();

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                throw new Error(responseText || response.statusText || `Server error: ${response.status}`);
            }

            const authErrorCodes = ['jwt_auth_invalid_token', 'jwt_auth_expired_token', 'rest_forbidden', 'jwt_auth_invalid_secret_key'];
            if (errorData?.code && authErrorCodes.includes(errorData.code)) {
                localStorage.removeItem('examUser');
                localStorage.removeItem('paidExamIds');
                localStorage.removeItem('authToken');
                localStorage.removeItem('isSubscribed');
                localStorage.removeItem('activeOrg');
                
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('exam_timer_') || key.startsWith('exam_results_') || key.startsWith('exam_progress_')) {
                        localStorage.removeItem(key);
                    }
                });
                
                toast.error("Your session has expired or is invalid. Please log in again.", { id: 'auth-error-toast' });
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);

                throw new Error("Authentication failed. Redirecting to login.");
            }
            
            if (errorData?.code === 'jwt_auth_missing_token') {
                throw new Error("Authorization header missing. This is a server configuration issue. Please check the Admin Debug Sidebar for the solution.");
            }
            const errorMessage = errorData?.message || response.statusText || `Server error: ${response.status}`;
            throw new Error(errorMessage);
        }
        
        try {
            return responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            console.error(`API Call to ${endpoint} returned OK but with invalid JSON:`, responseText);
            throw new Error('The server returned an invalid response. This is often caused by a PHP error from your theme or another plugin. Check your browser\'s developer console for the full server output.');
        }
    } catch (error: any) {
        console.error(`API Fetch Error to ${endpoint}:`, error);

        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            throw new Error(`Could not connect to the API server at ${API_BASE_URL}. Please check your internet connection.`);
        }
        
        throw error;
    }
};
export const googleSheetsService = {
    // --- CHECKOUT SESSION ---
    createCheckoutSession: async (token: string, sku: string): Promise<{ checkoutUrl: string }> => {
        try {
            return await apiFetch('/create-checkout-session', 'POST', token, { sku });
        } catch (error) {
            console.error("Failed to create checkout session:", error);
            throw error;
        }
    },
    
    // --- SITE HIT COUNTER ---
    recordSiteHit: async (): Promise<{ count: number }> => {
        try {
            // Public endpoint, so token is null.
            return await apiFetch('/hit', 'POST', null);
        } catch (error) {
            console.error("Failed to record site hit:", error);
            throw error;
        }
    },

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

    // --- AI CALLS (FRONTEND) ---
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

    generateAIPostContent: async (programTitle: string, programDescription: string, keywords: string, hashtags: string): Promise<string> => {
        if (!process.env.API_KEY) {
            throw new Error("Gemini API key is not configured in the application's environment.");
        }
        
        const system_instruction = "You are an expert SEO content writer specializing in educational and certification-based websites. Your task is to generate an engaging, well-structured, and SEO-friendly blog post. The output must be formatted using WordPress block editor syntax (Gutenberg blocks like `<!-- wp:paragraph -->` and `<!-- wp:heading -->`). The content should be informative and persuasive, encouraging readers to explore the certification program.";
        
        const user_prompt = `
            Generate a blog post based on the following details:

            Program Title: "${programTitle}"
            Program Description: "${programDescription}"

            The blog post should include these sections, formatted with \`<!-- wp:heading -->\`:
            1. An engaging introduction that captures the reader's interest.
            2. "Why This Certification Matters" - explaining the value and importance of this certification in the industry.
            3. "What You'll Learn" - expanding on the provided description to detail the key knowledge areas and skills covered.
            4. "Career Opportunities" - outlining potential job roles and career advancement for certified professionals.
            5. A strong concluding paragraph that summarizes the benefits and encourages the reader to take the next step.
            
            SEO GUIDELINES:
            - **Keywords:** Naturally weave the following keywords into the article content: ${keywords || 'Please generate 3-5 relevant keywords yourself'}.
            - **Hashtags:** At the end of the post, add a paragraph block with a list of relevant hashtags. Include these hashtags: ${hashtags ? '#' + hashtags.replace(/, /g, ', #').replace(/,/g, ' #') : 'Please generate 5-7 relevant hashtags yourself'}.

            Ensure all text is wrapped in \`<!-- wp:paragraph --><p>...</p><!-- /wp:paragraph -->\` blocks. Do not include a main title for the post itself.
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: user_prompt,
                config: {
                    systemInstruction: system_instruction,
                },
            });
            return response.text;
        } catch (error: any) {
            console.error("Error generating AI post content from Gemini:", error);
            throw new Error(error.message || 'An unknown error occurred while generating content.');
        }
    },
    
    // --- RESULTS HANDLING (CACHE-FIRST APPROACH) ---
    syncResults: (user: User, token: string): Promise<TestResult[]> => {
        // If a sync is already in progress, return the existing promise to the caller.
        // This prevents a race condition where a component mounts and requests data
        // while a sync from a previous component (e.g., login) is still running.
        if (syncPromise) {
            return syncPromise;
        }

        // Create a new promise for this sync operation.
        syncPromise = (async () => {
            const localResultsKey = `exam_results_${user.id}`;
            let localResults: TestResult[] = [];
            try {
                const stored = localStorage.getItem(localResultsKey);
                if (stored) localResults = JSON.parse(stored);
            } catch (e) {
                console.error("Could not parse local results, starting fresh.", e);
                localResults = [];
            }

            try {
                // Fetch remote results from the WordPress backend.
                // REVERT: Changed method back to GET as requested by the user.
                const remoteResults: TestResult[] = await apiFetch('/user-results', 'GET', token);

                // Merge local and remote results, giving precedence to remote data.
                const mergedResultsMap = new Map<string, TestResult>();
                localResults.forEach(r => mergedResultsMap.set(r.testId, r));
                remoteResults.forEach(r => mergedResultsMap.set(r.testId, r));

                const mergedResults = Array.from(mergedResultsMap.values());
                
                // Save the merged results back to local storage.
                localStorage.setItem(localResultsKey, JSON.stringify(mergedResults));

                // A user might take a test offline and then log in. We need to sync any unsynced local results.
                const unsyncedLocalResults = localResults.filter(local => !remoteResults.some(remote => remote.testId === local.testId));

                // Send any unsynced results to the backend.
                for (const result of unsyncedLocalResults) {
                    await apiFetch('/submit-result', 'POST', token, result);
                }

                return mergedResults;
            } catch (error) {
                console.error("Could not sync with server, using local results only.", error);
                throw error; // Re-throw to be caught in the UI
            } finally {
                // Clear the promise so the next sync operation can start fresh.
                syncPromise = null;
            }
        })();

        return syncPromise;
    },
    getLocalTestResultsForUser: (userId: string): TestResult[] => {
        try {
            const stored = localStorage.getItem(`exam_results_${userId}`);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },
    getTestResult: (user: User, testId: string): TestResult | undefined => {
        const results = googleSheetsService.getLocalTestResultsForUser(user.id);
        return results.find(r => r.testId === testId);
    },
    getQuestions: async (exam: Exam, token: string): Promise<Question[]> => {
        return await apiFetch('/questions-from-sheet', 'POST', token, {
            sheetUrl: exam.questionSourceUrl,
            count: exam.numberOfQuestions
        });
    },
    submitTest: async (user: User, examId: string, userAnswers: UserAnswer[], questions: Question[], token: string, proctoringViolations: number): Promise<TestResult> => {
        const correctAnswers = questions.reduce((acc, q) => {
            acc.set(q.id, q.correctAnswer - 1); // Convert to 0-based
            return acc;
        }, new Map<number, number>());

        let correctCount = 0;
        userAnswers.forEach(ua => {
            if (correctAnswers.get(ua.questionId) === ua.answer) {
                correctCount++;
            }
        });

        const score = (correctCount / questions.length) * 100;
        const testId = `test_${user.id}_${examId}_${Date.now()}`;

        const reviewData = questions.map(q => {
            const userAnswer = userAnswers.find(ua => ua.questionId === q.id);
            return {
                questionId: q.id,
                question: q.question,
                options: q.options,
                userAnswer: userAnswer ? userAnswer.answer : -1, // -1 for unanswered
                correctAnswer: q.correctAnswer - 1,
            };
        });

        const result: TestResult = {
            testId,
            userId: user.id,
            examId,
            answers: userAnswers,
            score,
            correctCount,
            totalQuestions: questions.length,
            timestamp: Date.now(),
            review: reviewData,
            proctoringViolations: proctoringViolations
        };
        
        // Save to local storage first for immediate UI update.
        const localResultsKey = `exam_results_${user.id}`;
        const localResults = googleSheetsService.getLocalTestResultsForUser(user.id);
        localResults.push(result);
        localStorage.setItem(localResultsKey, JSON.stringify(localResults));
        
        // Then, sync to backend. Errors are caught by the caller.
        await apiFetch('/submit-result', 'POST', token, result);

        return result;
    },
    getCertificateData: async (token: string, testId: string, isAdminView: boolean = false): Promise<ApiCertificateData> => {
        const endpoint = `/certificate-data/${testId}${isAdminView ? '?admin_view=true' : ''}`;
        return await apiFetch(endpoint, 'GET', token);
    },
    updateUserName: async (token: string, fullName: string): Promise<{ message: string }> => {
        return await apiFetch('/update-name', 'POST', token, { fullName });
    },
    submitFeedback: async (token: string, category: string, message: string): Promise<{ success: boolean }> => {
        return await apiFetch('/submit-feedback', 'POST', token, { category, message });
    },
    submitReview: async (token: string, examId: string, rating: number, reviewText: string): Promise<{ success: boolean }> => {
        return await apiFetch('/submit-review', 'POST', token, { examId, rating, reviewText });
    },
    verifyCertificate: async (certId: string): Promise<VerificationData> => {
        return await apiFetch(`/verify-certificate/${certId}`, 'GET', null);
    },
    logEngagement: async (token: string, examId: string): Promise<void> => {
        apiFetch('/log-engagement', 'POST', token, { examId }).catch(error => {
            console.warn(`Failed to log engagement for exam ${examId}:`, error);
        });
    },
    
    // --- ADMIN ENDPOINTS ---
    getDebugDetails: async (token: string): Promise<DebugData> => {
        return await apiFetch('/debug-details', 'GET', token);
    },
    getExamStats: async (token: string): Promise<ExamStat[]> => {
        return await apiFetch('/exam-stats', 'GET', token);
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
    adminUpdateExamProgram: async (token: string, programId: string, updateData: any): Promise<{ organizations: Organization[], examPrices: any }> => {
        return await apiFetch('/admin/update-exam-program', 'POST', token, { programId, updateData });
    },
    adminCreateExamProgram: async (token: string, programName: string, productLinkData: any): Promise<{ organizations: Organization[], examPrices: any }> => {
        return await apiFetch('/admin/create-exam-program', 'POST', token, { programName, productLinkData });
    },
    adminUpsertProduct: async (token: string, productData: any): Promise<{ organizations: Organization[], examPrices: any }> => {
        return await apiFetch('/admin/upsert-product', 'POST', token, productData);
    },
    adminDeletePost: async (token: string, postId: string, postType: 'mco_exam_program' | 'product'): Promise<{ organizations: Organization[], examPrices: any }> => {
        return await apiFetch('/admin/delete-post', 'POST', token, { postId, postType });
    },
    getPostCreationData: async (token: string): Promise<PostCreationData> => {
        return await apiFetch('/admin/post-creation-data', 'GET', token);
    },
    createPostFromApp: async (token: string, postPayload: any): Promise<{ success: boolean, post_id: number, post_url: string }> => {
        return await apiFetch('/admin/create-post-from-app', 'POST', token, postPayload);
    },
    adminUploadIntroVideo: async (token: string, videoBlob: Blob): Promise<{ organizations: Organization[], examPrices: any }> => {
        const formData = new FormData();
        formData.append('video', videoBlob, 'intro-video.mp4');
        return await apiFetch('/admin/set-intro-video', 'POST', token, formData as any, true);
    }
};