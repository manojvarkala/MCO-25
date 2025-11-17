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

// FIX: Corrected HealthStatus interface to resolve TypeScript index signature error.
// The new interface is more explicit, improving type safety and allowing removal of `as any` casts below.
interface HealthStatus {
    [key: string]: { success: boolean; message: string; data?: any } | { [key: string]: string } | undefined;
    api_connection?: { success: boolean; message: string; data?: any };
    jwt_secret?: { success: boolean; message: string; data?: any };
    woocommerce?: { success: boolean; message: string; data?: any };
    wc_subscriptions?: { success: boolean; message: string; data?: any };
    app_url_config?: { success: boolean; message: string; data?: any };
    google_sheet?: { success: boolean; message: string; data?: any };
    nonces?: { [key: string]: string };
}

// FIX: Define theme colors directly in the component for robust rendering.
const themeColors: { [key: string]: { [key: string]: string } } = {
    default: {
        primary: 'rgb(6, 182, 212)',
        secondary: 'rgb(219, 39, 119)',
        accent: 'rgb(253, 224, 71)',
        background: 'rgb(30, 41, 59)',
    },
    professional: {
        primary: 'rgb(4, 120, 87)',
        secondary: 'rgb(59, 130, 246)',
        accent: 'rgb(234, 179, 8)',
        background: 'rgb(241, 245, 249)',
    },
    serene: {
        primary: 'rgb(96, 165, 250)',
        secondary: 'rgb(52, 211, 153)',
        accent: 'rgb(251, 146, 60)',
        background: 'rgb(240, 253, 250)',
    },
    academic: {
        primary: 'rgb(127, 29, 29)',
        secondary: 'rgb(161, 98, 7)',
        accent: 'rgb(217, 119, 6)',
        background: 'rgb(254, 252, 251)',
    },
    noir: {
        primary: 'rgb(229, 231, 235)',
        secondary: 'rgb(139, 92, 246)',
        accent: 'rgb(234, 179, 8)',
        background: 'rgb(31, 41, 55)',
    }
};

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
    const [detailsModalData, setDetailsModalData] = useState<any>(null);

    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [examStats, setExamStats] = useState<ExamStat[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [sheetUrlToTest, setSheetUrlToTest] = useState('');
    const [isTestingUrl, setIsTestingUrl] = useState(false);
    const [testUrlResult, setTestUrlResult] = useState<{ success: boolean; message: string; dataPreview?: string } | null>(null);

    const [showNotifications, setShowNotifications] = useState(() => {
        try {
            return localStorage.getItem('mco_show_notifications') !== 'false';
        } catch {
            return true;
        }
    });

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
            acc.totalSales += stat.totalSales ?? 0;
            acc.totalRevenue += stat.totalRevenue ?? 0;
            acc.totalAttempts += stat.attempts;
            return acc;
        }, { totalSales: 0, totalRevenue: 0, totalAttempts: 0 });
    }, [examStats]);

    useEffect(() => {
        try {
            localStorage.setItem('mco_show_notifications', String(showNotifications));
        } catch (e) {
            console.error("Could not save notification preference", e);
        }
    }, [showNotifications]);
    
    const generateCsvPostRequest = async (action: string, nonceName: string, nonceKey: string, setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>) => {
        setIsGenerating(true);
        if (!healthStatus || !healthStatus.nonces || !healthStatus.nonces[nonceKey]) {
            toast.error("Could not generate CSV: Security token is missing. Please refresh the page.");
            setIsGenerating(false);
            return;
        }

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

            const nonceInput = document.createElement('input');
            nonceInput.type = 'hidden';
            nonceInput.name = nonceName;
            nonceInput.value = healthStatus.nonces[nonceKey];
            form.appendChild(nonceInput);

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        } catch (error: any) {
            toast.error(`Failed to generate CSV: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateProgramsCsv = () => generateCsvPostRequest('mco_generate_programs_csv', '_wpnonce', 'generate_programs_csv', setIsGeneratingProgramsCsv);
    const handleGenerateWooCsv = () => generateCsvPostRequest('mco_generate_products_csv', '_wpnonce', 'generate_products_csv', setIsGeneratingWooCsv);

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

    const handleTestUrl = async () => {
        if (!token || !sheetUrlToTest) {
            toast.error("Please enter a URL to test.");
            return;
        }
        setIsTestingUrl(true);
        setTestUrlResult(null);
        try {
            const result = await googleSheetsService.adminTestSheetUrl(token, sheetUrlToTest);
            setTestUrlResult(result);
            if(result.success) {
                toast.success("Sheet is accessible!");
            } else {
                toast.error(`Test Failed: ${result.message}`);
            }
        } catch (error: any) {
            const errorMessage = error.message || 'An unknown error occurred.';
            setTestUrlResult({ success: false, message: errorMessage });
            toast.error(errorMessage);
        } finally {
            setIsTestingUrl(false);
        }
    };
    

    return (
        <>
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
                <div>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Admin Dashboard</h1>
                    <p className="text-lg text-[rgb(var(--color-text-muted-rgb))]">Tools and diagnostics for managing the application.</p>
                </div>
            
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Cpu className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        System Health Check
                    </h2>
                    {isLoadingData ? <div className="flex justify-center"><Spinner /></div> : (
                        <div className="space-y-2">
                            {/* FIX: Removed `as any` casts due to improved HealthStatus type definition. */}
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
                        <FileSpreadsheet className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Google Sheet URL Checker
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-4">
                        Test if a specific Google Sheet URL is accessible by the server. Use the "Publish to the web" CSV link for best results.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="url"
                            value={sheetUrlToTest}
                            onChange={(e) => setSheetUrlToTest(e.target.value)}
                            placeholder="Paste Google Sheet URL here..."
                            className="flex-grow p-2 border rounded-md bg-white"
                            aria-label="Google Sheet URL"
                        />
                        <button onClick={handleTestUrl} disabled={isTestingUrl} className="flex items-center justify-center gap-2 px-4 py-2 bg-[rgb(var(--color-primary-rgb))] text-white rounded-lg font-semibold hover:bg-[rgb(var(--color-primary-hover-rgb))] transition disabled:bg-slate-400">
                            {isTestingUrl ? <Spinner size="sm" /> : <RefreshCw size={16} />}
                            {isTestingUrl ? 'Testing...' : 'Test URL'}
                        </button>
                    </div>
                    {testUrlResult && (
                        <div className={`mt-4 p-3 rounded-lg border ${testUrlResult.success ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                            <p className={`font-bold ${testUrlResult.success ? 'text-green-300' : 'text-red-300'}`}>
                                {testUrlResult.success ? 'Success' : 'Failed'}: {testUrlResult.message}
                            </p>
                            {testUrlResult.dataPreview && (
                                <pre className="text-xs bg-black/20 text-slate-300 p-2 rounded mt-2 whitespace-pre-wrap font-mono">{testUrlResult.dataPreview}</pre>
                            )}
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
                                {/* FIX: Replaced dynamic classes with inline styles for robust rendering. */}
                                <div className="flex justify-center space-x-1 h-8 pointer-events-none">
                                    <div className="w-1/4 rounded" style={{ backgroundColor: themeColors[theme.id]?.primary || '#ccc' }}></div>
                                    <div className="w-1/4 rounded" style={{ backgroundColor: themeColors[theme.id]?.secondary || '#ccc' }}></div>
                                    <div className="w-1/4 rounded" style={{ backgroundColor: themeColors[theme.id]?.accent || '#ccc' }}></div>
                                    <div className="w-1/4 rounded" style={{ backgroundColor: themeColors[theme.id]?.background || '#ccc' }}></div>
                                </div>
                                <p className="font-semibold text-center mt-2 text-slate-700 pointer-events-none">{theme.name}</p>
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-[rgb(var(--color-border-rgb))]">
                        <h3 className="font-bold mb-2">Admin UI Tools</h3>
                        <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold">Live Purchase Notifier</h4>
                                    <p className="text-xs text-[rgb(var(--color-text-muted-rgb))]">Show/hide the social proof pop-up for your admin session.</p>
                                </div>
                                <label htmlFor="toggle-notifications" className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            id="toggle-notifications"
                                            className="sr-only"
                                            checked={showNotifications}
                                            onChange={() => setShowNotifications(prev => !prev)} />
                                        <div className={`block w-14 h-8 rounded-full ${showNotifications ? 'bg-[rgb(var(--color-primary-rgb))]' : 'bg-slate-600'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showNotifications ? 'transform translate-x-6' : ''}`}></div>
                                    </div>
                                </label>
                            </div>
                        </div>
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
