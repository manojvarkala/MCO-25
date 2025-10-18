import React, { FC, useState, useCallback, ReactNode } from 'react';
import { Settings, Award, Lightbulb, PlusCircle, Trash2, RefreshCw, FileText, Cpu, Loader, CheckCircle, XCircle, Trash, Bug, Paintbrush, FileSpreadsheet, DownloadCloud, DatabaseZap, Check, Video, UploadCloud, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { DebugData, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';
import DebugSidebar from './DebugSidebar.tsx';
import { GoogleGenAI } from "@google/genai";

type HealthStatus = 'idle' | 'success' | 'failed' | 'loading';

interface HealthCheckItemProps {
    status: HealthStatus;
    title: string;
    message: string | ReactNode;
    troubleshooting?: ReactNode;
}

interface HealthCheckState {
    connectivity: { status: HealthStatus; message: ReactNode };
    apiEndpoint: { status: HealthStatus; message: ReactNode };
    authentication: { status: HealthStatus; message: ReactNode };
}

type SheetTestResult = {
    success: boolean;
    statusCode: number | string;
    message: string;
    dataPreview: string | null;
} | null;


const decodeHtmlEntities = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return text;
    }
};

// Utility to strip HTML tags, needed for clean AI prompts.
const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        console.error("Could not parse HTML string for stripping", e);
        return html;
    }
};


