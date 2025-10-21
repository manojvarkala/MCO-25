import React, { FC, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Paintbrush, DatabaseZap, DownloadCloud, FileSpreadsheet, Cpu, Loader, CheckCircle, XCircle, RefreshCw, Trash2, Bug, ShoppingCart, BarChart3, FileText, DollarSign } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';
import DebugSidebar from './DebugSidebar.tsx';

interface HealthStatus {
    [key: string]: { success: boolean; message: string; data?: any };
}

const HealthListItem: FC<{ title: string; status?: { success: boolean; message: string; data?: any }; onDetails: (data: any) => void }> = ({ title, status, onDetails }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
            <div className="flex items-center gap-3">
                { !status ? (
                    <Loader size={18} className="animate-spin text-[rgb(var(--color-text-muted-rgb))]" />
                ) : status.success ? (
                    <CheckCircle size={18} className="text-green-500" />
                ) : (
                    <XCircle size={18} className="text-red-500" />
                )}
                <p className="font-semibold">{title}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
                <p className={`font-medium ${status && !status.success ? 'text-red-400' : 'text-[rgb(var(--color-text-muted-rgb))]'}`}>
                    { !status ? 'Checking...' : status.message }
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

const StatCard: FC<{ title: string; value: string | number; icon: ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg flex items-center border border-[rgb(var(--color-border-rgb))]">
        <div className="p-3 rounded-full mr-4 bg-[rgba(var(--color-primary-rgb),0.1)]">{icon}</div>
        <div>
            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">{title}</p>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{value}</p>
        </div>
    </div>
);


const Admin: FC = () => {
    const { activeOrg, availableThemes, activeTheme, setActiveTheme } = useAppContext();
    const { token } = useAuth();
    const [isGeneratingWooCsv, setIsGeneratingWooCsv] = useState(false);
    const [isGeneratingProgramsCsv, setIsGeneratingProgramsCsv] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [isDebugOpen, setIsDebugOpen] = useState(false);
    const [detailsModalData, setDetailsModalData] = useState<any>(null);

    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [examStats, setExamStats] = useState<ExamStat[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!token) return;
        const fetchAdminData = async () => {
            setIsLoadingData(true);
            try {
                const [status, stats] = await Promise.all([
                    googleSheetsService.adminGetSystemStatus(token),
                    googleSheetsService.getExamStats(token)
                ]);
                setHealthStatus(status);
                if (activeOrg) {
                    const certExamIds = activeOrg.exams.filter(e => !e.isPractice).map(e => e.id);
                    const relevantStats = stats.filter((stat: ExamStat) => certExamIds.includes(stat.id));
                    setExamStats(relevantStats);
                }
            } catch (error: any) {
                toast.error("Could not load admin data: " + error.message);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchAdminData();
    }, [token, activeOrg]);

    const summaryStats = useMemo(() => {
        if (!examStats) return { totalSales: 0, totalRevenue: 0, totalAttempts: 0 };
        return examStats.reduce((acc, stat) => {
            acc.totalSales += stat.totalSales;
            acc.totalRevenue += stat.totalRevenue;
            acc.totalAttempts += stat.attempts;
            return acc;
        }, { totalSales: 0, totalRevenue: 0, totalAttempts: 0 });
    }, [examStats]);
    
    const generateCsvPostRequest = async (action: string, setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>) => {
        setIsGenerating(true);
        try {
            const form = document.createElement('form');
            form.method = 'post';
            form.action = `${getApiBaseUrl()}/wp-admin/admin-post.php`;
            form.target = '_blank';
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = action;
            form.appendChild(actionInput);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        } catch (error: any) {
            toast.error(`Failed to generate CSV: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateProgramsCsv = () => generateCsvPostRequest('mco_generate_programs_csv', setIsGeneratingProgramsCsv);
    const handleGenerateWooCsv = () => generateCsvPostRequest('mco_generate_products_csv', setIsGeneratingWooCsv);

    const handleCacheClear = async (action: 'config' | 'questions' | 'results') => {
        if (!token) { toast.error("Authentication Error"); return; }
        let apiCall;
        switch(action) {
            case 'config': apiCall = googleSheetsService.adminClearConfigCache; break;
            case 'questions': apiCall = googleSheetsService.adminClearQuestionCaches; break;
            case 'results':
                if (!window.confirm("ARE YOU SURE? This will permanently delete all user exam results from the database. This action cannot be undone.")) return;
                apiCall = googleSheetsService.adminClearAllResults;
                break;
            default: return;
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
                            <pre className="text-xs bg-[rgb(var(--color-muted-rgb))] p-2 rounded whitespace-pre-wrap">{typeof detailsModalData === 'object' ? JSON.stringify(detailsModalData, null, 2) : detailsModalData}</pre>
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
                    {isLoadingData ? <div className="flex justify-center"><Spinner /></div> : (
                        <div className="space-y-2">
                            <HealthListItem title="Backend API Connection" status={healthStatus?.api_connection} onDetails={setDetailsModalData} />
                            <HealthListItem title="JWT Secret Key" status={healthStatus?.jwt_secret} onDetails={setDetailsModalData} />
                            <HealthListItem title="WooCommerce Plugin" status={healthStatus?.woocommerce} onDetails={setDetailsModalData} />
                            <HealthListItem title="WooCommerce Subscriptions" status={healthStatus?.wc_subscriptions} onDetails={setDetailsModalData} />
                            <HealthListItem title="App URL Configuration" status={healthStatus?.app_url_config} onDetails={setDetailsModalData} />
                            <HealthListItem title="Google Sheet Accessibility" status={healthStatus?.google_sheet} onDetails={setDetailsModalData} />
                        </div>
                    )}
                </div>
                
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <BarChart3 className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Analytics at a Glance
                    </h2>
                    {isLoadingData ? <div className="flex justify-center"><Spinner /></div> : (
                        examStats ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <StatCard title="Total Sales" value={summaryStats.totalSales} icon={<ShoppingCart className="text-[rgb(var(--color-primary-rgb))]" />} />
                                    <StatCard title="Total Revenue" value={summaryStats.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} icon={<DollarSign className="text-[rgb(var(--color-primary-rgb))]" />} />
                                    <StatCard title="Total Attempts" value={summaryStats.totalAttempts} icon={<FileText className="text-[rgb(var(--color-primary-rgb))]" />} />
                                </div>
                                <div className="text-right mt-4">
                                    <Link to="/admin/analytics" className="font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline">
                                        View Full Analytics Report →
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <p className="text-center p-4 text-[rgb(var(--color-text-muted-rgb))]">No analytics data available yet.</p>
                        )
                    )}
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Paintbrush className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Appearance &amp; UI
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
                                        <CheckCircle size={14} />
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