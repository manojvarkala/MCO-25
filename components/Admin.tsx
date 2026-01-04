import React, { FC, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { useAppContext } from '../context/AppContext.tsx';
import type { ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';
import { CheckCircle, XCircle, Cpu, FileSpreadsheet, RefreshCw, BarChart3, ShoppingCart, DollarSign, FileText, Paintbrush, DatabaseZap, Trash2, DownloadCloud } from 'lucide-react';

interface HealthStatus {
    api_connection?: { success: boolean; message: string; data?: any };
    jwt_secret?: { success: boolean; message: string; data?: any };
    woocommerce?: { success: boolean; message: string; data?: any };
    wc_subscriptions?: { success: boolean; message: string; data?: any };
    app_url_config?: { success: boolean; message: string; data?: any };
    google_sheet?: { success: boolean; message: string; data?: any };
    nonces?: { [key: string]: string };
}

const HealthListItem: FC<{ title: string; status?: { success: boolean; message: string; data?: any }; onDetails: (data: any) => void }> = ({ title, status, onDetails }) => {
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
    const { activeOrg, activeTheme, setActiveTheme, availableThemes } = useAppContext();
    const { token } = useAuth();
    const [isGeneratingWooCsv, setIsGeneratingWooCsv] = useState(false);
    const [isGeneratingProgramsCsv, setIsGeneratingProgramsCsv] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [detailsModalData, setDetailsModalData] = useState<any>(null);

    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [examStats, setExamStats] = useState<ExamStat[] | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dataLoadError, setDataLoadError] = useState<string | null>(null);

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
            toast.success(result.message);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsClearingCache(false);
        }
    };

    return (
        <div className="space-y-8">
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

            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">System Administration</h1>

            {dataLoadError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-red-700 text-sm">
                    <strong>Connection Issue:</strong> {dataLoadError}. Ensure your backend is configured and your token is valid.
                </div>
            )}

            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold flex items-center mb-6">
                    <Cpu className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    Production Health Audit
                </h2>
                <div className="space-y-2">
                    <HealthListItem title="REST API Integration" status={healthStatus?.api_connection} onDetails={setDetailsModalData} />
                    <HealthListItem title="JWT Security Secret" status={healthStatus?.jwt_secret} onDetails={setDetailsModalData} />
                    <HealthListItem title="WooCommerce Core" status={healthStatus?.woocommerce} onDetails={setDetailsModalData} />
                    <HealthListItem title="Recurring Subscriptions" status={healthStatus?.wc_subscriptions} onDetails={setDetailsModalData} />
                    <HealthListItem title="Dynamic App Routing" status={healthStatus?.app_url_config} onDetails={setDetailsModalData} />
                    <HealthListItem title="External Question Sync" status={healthStatus?.google_sheet} onDetails={setDetailsModalData} />
                </div>
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold flex items-center mb-6">
                    <BarChart3 className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    Performance Aggregate
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Total Exam Sales" value={summaryStats.totalSales} icon={<ShoppingCart className="text-[rgb(var(--color-primary-rgb))]" />} />
                    <StatCard title="Est. Gross Revenue" value={`$${summaryStats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="text-[rgb(var(--color-primary-rgb))]" />} />
                    <StatCard title="All-Time Attempts" value={summaryStats.totalAttempts} icon={<FileText className="text-[rgb(var(--color-primary-rgb))]" />} />
                </div>
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold flex items-center mb-4">
                    <DatabaseZap className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    Industrial Data Utilities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                        <h3 className="font-bold mb-2">Global Config</h3>
                        <button onClick={() => handleCacheClear('config')} disabled={isClearingCache} className="w-full py-2 bg-blue-600 text-white rounded font-bold">Clear Cache</button>
                    </div>
                    <div className="p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg">
                        <h3 className="font-bold mb-2">Question Sheets</h3>
                        <button onClick={() => handleCacheClear('questions')} disabled={isClearingCache} className="w-full py-2 bg-blue-600 text-white rounded font-bold">Flush Transient</button>
                    </div>
                    <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg">
                        <h3 className="font-bold text-red-200 mb-2">Permanent Results</h3>
                        <button onClick={() => handleCacheClear('results')} disabled={isClearingCache} className="w-full py-2 bg-red-600 text-white rounded font-bold">Purge All</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;