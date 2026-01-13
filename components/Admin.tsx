import React, { FC, useState, useEffect, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ExamStat, Theme } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { 
    CheckCircle, XCircle, Cpu, FileSpreadsheet, RefreshCw, BarChart3, 
    Settings2, DatabaseZap, DownloadCloud, ToggleLeft, 
    ToggleRight, Search, Activity, LayoutDashboard, ShieldAlert, Palette, Check, ExternalLink
} from 'lucide-react';

interface HealthStatus {
    api_connection?: { success: boolean; message: string };
    jwt_secret?: { success: boolean; message: string };
    woocommerce?: { success: boolean; message: string };
    wc_subscriptions?: { success: boolean; message: string };
    app_url_config?: { success: boolean; message: string };
    sheet_accessibility?: { success: boolean; message: string };
}

type AdminTab = 'diagnostics' | 'appearance' | 'content' | 'bulk';

const NavItem: FC<{ id: AdminTab; label: string; icon: ReactNode; active: boolean; onClick: (id: AdminTab) => void }> = ({ id, label, icon, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm w-full text-left ${
            active ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
        }`}
    >
        {icon} {label}
    </button>
);

const HealthCard: FC<{ title: string; status?: { success: boolean; message: string } }> = ({ title, status }) => (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
            {!status ? <RefreshCw size={20} className="text-cyan-500 animate-spin flex-shrink-0" /> : status.success ? <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} /> : <XCircle className="text-rose-500 flex-shrink-0" size={20} />}
            <span className="font-bold text-slate-100 truncate">{title}</span>
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded ml-2 whitespace-nowrap ${!status ? 'bg-slate-800 text-slate-400' : status.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {!status ? 'CHECKING...' : status.message.toUpperCase()}
        </span>
    </div>
);

const THEME_COLORS: Record<string, string[]> = {
    default: ['#06b6d4', '#db2777', '#fde047', '#0f172a'],
    professional: ['#047857', '#3b82f6', '#eab308', '#f1f5f9'],
    serene: ['#60a5fa', '#34d399', '#fb923c', '#f0fdfa'],
    academic: ['#7f1d1d', '#a16207', '#d97706', '#fafaf9'],
    noir: ['#e5e7eb', '#8b5cf6', '#eab308', '#1f2937']
};

const Admin: FC = () => {
    const { token } = useAuth();
    const { activeOrg, availableThemes, activeTheme, refreshConfig } = useAppContext();
    const [activeTab, setActiveTab] = useState<AdminTab>('diagnostics');
    
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [stats, setStats] = useState<ExamStat[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const [localSettings, setLocalSettings] = useState({
        purchaseNotifierEnabled: activeOrg?.purchaseNotifierEnabled ?? true,
        bundlesEnabled: activeOrg?.bundlesEnabled ?? true,
        subscriptionsEnabled: activeOrg?.subscriptionsEnabled ?? true,
        activeThemeId: activeTheme
    });
    
    const [testUrl, setTestUrl] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

    const loadData = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [h, s] = await Promise.all([
                googleSheetsService.adminGetSystemStatus(token),
                googleSheetsService.getExamStats(token)
            ]);
            setHealth(h);
            setStats(s);
        } catch (e: any) {
            toast.error(e.message || "Diagnostics call failed.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [token]);

    const handleSyncSettings = async (updates: Partial<typeof localSettings>) => {
        if (!token) return;
        setIsSavingSettings(true);
        const tid = toast.loading("Syncing settings...");
        try {
            const newSettings = { ...localSettings, ...updates };
            await googleSheetsService.adminUpdateGlobalSettings(token, newSettings);
            setLocalSettings(newSettings);
            await refreshConfig();
            toast.success("Settings saved!", { id: tid });
        } catch (e: any) {
            toast.error(e.message || "Failed to save", { id: tid });
        } finally {
            setIsSavingSettings(false);
        }
    };

    const runSheetTest = async () => {
        if (!testUrl || !token) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await googleSheetsService.adminTestSheetUrl(token, testUrl);
            setTestResult(res);
            if (res.success) toast.success("Access verified!");
            else toast.error("Sheet inaccessible");
        } catch (e: any) { setTestResult({ success: false, message: e.message }); }
        finally { setIsTesting(false); }
    };

    const flushCache = async () => {
        if (!token) return;
        const tid = toast.loading("Purging server cache...");
        try {
            await googleSheetsService.adminClearConfigCache(token);
            await refreshConfig();
            toast.success("Cache flushed!", { id: tid });
            loadData();
        } catch (e: any) { toast.error(e.message, { id: tid }); }
    };

    const flushSheets = async () => {
        if (!token) return;
        const tid = toast.loading("Purging spreadsheet cache...");
        try {
            await googleSheetsService.adminClearQuestionCaches(token);
            toast.success("Sheet cache cleared!", { id: tid });
        } catch (e: any) { toast.error(e.message, { id: tid }); }
    };

    if (isLoading && !health) return <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-mono"><Spinner size="lg" className="mb-4"/><p>Probing Infrastructure...</p></div>;

    return (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-20">
            <aside className="lg:w-64 flex flex-col gap-2">
                <NavItem id="diagnostics" label="Diagnostics" icon={<Activity size={18}/>} active={activeTab === 'diagnostics'} onClick={setActiveTab} />
                <NavItem id="appearance" label="Platform Design" icon={<Palette size={18}/>} active={activeTab === 'appearance'} onClick={setActiveTab} />
                <NavItem id="content" label="Sheet Validator" icon={<FileSpreadsheet size={18}/>} active={activeTab === 'content'} onClick={setActiveTab} />
                <NavItem id="bulk" label="Maintenance" icon={<DatabaseZap size={18}/>} active={activeTab === 'bulk'} onClick={setActiveTab} />
            </aside>

            <main className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'diagnostics' && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-black mb-6 flex items-center gap-3 text-slate-100"><Cpu className="text-cyan-500" /> Platform Audit</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <HealthCard title="Backend API" status={health?.api_connection} />
                                <HealthCard title="Security Salt" status={health?.jwt_secret} />
                                <HealthCard title="WooCommerce" status={health?.woocommerce} />
                                <HealthCard title="Subscriptions" status={health?.wc_subscriptions} />
                                <HealthCard title="App URL Config" status={health?.app_url_config} />
                                <HealthCard title="Sheet Access" status={health?.sheet_accessibility} />
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-100"><BarChart3 size={20} className="text-cyan-500" /> Key Metrics</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Sales</p>
                                    <p className="text-4xl font-black mt-1 text-white">{stats?.reduce((acc, s) => acc + (s.totalSales || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Est. Revenue</p>
                                    <p className="text-4xl font-black mt-1 text-emerald-400">${stats?.reduce((acc, s) => acc + (s.totalRevenue || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Exam Attempts</p>
                                    <p className="text-4xl font-black mt-1 text-cyan-400">{stats?.reduce((acc, s) => acc + (s.attempts || 0), 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black flex items-center gap-3 text-slate-100"><Settings2 className="text-cyan-500" /> Global Feature Toggles</h2>
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-xl">
                                {[
                                    { id: 'purchaseNotifierEnabled', label: 'Purchase Notifier', desc: 'Real-time social proof popups' },
                                    { id: 'subscriptionsEnabled', label: 'Subscription Core', desc: 'Monthly/Yearly access recurring logic' },
                                    { id: 'bundlesEnabled', label: 'Product Bundles', desc: 'Enables "Addon" bundle offers on program pages' }
                                ].map(f => (
                                    <div key={f.id} className="flex items-center justify-between p-6 bg-slate-900 hover:bg-slate-800/50 transition-colors">
                                        <div><p className="font-bold text-slate-100">{f.label}</p><p className="text-xs text-slate-500 italic mt-1">{f.desc}</p></div>
                                        <button 
                                            onClick={() => handleSyncSettings({ [f.id]: !(localSettings as any)[f.id] })}
                                            disabled={isSavingSettings}
                                            className={`transition-all transform active:scale-95 ${ (localSettings as any)[f.id] ? 'text-cyan-500' : 'text-slate-600'}`}
                                        >
                                            { (localSettings as any)[f.id] ? <ToggleRight size={44} strokeWidth={1.5}/> : <ToggleLeft size={44} strokeWidth={1.5}/>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-3xl font-black flex items-center gap-3 text-slate-100"><Palette className="text-cyan-500" /> Site Branding Theme</h2>
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-xl">
                                <p className="text-slate-400 mb-8 font-medium">Select the global visual style for the frontend portal.</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                    {(availableThemes || []).map(theme => {
                                        const isActive = localSettings.activeThemeId === theme.id;
                                        const colors = THEME_COLORS[theme.id] || ['#444','#333','#222','#111'];
                                        return (
                                            <button
                                                key={theme.id}
                                                onClick={() => handleSyncSettings({ activeThemeId: theme.id })}
                                                disabled={isSavingSettings}
                                                className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${
                                                    isActive 
                                                        ? 'bg-cyan-500/10 border-cyan-500 ring-4 ring-cyan-500/20' 
                                                        : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                                                }`}
                                            >
                                                {isActive && <div className="absolute -top-3 -right-3 bg-cyan-500 text-white rounded-full p-1.5 shadow-lg"><Check size={16} strokeWidth={4}/></div>}
                                                <div className="flex w-full h-10 rounded-lg overflow-hidden shadow-2xl border border-slate-800">
                                                    {colors.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }}></div>)}
                                                </div>
                                                <span className={`font-black text-xs uppercase tracking-widest ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>{theme.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black flex items-center gap-3 text-slate-100"><FileSpreadsheet className="text-cyan-500" /> Question Dataset Link</h2>
                        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-xl">
                            <p className="text-slate-300 mb-6 font-bold">Input a Google Sheet URL to verify server-side fetchability.</p>
                            <div className="flex gap-4">
                                <input 
                                    type="url" 
                                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                                    value={testUrl}
                                    onChange={e => setTestUrl(e.target.value)}
                                />
                                <button onClick={runSheetTest} disabled={isTesting || !testUrl} className="px-10 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-xl transition flex items-center gap-2 shadow-lg disabled:opacity-50">
                                    {isTesting ? <RefreshCw className="animate-spin" size={20}/> : <Search size={20}/>} Test
                                </button>
                            </div>
                            {testResult && (
                                <div className={`mt-8 p-6 rounded-xl border flex items-center gap-4 ${testResult.success ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}>
                                    {testResult.success ? <CheckCircle size={28}/> : <ShieldAlert size={28}/>}
                                    <div>
                                        <p className="font-black text-lg">{testResult.success ? 'CONNECTION SUCCESS' : 'CONNECTION FAILED'}</p>
                                        <p className="text-sm opacity-80 mt-1 font-mono">{testResult.message}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'bulk' && (
                    <div className="space-y-8">
                         <h2 className="text-3xl font-black flex items-center gap-3 text-slate-100"><DatabaseZap className="text-cyan-500" /> Platform Maintenance</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-xl">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-100"><LayoutDashboard size={20} className="text-cyan-400"/> Cache Management</h3>
                                <div className="space-y-4">
                                    <button onClick={flushCache} className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 flex items-center justify-center gap-3 transition shadow-md">
                                        <RefreshCw size={18}/> Flush Global App Cache
                                    </button>
                                    <button onClick={flushSheets} className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 flex items-center justify-center gap-3 transition shadow-md">
                                        <FileSpreadsheet size={18}/> Wipe Spreadsheet Cache
                                    </button>
                                    <button onClick={() => { if(confirm("PERMANENTLY erase all historical results for ALL users?")) googleSheetsService.adminClearAllResults(token!) }} className="w-full py-4 bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 font-bold rounded-xl border border-rose-900/30 transition">
                                        Wipe All User Data
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-100"><DownloadCloud size={20} className="text-cyan-400"/> Data Portability</h3>
                                <div className="space-y-3 flex-1">
                                    <a href="/template-exam-programs.csv" download className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 transition text-sm text-slate-300">
                                        <span>Download Program CSV Template</span>
                                        <ExternalLink size={14}/>
                                    </a>
                                    <a href="/template-recommended-books.csv" download className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 transition text-sm text-slate-300">
                                        <span>Download Book CSV Template</span>
                                        <ExternalLink size={14}/>
                                    </a>
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