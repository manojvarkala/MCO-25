import React, { FC, useState, useCallback, ReactNode, useEffect, useMemo, useRef } from 'react';
import { Link } from "react-router-dom";
import { useAppContext } from '../context/AppContext.tsx';
import type { ExamStat, Theme } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';
import { CheckCircle, XCircle, Cpu, FileSpreadsheet, RefreshCw, BarChart3, ShoppingCart, DollarSign, FileText, Paintbrush, DatabaseZap, Trash2, DownloadCloud, ToggleLeft, ToggleRight, Search, FileUp, Settings2 } from 'lucide-react';

interface HealthStatus {
    api_connection?: { success: boolean; message: string; data?: any };
    jwt_secret?: { success: boolean; message: string; data?: any };
    woocommerce?: { success: boolean; message: string; data?: any };
    wc_subscriptions?: { success: boolean; message: string; data?: any };
    app_url_config?: { success: boolean; message: string; data?: any };
    google_sheet?: { success: boolean; message: string; data?: any };
}

const HealthListItem: FC<{ title: string; status?: { success: boolean; message: string; data?: any }; onDetails?: (data: any) => void }> = ({ title, status, onDetails }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
            <div className="flex items-center gap-3">
                { !status ? (
                    <Spinner size="sm" className="animate-spin text-[rgb(var(--color-text-muted-rgb))]" />
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
                {status?.data && onDetails && (
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
    const { token } = useAuth();
    const { activeOrg, availableThemes, activeTheme, refreshConfig } = useAppContext();
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [detailsModalData, setDetailsModalData] = useState<any>(null);

    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [examStats, setExamStats] = useState<ExamStat[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dataLoadError, setDataLoadError] = useState<string | null>(null);

    // Feature Toggle States
    const [localSettings, setLocalSettings] = useState({
        subscriptionsEnabled: activeOrg?.subscriptionsEnabled ?? true,
        bundlesEnabled: activeOrg?.bundlesEnabled ?? true,
        purchaseNotifierEnabled: activeOrg?.purchaseNotifierEnabled ?? true,
        activeThemeId: activeTheme
    });
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

    // Sheet Checker State
    const [testSheetUrl, setTestSheetUrl] = useState('');
    const [isTestingSheet, setIsTestingSheet] = useState(false);
    const [sheetTestResult, setSheetTestResult] = useState<{success: boolean, message: string} | null>(null);

    useEffect(() => {
        if (activeOrg) {
            setLocalSettings({
                subscriptionsEnabled: activeOrg.subscriptionsEnabled ?? true,
                bundlesEnabled: activeOrg.bundlesEnabled ?? true,
                purchaseNotifierEnabled: activeOrg.purchaseNotifierEnabled ?? true,
                activeThemeId: activeTheme
            });
        }
    }, [activeOrg, activeTheme]);

    useEffect(() => {
        if (!token) return;
        const fetchAdminData = async () => {
            setIsLoadingData(true);
            setDataLoadError(null);
            try {
                const [status, stats] = await Promise.all([
                    googleSheetsService.adminGetSystemStatus(token),
                    googleSheetsService.getExamStats(token)
                ]);
                setHealthStatus(status);
                setExamStats(stats);
            } catch (error: any) {
                console.error("Admin data load error:", error);
                setDataLoadError(error.message || 'Authentication error.');
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchAdminData();
    }, [token]);

    const summaryStats = useMemo(() => {
        if (!examStats) return { totalSales: 0, totalRevenue: 0, totalAttempts: 0 };
        return examStats.reduce((acc, stat) => {
            acc.totalSales += stat.totalSales || 0;
            acc.totalRevenue += stat.totalRevenue || 0;
            acc.totalAttempts += stat.attempts || 0;
            return acc;
        }, { totalSales: 0, totalRevenue: 0, totalAttempts: 0 });
    }, [examStats]);

    const handleCacheClear = async (action: 'config' | 'questions' | 'results') => {
        if (!token) return;
        let apiCall;
        switch(action) {
            case 'config': apiCall = googleSheetsService.adminClearConfigCache; break;
            case 'questions': apiCall = googleSheetsService.adminClearQuestionCaches; break;
            case 'results':
                if (!window.confirm("Permanent delete all results?")) return;
                apiCall = googleSheetsService.adminClearAllResults;
                break;
            default: return;
        }
        setIsClearingCache(true);
        try {
            const result = await apiCall(token);
            toast.success(result.message || "Operation successful");
        } catch (error: any) {
            toast.error(error.message || "Action failed");
        } finally {
            setIsClearingCache(false);
        }
    };

    const handleSettingToggle = async (key: keyof typeof localSettings) => {
        if (!token) return;
        const nextVal = !localSettings[key];
        const updated = { ...localSettings, [key]: nextVal };
        setLocalSettings(updated);
        setIsUpdatingSettings(true);
        try {
            await googleSheetsService.adminUpdateGlobalSettings(token, updated);
            await refreshConfig();
            toast.success("Settings synchronized with WordPress");
        } catch (e: any) {
            toast.error(e.message);
            setLocalSettings({ ...localSettings }); // rollback
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    const handleThemeChange = async (themeId: string) => {
        if (!token) return;
        const updated = { ...localSettings, activeThemeId: themeId };
        setLocalSettings(updated);
        setIsUpdatingSettings(true);
        try {
            await googleSheetsService.adminUpdateGlobalSettings(token, updated);
            await refreshConfig();
            toast.success(`Default theme set to ${themeId}`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    const runSheetTest = async () => {
        if (!testSheetUrl || !token) return;
        setIsTestingSheet(true);
        setSheetTestResult(null);
        try {
            const res = await googleSheetsService.adminTestSheetUrl(token, testSheetUrl);
            setSheetTestResult(res);
        } catch (e: any) {
            setSheetTestResult({ success: false, message: e.message });
        } finally {
            setIsTestingSheet(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {detailsModalData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[rgb(var(--color-card-rgb))] rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-[rgb(var(--color-border-rgb))]">
                            <h2 className="font-bold text-lg">Check Details</h2>
                        </div>
                        <div className="p-4 overflow-auto">
                            <pre className="text-xs bg-[rgb(var(--color-muted-rgb))] p-2 rounded whitespace-pre-wrap">{JSON.stringify(detailsModalData, null, 2)}</pre>
                        </div>
                        <div className="p-4 border-t border-[rgb(var(--color-border-rgb))] text-right">
                            <button onClick={() => setDetailsModalData(null)} className="px-4 py-2 bg-slate-200 rounded-lg font-semibold">Close</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">System Administration</h1>
                <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                    ADMIN VERIFIED
                </div>
            </div>

            {dataLoadError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-red-700 text-sm">
                    <strong>Connection Issue:</strong> {dataLoadError}. Ensure your backend is configured and your token is valid.
                </div>
            )}

            {/* --- TOP ROW: HEALTH & STATS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-xl font-bold flex items-center mb-6">
                        <Cpu className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Production Health Audit
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <HealthListItem title="REST API" status={healthStatus?.api_connection} />
                        <HealthListItem title="JWT Security" status={healthStatus?.jwt_secret} />
                        <HealthListItem title="WooCommerce" status={healthStatus?.woocommerce} />
                        <HealthListItem title="Subscriptions" status={healthStatus?.wc_subscriptions} />
                    </div>
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] flex flex-col justify-center">
                    <h2 className="text-lg font-bold flex items-center mb-4">
                        <BarChart3 className="mr-2 text-[rgb(var(--color-primary-rgb))]" />
                        Revenue Snapshot
                    </h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Total Sales</span>
                            <span className="font-bold">{summaryStats.totalSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Gross Rev</span>
                            <span className="font-bold text-green-400">${summaryStats.totalRevenue.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ROW 2: APPEARANCE & UI TOOLS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold flex items-center mb-6">
                        <Settings2 className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Appearance & UI Settings
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                            <div>
                                <p className="font-semibold">Purchase Notifier</p>
                                <p className="text-xs text-slate-400">Toggle live social proof popups</p>
                            </div>
                            <button onClick={() => handleSettingToggle('purchaseNotifierEnabled')}>
                                {localSettings.purchaseNotifierEnabled ? <ToggleRight className="text-green-500" size={32} /> : <ToggleLeft className="text-slate-500" size={32} />}
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                            <div>
                                <p className="font-semibold">Bundle System</p>
                                <p className="text-xs text-slate-400">Enable Exam + Sub packages</p>
                            </div>
                            <button onClick={() => handleSettingToggle('bundlesEnabled')}>
                                {localSettings.bundlesEnabled ? <ToggleRight className="text-green-500" size={32} /> : <ToggleLeft className="text-slate-500" size={32} />}
                            </button>
                        </div>
                        <div className="pt-4">
                            <p className="text-sm font-bold mb-3 uppercase tracking-wider text-slate-500">Default Global Theme</p>
                            <div className="flex gap-2 flex-wrap">
                                {availableThemes.map(t => (
                                    <button 
                                        key={t.id} 
                                        onClick={() => handleThemeChange(t.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${localSettings.activeThemeId === t.id ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold flex items-center mb-6">
                        <FileSpreadsheet className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Google Sheet URL Checker
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">Validate if your Question Sheet is properly "Published to Web" as CSV.</p>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="url" 
                            placeholder="https://docs.google.com/spreadsheets/d/..." 
                            className="flex-grow p-3 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:border-cyan-500 outline-none"
                            value={testSheetUrl}
                            onChange={e => setTestSheetUrl(e.target.value)}
                        />
                        <button 
                            onClick={runSheetTest}
                            disabled={isTestingSheet || !testSheetUrl}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white p-3 rounded-lg flex items-center gap-2 font-bold disabled:opacity-50"
                        >
                            {isTestingSheet ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                            Test
                        </button>
                    </div>
                    {sheetTestResult && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${sheetTestResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {sheetTestResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            <div>
                                <p className="font-bold">{sheetTestResult.success ? 'Accessible' : 'Link Failed'}</p>
                                <p className="text-xs opacity-80">{sheetTestResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ROW 3: BULK DATA & MAINTENANCE --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold flex items-center mb-6">
                        <FileUp className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Bulk Data Management
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-[rgb(var(--color-muted-rgb))] rounded-xl border border-slate-700">
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Templates</p>
                            <div className="space-y-2">
                                <a href="/template-exam-programs.csv" download className="block text-sm text-cyan-400 hover:underline flex items-center gap-2">
                                    <DownloadCloud size={14} /> Exam Programs CSV
                                </a>
                                <a href="/template-recommended-books.csv" download className="block text-sm text-cyan-400 hover:underline flex items-center gap-2">
                                    <DownloadCloud size={14} /> Book Store CSV
                                </a>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 flex flex-col justify-center text-center">
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Import Hub</p>
                            <button className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-bold transition">
                                Launch WP Import
                            </button>
                            <p className="text-[10px] text-slate-500 mt-2 italic">Redirects to WordPress CSV Suite</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold flex items-center mb-4">
                        <DatabaseZap className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Industrial Admin UI Tools
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase">App Cache</h3>
                            <button onClick={() => handleCacheClear('config')} disabled={isClearingCache} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs">Flush Config</button>
                        </div>
                        <div className="p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                             <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase">Sheet Data</h3>
                            <button onClick={() => handleCacheClear('questions')} disabled={isClearingCache} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs">Purge Sheets</button>
                        </div>
                        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                            <h3 className="text-xs font-bold text-red-300 mb-2 uppercase">Wipe Results</h3>
                            <button onClick={() => handleCacheClear('results')} disabled={isClearingCache} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs">Wipe Database</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;