import React, { FC, useState, useCallback, ReactNode, useEffect } from 'react';
import { Settings, Award, Lightbulb, PlusCircle, Trash2, RefreshCw, FileText, Cpu, Loader, CheckCircle, XCircle, Trash, Bug, Paintbrush, FileSpreadsheet, DownloadCloud, DatabaseZap, Check, Sparkles, UploadCloud } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { DebugData, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';
import DebugSidebar from './DebugSidebar.tsx';

// FIX: The HealthCheckItem component was missing its implementation, causing a type error. The full implementation has been restored.
const HealthCheckItem: FC<{ title: string; check: () => Promise<{ success: boolean; message: string; data?: any }>; onDetails: (data: any) => void }> = ({ title, check, onDetails }) => {
    const [status, setStatus] = useState<{ success: boolean; message: string; data?: any } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        check()
            .then(result => {
                if (isMounted) setStatus(result);
            })
            .catch(error => {
                if (isMounted) setStatus({ success: false, message: error.message || 'An unknown error occurred.' });
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });
        
        return () => { isMounted = false; };
    }, [check]);

    return (
        <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
            <div className="flex items-center gap-3">
                {isLoading ? (
                    <Loader size={18} className="animate-spin text-[rgb(var(--color-text-muted-rgb))]" />
                ) : status?.success ? (
                    <CheckCircle size={18} className="text-green-500" />
                ) : (
                    <XCircle size={18} className="text-red-500" />
                )}
                <p className="font-semibold">{title}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
                <p className={`font-medium ${status && !status.success ? 'text-red-400' : 'text-[rgb(var(--color-text-muted-rgb))]'}`}>
                    {isLoading ? 'Checking...' : status?.message}
                </p>
                {status?.data && (
                    <button onClick={() => onDetails(status.data)} className="text-xs font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline">
                        Details
                    </button>
                )}
            </div>
        </div>
    );
};


