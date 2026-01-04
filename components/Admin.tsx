import React, { FC, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { 
    CheckCircle, XCircle, Cpu, FileSpreadsheet, RefreshCw, BarChart3, 
    Settings2, DatabaseZap, FileUp, DownloadCloud, ToggleLeft, 
    ToggleRight, Search, Activity, LayoutDashboard, ShieldAlert
} from 'lucide-react';

interface HealthStatus {
    api_connection?: { success: boolean; message: string };
    jwt_secret?: { success: boolean; message: string };
    woocommerce?: { success: boolean; message: string };
    wc_subscriptions?: { success: boolean; message: string };
    app_url_config?: { success: boolean; message: string };
}

type AdminTab = 'diagnostics' | 'appearance' | 'content' | 'bulk';

const NavItem: FC<{ id: AdminTab; label: string; icon: ReactNode; active: boolean; onClick: (id: AdminTab) => void }> = ({ id, label, icon, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm ${
            active ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
        }`}
    >
        {icon} {label}
    </button>
);

const HealthCard: FC<{ title: string; status?: { success: boolean; message: string } }> = ({ title, status }) => (
    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
            {!status ? <Spinner size="sm" className="text-cyan-500" /> : status.success ? <CheckCircle className="text-emerald-500" size={20} /> : <XCircle className="text-rose-500" size={20} />}
            <span className="font-bold text-slate-200">{title}</span>
        </div>
        <span className={`text-xs font-mono px-2 py-1 rounded ${!status ? 'bg-slate-800' : status.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {!status ? 'WAIT' : status.message.toUpperCase()}
        </span>
    </div>
);

const Admin: FC = () => {
    const { token } = useAuth();
    const { activeOrg, availableThemes, activeTheme, refreshConfig } = useAppContext();
    const [activeTab, setActiveTab] = useState<AdminTab>('diagnostics');
    
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [stats, setStats] = useState<ExamStat[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Feature States
    const [localSettings, setLocalSettings] = useState({
        purchaseNotifierEnabled: activeOrg?.purchaseNotifierEnabled ?? true,
        bundlesEnabled: activeOrg?.bundlesEnabled ?? true,
        subscriptionsEnabled: activeOrg?.subscriptionsEnabled ?? true,
        activeThemeId: activeTheme
    });
    
    // Sheet Checker
    const [testUrl, setTestUrl] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

    useEffect(() => {
        if (!token) return;
        const load = async () => {
            try {
                const [h, s] = await Promise.all([
                    googleSheetsService.adminGetSystemStatus(token),
                    googleSheetsService.getExamStats(token)
                ]);
                setHealth(h);
                setStats(s);
            } catch (e) {
                toast.error("Security session expired. Please re-login.");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [token]);

    const handleSyncSettings = async (updates: Partial<typeof localSettings>) => {
        if (!token) return;
        const next = { ...localSettings, ...updates };
        setLocalSettings(next);
        try {
            await googleSheetsService.adminUpdateGlobalSettings(token, next);
            await refreshConfig();
            toast.success("Industrial settings synced to backend");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const runSheetTest = async () => {
        if (!testUrl || !token) return;
        setIsTesting(true);
        try {
            const res = await googleSheetsService.adminTestSheetUrl(token, testUrl);
            setTestResult(res);
        } catch (e: any) {
            setTestResult({ success: false, message: e.message });
        } finally {
            setIsTesting(false);
        }
    };

    if (isLoading) return <div className="flex flex-col items-center justify-center py-20"><Spinner size="lg" /><p className="mt-4 font-mono text-cyan-500">Initializing Admin Hub...</p></div>;

    return (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 pb-20">
            {/* --- SIDEBAR NAV --- */}
            <aside className="lg:w-64 space-y-2">
                <NavItem id="diagnostics" label="Diagnostics" icon={<Activity size={18}/>} active={activeTab === 'diagnostics'} onClick={setActiveTab} />
                <NavItem id="appearance" label="UI & Styling" icon={<Settings2 size={18}/>} active={activeTab === 'appearance'} onClick={setActiveTab} />
                <NavItem id="content" label="Sheet Tools" icon={<FileSpreadsheet size={18}/>} active={activeTab === 'content'} onClick={setActiveTab} />
                <NavItem id="bulk" label="Bulk Center" icon={<DatabaseZap size={18}/>} active={activeTab === 'bulk'} onClick={setActiveTab} />
                <div className="mt-10 p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Production Server</p>
                    <p className="text-xs text-cyan-400 mt-1 truncate">{activeOrg?.website}</p>
                </div>
            </aside>

            {/* --- MAIN HUB --- */}
            <main className="flex-1 space-y-8">
                {activeTab === 'diagnostics' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-3xl font-extrabold mb-6 flex items-center gap-3"><Cpu className="text-cyan-500" /> Production Health Audit</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <HealthCard title="REST API Gateway" status={health?.api_connection} />
                            <HealthCard title="JWT Signature Core" status={health?.jwt_secret} />
                            <HealthCard title="WooCommerce Logic" status={health?.woocommerce} />
                            <HealthCard title="Recurring Engine" status={health?.wc_subscriptions} />
                        </div>
                        <div className="mt-10 bg-slate-900 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-cyan-500" /> Key Performance Indicators</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="p-4 bg-slate-800 rounded-xl">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Total Sales</p>
                                    <p className="text-3xl font-black mt-1 text-white">{stats?.reduce((acc, s) => acc + (s.totalSales || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-slate-800 rounded-xl">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Est. Revenue</p>
                                    <p className="text-3xl font-black mt-1 text-emerald-400">${stats?.reduce((acc, s) => acc + (s.totalRevenue || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-slate-800 rounded-xl">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Exam Attempts</p>
                                    <p className="text-3xl font-black mt-1 text-cyan-400">{stats?.reduce((acc, s) => acc + (s.attempts || 0), 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-extrabold mb-6 flex items-center gap-3"><Settings2 className="text-cyan-500" /> Appearance & Feature Hub</h2>
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
                                    <div><p className="font-bold">Purchase Notifier</p><p className="text-xs text-slate-400 italic">Simulated social proof popups</p></div>
                                    <button onClick={() => handleSyncSettings({ purchaseNotifierEnabled: !localSettings.purchaseNotifierEnabled })} className="text-cyan-500">
                                        {localSettings.purchaseNotifierEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-slate-600" />}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
                                    <div><p className="font-bold">Bundle Engine</p><p className="text-xs text-slate-400 italic">Package Certs with Subscriptions</p></div>
                                    <button onClick={() => handleSyncSettings({ bundlesEnabled: !localSettings.bundlesEnabled })} className="text-cyan-500">
                                        {localSettings.bundlesEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-slate-600" />}
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-800/50 border-t border-slate-700">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-4">Active Brand Theme</p>
                                <div className="flex flex-wrap gap-2">
                                    {availableThemes.map(t => (
                                        <button key={t.id} onClick={() => handleSyncSettings({ activeThemeId: t.id })} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${localSettings.activeThemeId === t.id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                            {t.name.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-extrabold mb-6 flex items-center gap-3"><FileSpreadsheet className="text-cyan-500" /> Google Sheet URL Validator</h2>
                        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700">
                            <p className="text-slate-400 mb-6">Verify if your question dataset is public and formatted correctly as CSV before assigning it to a program.</p>
                            <div className="flex gap-3">
                                <input 
                                    type="url" 
                                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                                    value={testUrl}
                                    onChange={e => setTestUrl(e.target.value)}
                                />
                                <button onClick={runSheetTest} disabled={isTesting || !testUrl} className="px-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition flex items-center gap-2">
                                    {isTesting ? <RefreshCw className="animate-spin" size={20}/> : <Search size={20}/>} {isTesting ? 'Validating...' : 'Validate'}
                                </button>
                            </div>
                            {testResult && (
                                <div className={`mt-6 p-4 rounded-xl flex items-center gap-4 ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                    {testResult.success ? <CheckCircle size={24}/> : <ShieldAlert size={24}/>}
                                    <div>
                                        <p className="font-bold">{testResult.success ? 'Endpoint Verified' : 'Validation Failed'}</p>
                                        <p className="text-xs opacity-70">{testResult.message}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'bulk' && (
                    <div className="space-y-6">
                         <h2 className="text-3xl font-extrabold mb-6 flex items-center gap-3"><FileUp className="text-cyan-500" /> Industrial Bulk Center</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 flex flex-col">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><DownloadCloud size={20} className="text-cyan-400"/> Templates</h3>
                                <div className="space-y-2 flex-1">
                                    <a href="/template-exam-programs.csv" download className="block p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">Exam Program Import Schema</a>
                                    <a href="/template-recommended-books.csv" download className="block p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">Library & Store Import Schema</a>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LayoutDashboard size={20} className="text-cyan-400"/> System Purge</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <button onClick={() => googleSheetsService.adminClearConfigCache(token!)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700">Flush Config Cache</button>
                                    <button onClick={() => googleSheetsService.adminClearAllResults(token!)} className="w-full py-3 bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 font-bold rounded-xl border border-rose-900/50">Wipe All Test Results</button>
                                </div>
                            </div>
                         </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Admin;