const TenantVideoGenerator: FC = () => {
    const { activeOrg, updateConfigData } = useAppContext();
    const { token } = useAuth();

    const examProgramNames = activeOrg?.examProductCategories
        .map(p => stripHtml(p.name))
        .slice(0, 3)
        .join(', ');

    const defaultPrompt = `Create a short, silent, 10-second corporate intro video for a professional certification website called "${activeOrg?.name || 'Certification Portal'}".

The video should have a modern, clean, and motivational tone.

Visual Style:
- Use an abstract, high-tech aesthetic.
- Feature visuals like flowing data streams, glowing network nodes, and abstract representations of knowledge.
- The primary color palette should be professional and sophisticated, using shades of blue, teal, and white.

Scene Flow:
1. Start with abstract concepts related to our core topics, such as: ${examProgramNames || 'professional development and online learning'}.
2. Transition to visuals representing success and achievement, like glowing checkmarks, award icons, or a person confidently looking towards the future.
3. End on a clean, inspiring shot, perhaps with a subtle lens flare.

The final video should be suitable for a website's hero section, creating a feeling of professionalism, innovation, and career growth.`;

    const [prompt, setPrompt] = useState(defaultPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

    const handleGenerateVideo = async () => {
        if (!process.env.API_KEY) {
            toast.error("Gemini API key is not configured for this application.");
            return;
        }

        setIsGenerating(true);
        setVideoUrl(null);
        setVideoBlob(null);
        setStatus('Initializing video generation with secure API key...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt,
                config: { numberOfVideos: 1, aspectRatio: '16:9' }
            });

            setStatus('Video generation started. This may take a few minutes...');
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation });
            }

            setStatus('Generation complete! Retrieving video...');
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error('Video generation finished, but no download link was found.');

            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Failed to download the generated video. Status: ${response.status}. Message: ${errorText}`);
            }
            
            const blob = await response.blob();
            setVideoBlob(blob);
            setVideoUrl(URL.createObjectURL(blob));
            setStatus('Video successfully generated and is ready to be set as the intro.');
            toast.success('Video generated!');

        } catch (error: any) {
            const errorMessage = error.message || 'An unknown error occurred.';
            setStatus(`Error: ${errorMessage}`);
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSetAsIntro = async () => {
        if (!videoBlob || !token) {
            toast.error("No video has been generated or user is not authenticated.");
            return;
        }

        const toastId = toast.loading('Uploading video to your server...');
        try {
            const result = await googleSheetsService.adminUploadIntroVideo(token, videoBlob);
             if (result.organizations && result.examPrices) {
                updateConfigData(result.organizations, result.examPrices);
            }
            toast.success('Intro video has been set!', { id: toastId });
        } catch (error: any) {
            toast.error(`Upload failed: ${error.message}`, { id: toastId });
        }
    };
    
    return (
        <div className="space-y-4">
            <p className="text-[rgb(var(--color-text-muted-rgb))] text-sm">
                Use this tool to generate a unique intro video for your landing page. After generation, you can set it as the site's intro video, which will upload it to your WordPress media library and link it to the app.
            </p>
            <div>
                <label className="text-sm font-bold block mb-1">Video Prompt</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full p-2 border rounded-md" />
            </div>
            <button
                onClick={handleGenerateVideo}
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400"
            >
                {isGenerating ? <Spinner /> : <Sparkles size={16} />}
                {isGenerating ? 'Generating...' : 'Generate Video'}
            </button>
            
            {(isGenerating || status) && (
                 <div className="mt-4 p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg text-sm">
                    <p className="font-semibold">Status: <span className="font-normal">{status}</span></p>
                </div>
            )}
             {videoUrl && (
                <div className="mt-4 space-y-3">
                    <h3 className="font-bold">Preview:</h3>
                    <video src={videoUrl} controls className="w-full rounded-lg" />
                    <button
                        onClick={handleSetAsIntro}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                    >
                        <UploadCloud size={16} /> Set as Intro Video
                    </button>
                </div>
            )}
        </div>
    );
};

const HealthCheckItem: FC<HealthCheckItemProps> = ({ status, title, message, troubleshooting }) => {
    const StatusIcon = {
        idle: <div className="w-5 h-5 bg-slate-300 rounded-full flex-shrink-0"></div>,
        loading: <Loader size={20} className="text-blue-500 animate-spin flex-shrink-0" />,
        success: <CheckCircle size={20} className="text-green-500 flex-shrink-0" />,
        failed: <XCircle size={20} className="text-red-500 flex-shrink-0" />,
    }[status];

    const statusColorClass = {
        idle: 'text-slate-500',
        loading: 'text-blue-600',
        success: 'text-green-600',
        failed: 'text-red-600',
    }[status];

    return (
        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            {StatusIcon}
            <div className="flex-grow">
                <h4 className={`font-bold ${statusColorClass}`}>{title}</h4>
                <div className="text-sm text-slate-600">{message}</div>
                {status === 'failed' && troubleshooting && (
                    <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
                        <h5 className="font-bold mb-1">Troubleshooting Tip</h5>
                        {troubleshooting}
                    </div>
                )}
            </div>
        </div>
    );
};

const Admin: FC = () => {
    const { activeOrg, availableThemes, activeTheme, setActiveTheme } = useAppContext();
    const { token } = useAuth();
    
    // State for health check
    const [healthCheckStatus, setHealthCheckStatus] = useState<HealthCheckState>({
        connectivity: { status: 'idle', message: '' },
        apiEndpoint: { status: 'idle', message: '' },
        authentication: { status: 'idle', message: '' },
    });
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [isDebugSidebarOpen, setIsDebugSidebarOpen] = useState(false);

    // State for CSV downloads
    const [isGeneratingWooCsv, setIsGeneratingWooCsv] = useState(false);

    // State for Sheet Tester
    const [sheetUrlToTest, setSheetUrlToTest] = useState('');
    const [isTestingSheet, setIsTestingSheet] = useState(false);
    const [sheetTestResult, setSheetTestResult] = useState<SheetTestResult>(null);
    
    // State for Cache Clearing
    const [isClearingCache, setIsClearingCache] = useState<'config' | 'questions' | 'results' | null>(null);

    // State for sales notification toggle
    const [showNotifications, setShowNotifications] = useState(() => {
        try {
            return localStorage.getItem('mco_show_notifications') !== 'false';
        } catch (e) {
            return true;
        }
    });

    const handleToggleNotifications = () => {
        const newValue = !showNotifications;
        setShowNotifications(newValue);
        try {
            localStorage.setItem('mco_show_notifications', String(newValue));
            toast.success(`Sales notifications ${newValue ? 'enabled' : 'disabled'}. Changes apply after a page refresh.`);
        } catch (e) {
            toast.error("Could not save preference.");
        }
    };


    const certificateTemplates = activeOrg?.certificateTemplates || [];

    const handleRunHealthCheck = async () => {
        setIsCheckingHealth(true);
        const baseUrl = getApiBaseUrl();
        const initialStatus: HealthCheckState = {
            connectivity: { status: 'loading', message: 'Pinging server...' },
            apiEndpoint: { status: 'idle', message: '' },
            authentication: { status: 'idle', message: '' },
        };
        setHealthCheckStatus(initialStatus);
    
        // Check 1: Basic Connectivity
        try {
            const response = await fetch(`${baseUrl}/wp-json/`);
            if (!response.ok) throw new Error(`Server responded with HTTP status ${response.status}`);
            setHealthCheckStatus(prev => ({ ...prev, connectivity: { status: 'success', message: <>Server is reachable at <code className="bg-slate-200 px-1 rounded">{baseUrl}</code></> } }));
    
            // Check 2: API Endpoint
            setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'loading', message: 'Checking for plugin API...' } }));
            try {
                const apiResponse = await fetch(`${baseUrl}/wp-json/mco-app/v1/config`);
                if (!apiResponse.ok) throw new Error(`Server responded with HTTP status ${apiResponse.status}`);
                setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'success', message: 'Plugin API endpoint is active.' } }));
    
                // Check 3: Authentication
                setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'loading', message: 'Testing authentication...' } }));
                try {
                    if (!token) throw new Error('No admin token available in the app.');
                    await googleSheetsService.getDebugDetails(token);
                    setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'success', message: 'Authentication and CORS are correctly configured.' } }));
                } catch (authError: any) {
                    setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'failed', message: authError.message } }));
                }
    
            } catch (apiError: any) {
                setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'failed', message: apiError.message }, authentication: { status: 'idle', message: '' } }));
            }
    
        } catch (connError: any) {
            setHealthCheckStatus(prev => ({
                ...prev,
                connectivity: { status: 'failed', message: connError.message },
                apiEndpoint: { status: 'idle', message: '' },
            }));
        } finally {
            setIsCheckingHealth(false);
        }
    };
    
    const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) return '';
        if (typeof field === 'boolean') return field ? '1' : '0';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const createCsvContent = (headers: string[], data: any[][]): string => {
        const headerRow = headers.map(escapeCsvField).join(',');
        const dataRows = data.map(row => row.map(escapeCsvField).join(','));
        return [headerRow, ...dataRows].join('\n');
    };

    const downloadCsv = (csvContent: string, filename: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handleGenerateWooCsv = () => {
        if (!activeOrg?.examProductCategories || !activeOrg.exams) {
            toast.error("Exam data not loaded.");
            return;
        }
        setIsGeneratingWooCsv(true);
        const toastId = toast.loading('Generating WooCommerce products CSV...', { id: 'generate-woo-csv' });

        try {
            const headers = ['Type', 'SKU', 'Name', 'Published', 'Virtual', 'Regular price', 'Sale price'];
            const data = activeOrg.examProductCategories
                .map(category => {
                    const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);
                    if (certExam) {
                        return [
                            'simple',
                            certExam.productSku,
                            category.name,
                            1,
                            1,
                            certExam.regularPrice ?? '',
                            certExam.price ?? ''
                        ];
                    }
                    return null;
                })
                .filter(row => row !== null);

            if (data.length === 0) {
                toast.error('No certification exams found to generate products for.', { id: toastId });
                return;
            }

            const csvContent = createCsvContent(headers, data as any[][]);
            downloadCsv(csvContent, 'woo_products_from_programs.csv');
            toast.success('WooCommerce products CSV generated!', { id: toastId });
        } catch (error: any) {
            console.error("Failed to generate WooCommerce products CSV", error);
            toast.error('Failed to generate products CSV.', { id: toastId });
        } finally {
            setIsGeneratingWooCsv(false);
        }
    };

    const handleTestSheetUrl = async () => {
        if (!sheetUrlToTest.trim() || !token) {
            toast.error("Please enter a URL to test.");
            return;
        }
        setIsTestingSheet(true);
        setSheetTestResult(null);
        try {
            const result = await googleSheetsService.adminTestSheetUrl(token, sheetUrlToTest);
            setSheetTestResult(result);
        } catch (error: any) {
            setSheetTestResult({
                success: false,
                statusCode: 'FETCH_ERROR',
                message: error.message || "A client-side error occurred.",
                dataPreview: null,
            });
        } finally {
            setIsTestingSheet(false);
        }
    };

    const handleClearConfigCache = async () => {
        if (!token || !window.confirm("Are you sure you want to clear the server's app config cache? The app will need to reload all data on the next request.")) return;
        setIsClearingCache('config');
        try {
            const result = await googleSheetsService.adminClearConfigCache(token);
            toast.success(result.message || "App config cache cleared!");
        } catch (error: any) {
            toast.error(error.message || "Failed to clear config cache.");
        } finally {
            setIsClearingCache(null);
        }
    };

    const handleClearQuestionCache = async () => {
        if (!token || !window.confirm("Are you sure you want to clear ALL server-side question caches? This will force the app to re-fetch questions from every Google Sheet.")) return;
        setIsClearingCache('questions');
        try {
            const result = await googleSheetsService.adminClearQuestionCaches(token);
            toast.success(result.message || "All question caches cleared!");
        } catch (error: any) {
            toast.error(error.message || "Failed to clear question caches.");
        } finally {
            setIsClearingCache(null);
        }
    };
    
    const handleClearAllResults = async () => {
        if (!token || !window.confirm("ARE YOU ABSOLUTELY SURE?\n\nThis will permanently delete all exam results and history for ALL users from the server. This action cannot be undone and will reset all sales and performance analytics.")) return;
        setIsClearingCache('results');
        try {
            const result = await googleSheetsService.adminClearAllResults(token);
            toast.success(result.message || "All user exam results cleared!");
        } catch (error: any) {
            toast.error(error.message || "Failed to clear results.");
        } finally {
            setIsClearingCache(null);
        }
    };

    return (
        <>
            <DebugSidebar isOpen={isDebugSidebarOpen} onClose={() => setIsDebugSidebarOpen(false)} />
            <div className="space-y-8">
                <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Admin Dashboard</h1>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Bug className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Developer Tools
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Access advanced diagnostic tools, user masquerading, and API inspection.
                    </p>
                    <button
                        onClick={() => setIsDebugSidebarOpen(true)}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-slate-700 hover:bg-slate-800 transition"
                    >
                        <Bug size={20} className="mr-2" />
                        Launch Debug Sidebar
                    </button>
                </div>
                
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Video className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Branding & Media
                    </h2>
                    <TenantVideoGenerator />
                </div>


                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Cpu className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        System Health Check
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Diagnose "No route found" errors and other connection issues with your WordPress backend.
                    </p>
                    <button
                        onClick={handleRunHealthCheck}
                        disabled={isCheckingHealth}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
                    >
                        {isCheckingHealth ? <Spinner size="sm" /> : <RefreshCw size={20} />}
                        <span className="ml-2">{isCheckingHealth ? 'Running Checks...' : 'Run Health Check'}</span>
                    </button>
                    {healthCheckStatus.connectivity.status !== 'idle' && (
                        <div className="mt-6 space-y-4">
                            <HealthCheckItem status={healthCheckStatus.connectivity.status} title="Server Connectivity" message={healthCheckStatus.connectivity.message} />
                            <HealthCheckItem status={healthCheckStatus.apiEndpoint.status} title="Plugin API Endpoint" message={healthCheckStatus.apiEndpoint.message} />
                            <HealthCheckItem 
                                status={healthCheckStatus.authentication.status} 
                                title="Authentication & CORS" 
                                message={healthCheckStatus.authentication.message}
                                troubleshooting={
                                    <div className="space-y-3">
                                        <p>This error almost always means your server is stripping the "Authorization" header from API requests.</p>
                                        <div>
                                            <strong className="text-amber-900">Primary Solution (for Apache/LiteSpeed servers):</strong>
                                            <p>Add the following code to the <strong>very top</strong> of your <code>.htaccess</code> file in the WordPress root directory (before the <code># BEGIN WordPress</code> block):</p>
                                            <pre className="whitespace-pre-wrap bg-slate-100 p-2 rounded my-1 text-xs"><code>
    {`<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
    </IfModule>`}
                                            </code></pre>
                                            <p>After adding this, clear any server or plugin caches.</p>
                                        </div>
                                        <div className="pt-3 border-t border-amber-200">
                                            <strong className="text-amber-900">Secondary Solution (if saving still fails after a successful check):</strong>
                                            <p>If the check above passes but saving an exam program still gives a "No route found" error, your server's URL rules might be cached. The best way to fix this is to flush them:</p>
                                            <ol className="list-decimal list-inside ml-4 mt-1">
                                                <li>Go to your WordPress Admin Dashboard.</li>
                                                <li>Navigate to <strong>Settings &rarr; Permalinks</strong>.</li>
                                                <li>You don't need to change anything. Just click the <strong>"Save Changes"</strong> button.</li>
                                                <li>This action forces WordPress to rebuild its internal URL routing table.</li>
                                            </ol>
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                    )}
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Paintbrush className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Appearance &amp; UI
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Customize the user interface for your administrator account.
                    </p>
                    <table className="form-table">
                        <tbody>
                            <tr>
                                <th scope="row">Show Sales Notifications</th>
                                <td>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Toggle the live purchase pop-ups for your account. Changes apply after a refresh.</p>
                                        </div>
                                        <button
                                            onClick={handleToggleNotifications}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))] focus:ring-offset-2 ${
                                                showNotifications ? 'bg-[rgb(var(--color-primary-rgb))]' : 'bg-slate-300'
                                            }`}
                                            role="switch"
                                            aria-checked={showNotifications}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    showNotifications ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row">Application Theme</th>
                                <td>
                                    <p className="text-sm text-[rgb(var(--color-text-muted-rgb))] mb-4">Select a theme to change the application's appearance. Your choice is saved on this browser.</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {(availableThemes || []).map(theme => (
                                            <button
                                                type="button"
                                                key={theme.id}
                                                onClick={() => setActiveTheme(theme.id)}
                                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition text-left ${activeTheme === theme.id ? 'border-[rgb(var(--color-primary-rgb))] ring-2 ring-[rgba(var(--color-primary-rgb),0.2)]' : 'border-[rgb(var(--color-border-rgb))] hover:border-[rgba(var(--color-primary-rgb),0.5)]'}`}
                                            >
                                                {activeTheme === theme.id && (
                                                    <div className="absolute -top-2 -right-2 bg-[rgb(var(--color-primary-rgb))] text-white rounded-full p-1 shadow-md">
                                                        <Check size={14} />
                                                    </div>
                                                )}
                                                <div className="flex justify-center space-x-1 h-8 pointer-events-none">
                                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-primary`}></div>
                                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-secondary`}></div>
                                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-accent`}></div>
                                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-background`}></div>
                                                </div>
                                                <p className="font-semibold text-center mt-2 text-[rgb(var(--color-text-default-rgb))] pointer-events-none">{theme.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Trash className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Cache & Data Management
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Force the server to reload data or reset user history. These are destructive actions and should be used with caution.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <button
                                onClick={handleClearConfigCache}
                                disabled={!!isClearingCache}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                                {isClearingCache === 'config' ? <Spinner size="sm" /> : <RefreshCw size={16} />}
                                <span className="ml-2">{isClearingCache === 'config' ? 'Clearing...' : 'Clear App Config Cache'}</span>
                            </button>
                            <p className="text-xs text-slate-500 mt-1">Clears all exam programs, products, and settings cache.</p>
                        </div>
                        <div>
                            <button
                                onClick={handleClearQuestionCache}
                                disabled={!!isClearingCache}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                                {isClearingCache === 'questions' ? <Spinner size="sm" /> : <RefreshCw size={16} />}
                                <span className="ml-2">{isClearingCache === 'questions' ? 'Clearing...' : 'Clear All Question Caches'}</span>
                            </button>
                            <p className="text-xs text-slate-500 mt-1">Forces the app to re-fetch questions from all Google Sheets.</p>
                        </div>
                        <div className="pt-4 border-t border-[rgb(var(--color-border-rgb))]">
                            <button
                                onClick={handleClearAllResults}
                                disabled={!!isClearingCache}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-800 hover:bg-red-900 disabled:opacity-50"
                            >
                                {isClearingCache === 'results' ? <Spinner size="sm" /> : <DatabaseZap size={16} />}
                                <span className="ml-2">{isClearingCache === 'results' ? 'Clearing...' : 'Clear All Exam Results'}</span>
                            </button>
                            <p className="text-xs text-red-500 mt-1"><strong>Warning:</strong> Deletes all exam results for all users from the database. This action cannot be undone and resets analytics.</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <FileText className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Google Sheet URL Tester
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        If you're getting a "Question Sheet: Failure" error, paste the URL from your "Question Source URL" field here to test it directly and get detailed feedback.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={sheetUrlToTest}
                            onChange={(e) => setSheetUrlToTest(e.target.value)}
                            placeholder="Paste your Google Sheet URL here..."
                            className="flex-grow p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                            disabled={isTestingSheet}
                        />
                        <button
                            onClick={handleTestSheetUrl}
                            disabled={isTestingSheet}
                            className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                        >
                            {isTestingSheet ? <Spinner size="sm" /> : <RefreshCw size={20} />}
                            <span className="ml-2">{isTestingSheet ? 'Testing...' : 'Test URL'}</span>
                        </button>
                    </div>

                    {sheetTestResult && (
                        <div className="mt-6">
                            <h3 className="font-bold mb-2">Test Result:</h3>
                            <div className={`flex items-start gap-4 p-4 rounded-lg border ${sheetTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                {sheetTestResult.success ? <CheckCircle size={24} className="text-green-500 flex-shrink-0" /> : <XCircle size={24} className="text-red-500 flex-shrink-0" />}
                                <div className="flex-grow text-sm">
                                    <p className={`font-bold ${sheetTestResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {sheetTestResult.success ? 'Success' : 'Failure'} (Status: {sheetTestResult.statusCode})
                                    </p>
                                    <p className="text-slate-700">{sheetTestResult.message}</p>
                                    {sheetTestResult.dataPreview && (
                                        <div className="mt-3">
                                            <h4 className="font-semibold text-xs text-slate-500">Data Preview (First 5 Rows):</h4>
                                            <pre className="text-xs bg-slate-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono">
                                                {sheetTestResult.dataPreview}
                                            </pre>
                                        </div>
                                    )}
                                    {!sheetTestResult.success && (
                                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left text-sm text-amber-800">
                                            <h3 className="font-bold mb-2 flex items-center gap-2"><Lightbulb size={16} /> How to Fix This Error:</h3>
                                            <p className="mb-2">This error means your server cannot access the Google Sheet URL. The only 100% reliable method is to use a <strong>"Publish to the web"</strong> link.</p>
                                            <h4 className="font-semibold mt-3 mb-1">Required Steps:</h4>
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>In your Google Sheet, go to <strong>File &rarr; Share &rarr; Publish to the web</strong>.</li>
                                                <li>In the dialog, under the "Link" tab, select the correct sheet (e.g., "Sheet1").</li>
                                                <li>Choose <strong>"Comma-separated values (.csv)"</strong> from the dropdown.</li>
                                                <li>Click <strong>Publish</strong> and confirm.</li>
                                                <li>Copy the generated link. This is the URL you must use.</li>
                                            </ol>
                                            <p className="text-xs mt-3"><strong>Note:</strong> Standard "Share with anyone with the link" URLs will not work reliably and will be rejected by the system.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <FileSpreadsheet className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Bulk Data Management
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Streamline your content creation with this workflow for bulk importing exam programs and their corresponding WooCommerce products.
                    </p>

                    <div className="space-y-4 p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                        <ol className="list-decimal list-inside space-y-4 text-[rgb(var(--color-text-muted-rgb))]">
                             <li>
                                <strong className="text-[rgb(var(--color-text-strong-rgb))]">Download Templates</strong><br />
                                Get the CSV templates for your content. The "Question Sheet Template" is new and supports both 3-column and the recommended 6-column formats.
                                <div className="flex flex-wrap gap-2 mt-2">
                                     <a href="/template-exam-programs.csv" download className="inline-flex items-center justify-center px-3 py-1.5 border border-[rgb(var(--color-border-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-text-default-rgb))] bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]">
                                        <DownloadCloud size={16} className="mr-2"/> Download Exam Program Template
                                    </a>
                                    <a href="/template-questions.csv" download className="inline-flex items-center justify-center px-3 py-1.5 border border-[rgb(var(--color-border-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-text-default-rgb))] bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]">
                                        <DownloadCloud size={16} className="mr-2"/> Download Question Sheet Template
                                    </a>
                                </div>
                            </li>
                            <li>
                                <strong className="text-[rgb(var(--color-text-strong-rgb))]">Upload Exam Programs CSV</strong><br />
                                Fill the template with your program data, then upload it in your WordPress admin under <a href={`${getApiBaseUrl()}/wp-admin/admin.php?page=mco-exam-engine&tab=bulk_import`} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary-rgb))] font-semibold hover:underline">Exam App Engine &rarr; Bulk Import</a>.
                            </li>
                            <li>
                                <strong className="text-[rgb(var(--color-text-strong-rgb))]">Generate & Upload WooCommerce Products CSV</strong><br />
                                After uploading programs, click the button below to generate a new CSV pre-filled with product details for each new exam. Then, upload it in WooCommerce under <a href={`${getApiBaseUrl()}/wp-admin/edit.php?post_type=product&page=product_importer`} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary-rgb))] font-semibold hover:underline">Products &rarr; Import</a>.
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    <button
                                        onClick={handleGenerateWooCsv}
                                        disabled={isGeneratingWooCsv}
                                        className="inline-flex items-center justify-center px-3 py-1.5 border border-[rgb(var(--color-primary-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-primary-rgb))] bg-[rgba(var(--color-primary-rgb),0.1)] hover:bg-[rgba(var(--color-primary-rgb),0.2)] disabled:opacity-50"
                                    >
                                        {isGeneratingWooCsv ? <Spinner size="sm" /> : <FileText size={16} className="mr-2"/>}
                                        {isGeneratingWooCsv ? 'Generating...' : 'Generate & Download WooCommerce Products CSV'}
                                    </button>
                                </div>
                            </li>
                        </ol>
                    </div>
                </div>
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Award className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Certificate Templates Overview
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        This is a read-only overview of the certificate templates configured in your WordPress backend. To edit these, go to <strong>Exam App Engine &rarr; Certificate Templates</strong> in your WP admin dashboard.
                    </p>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                        {certificateTemplates.map(template => (
                            <div key={template.id} className="bg-[rgb(var(--color-muted-rgb))] p-3 rounded-md border border-[rgb(var(--color-border-rgb))]">
                                <p className="font-semibold text-[rgb(var(--color-text-strong-rgb))]">{template.name || `ID: ${template.id}`}</p>
                                <p className="text-xs text-slate-500 truncate" title={template.title}>Title: "{template.title}"</p>
                            </div>
                        ))}
                        {certificateTemplates.length === 0 && (
                            <p className="text-[rgb(var(--color-text-muted-rgb))] text-center py-4">No certificate templates found.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
    };
export default Admin;