const Admin: FC = () => {
    const { activeOrg, availableThemes, activeTheme, setActiveTheme, updateConfigData } = useAppContext();
    const { token } = useAuth();
    const [isGeneratingWooCsv, setIsGeneratingWooCsv] = useState(false);
    const [isGeneratingProgramsCsv, setIsGeneratingProgramsCsv] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [isDebugOpen, setIsDebugOpen] = useState(false);
    const [detailsModalData, setDetailsModalData] = useState<any>(null);

    // Health Check Functions
    const testApiConnection = useCallback(async () => {
        if (!token) throw new Error("Not authenticated.");
        try {
            await googleSheetsService.getDebugDetails(token);
            return { success: true, message: "Connected" };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }, [token]);

    const testSheetUrl = useCallback(async () => {
        if (!token) throw new Error("Not authenticated.");
        if (!activeOrg?.exams?.[0]?.questionSourceUrl) {
            // Find first exam with a URL
            const firstExamWithUrl = activeOrg?.exams.find(e => e.questionSourceUrl);
            if (!firstExamWithUrl) return { success: true, message: "No sheet URLs configured to test." };
             try {
                const result = await googleSheetsService.adminTestSheetUrl(token, firstExamWithUrl.questionSourceUrl);
                return { success: result.success, message: result.message, data: result.data };
            } catch (error: any) {
                return { success: false, message: error.message };
            }
        }
        try {
            const result = await googleSheetsService.adminTestSheetUrl(token, activeOrg.exams[0].questionSourceUrl);
            return { success: result.success, message: result.message, data: result.data };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }, [token, activeOrg]);
    
    const handleGenerateWooCsv = () => { toast.error("This feature is not yet implemented."); };
    const handleGenerateProgramsCsv = () => { toast.error("This feature is not yet implemented."); };

    const handleCacheClear = async (action: 'config' | 'questions' | 'results') => {
        if (!token) { toast.error("Authentication Error"); return; }

        let apiCall;
        switch(action) {
            case 'config':
                apiCall = googleSheetsService.adminClearConfigCache;
                break;
            case 'questions':
                apiCall = googleSheetsService.adminClearQuestionCaches;
                break;
            case 'results':
                if (!window.confirm("ARE YOU SURE? This will permanently delete all user exam results from the database. This action cannot be undone.")) {
                    return;
                }
                apiCall = googleSheetsService.adminClearAllResults;
                break;
            default:
                return;
        }

        setIsClearingCache(true);
        const toastId = toast.loading(`Clearing ${action} cache...`);
        try {
            const result = await apiCall(token);
            toast.success(result.message, { id: toastId });
        } catch (error: any) {
            toast.error(error.message || `Failed to perform action: ${action}`, { id: toastId });
        } finally {
            setIsClearingCache(false);
        }
    };
    

    return (
        <>
            <DebugSidebar isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
             {detailsModalData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[rgb(var(--color-card-rgb))] rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-[rgb(var(--color-border-rgb))]">
                            <h2 className="font-bold text-lg">Health Check Details</h2>
                        </div>
                        <div className="p-4 overflow-auto">
                            <pre className="text-xs bg-[rgb(var(--color-muted-rgb))] p-2 rounded whitespace-pre-wrap">{JSON.stringify(detailsModalData, null, 2)}</pre>
                        </div>
                        <div className="p-4 border-t border-[rgb(var(--color-border-rgb))] text-right">
                            <button onClick={() => setDetailsModalData(null)} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold text-slate-700">Close</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="space-y-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Admin Dashboard</h1>
                        <p className="text-lg text-[rgb(var(--color-text-muted-rgb))]">Tools and diagnostics for managing the application.</p>
                    </div>
                    <button onClick={() => setIsDebugOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition">
                        <Bug size={18} /> Launch Debug Sidebar
                    </button>
                </div>
            
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Cpu className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        System Health Check
                    </h2>
                    <div className="space-y-2">
                        <HealthCheckItem title="Backend API Connection" check={testApiConnection} onDetails={setDetailsModalData} />
                        <HealthCheckItem title="Google Sheet Accessibility" check={testSheetUrl} onDetails={setDetailsModalData} />
                    </div>
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Paintbrush className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Branding &amp; Appearance
                    </h2>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {(availableThemes || []).map(theme => (
                            <button
                                type="button"
                                key={theme.id}
                                onClick={() => setActiveTheme(theme.id)}
                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition text-left ${activeTheme === theme.id ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-200 hover:border-cyan-400'}`}
                            >
                                {activeTheme === theme.id && (
                                    <div className="absolute -top-2 -right-2 bg-cyan-500 text-white rounded-full p-1 shadow-md">
                                        <Check size={14} />
                                    </div>
                                )}
                                <div className="flex justify-center space-x-1 h-8 pointer-events-none">
                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-primary`}></div>
                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-secondary`}></div>
                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-accent`}></div>
                                    <div className={`w-1/4 rounded theme-swatch-${theme.id}-background`}></div>
                                </div>
                                <p className="font-semibold text-center mt-2 text-slate-700 pointer-events-none">{theme.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
                
                 <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <DatabaseZap className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Cache & Data Management
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Use these tools to clear server-side caches or perform dangerous data operations.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg">
                            <h3 className="font-bold mb-2">App Config Cache</h3>
                            <p className="text-xs text-[rgb(var(--color-text-muted-rgb))] mb-3">Clear this if you've made changes in WordPress (e.g., updated an exam) and don't see them reflected in the app.</p>
                            <button onClick={() => handleCacheClear('config')} disabled={isClearingCache} className="w-full text-sm flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                {isClearingCache ? <Spinner size="sm" /> : <RefreshCw size={16} />} Clear Config Cache
                            </button>
                        </div>
                        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg">
                            <h3 className="font-bold mb-2">Question Sheet Caches</h3>
                            <p className="text-xs text-[rgb(var(--color-text-muted-rgb))] mb-3">Forces the server to re-fetch all question data from the linked Google Sheets. Use this if you've updated questions.</p>
                            <button onClick={() => handleCacheClear('questions')} disabled={isClearingCache} className="w-full text-sm flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                {isClearingCache ? <Spinner size="sm" /> : <RefreshCw size={16} />} Clear Question Caches
                            </button>
                        </div>
                        <div className="bg-red-900/50 p-4 rounded-lg border border-red-500">
                            <h3 className="font-bold text-red-300 mb-2">Clear ALL Exam Results</h3>
                            <p className="text-xs text-red-300/80 mb-3"><strong>DANGER:</strong> This permanently deletes all user exam history from the database. Cannot be undone.</p>
                            <button onClick={() => handleCacheClear('results')} disabled={isClearingCache} className="w-full text-sm flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                {isClearingCache ? <Spinner size="sm" /> : <Trash2 size={16} />} Clear All Results
                            </button>
                        </div>
                    </div>
                </div>

                 <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <FileSpreadsheet className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Bulk Data Management
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Streamline your content creation by exporting existing data for bulk editing, or downloading empty templates.
                    </p>
                    <div className="space-y-3">
                        <div>
                            <button
                                onClick={handleGenerateProgramsCsv}
                                disabled={isGeneratingProgramsCsv}
                                className="inline-flex items-center justify-center px-4 py-2 border border-[rgb(var(--color-border-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-text-default-rgb))] bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] disabled:opacity-50"
                            >
                                {isGeneratingProgramsCsv ? <Spinner size="sm" /> : <DownloadCloud size={16} className="mr-2"/>}
                                {isGeneratingProgramsCsv ? 'Generating...' : 'Generate Exam Programs CSV from Data'}
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={handleGenerateWooCsv}
                                disabled={isGeneratingWooCsv}
                                className="inline-flex items-center justify-center px-4 py-2 border border-[rgb(var(--color-border-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-text-default-rgb))] bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] disabled:opacity-50"
                            >
                                {isGeneratingWooCsv ? <Spinner size="sm" /> : <DownloadCloud size={16} className="mr-2"/>}
                                {isGeneratingWooCsv ? 'Generating...' : 'Generate WooCommerce Products CSV from Programs'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
export default Admin;