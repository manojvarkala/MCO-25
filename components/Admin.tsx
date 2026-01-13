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
    ToggleRight, Activity, Palette, Check, ExternalLink, ShieldAlert
} from 'lucide-react';

interface HealthStatus {
    api_connection?: { success: boolean; message: string };
    jwt_secret?: { success: boolean; message: string };
    woocommerce?: { success: boolean; message: string };
    wc_subscriptions?: { success: boolean; message: string };
    app_url_config?: { success: boolean; message: string };
    sheet_accessibility?: { success: boolean; message: string };
}

type AdminTab = 'diagnostics' | 'appearance' | 'bulk';

const NavItem: FC<{ id: AdminTab; label: string; icon: ReactNode; active: boolean; onClick: (id: AdminTab) => void }> = ({ id, label, icon, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm w-full text-left ${
            active ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
        }`}
    >
        {icon} {label}
    </button>
);

const HealthCard: FC<{ title: string; status?: { success: boolean; message: string } }> = ({ title, status }) => (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
            {!status ? (
                <RefreshCw size={20} className="text-cyan-500 animate-spin flex-shrink-0" />
            ) : status.success ? (
                <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />
            ) : (
                <XCircle className="text-rose-500 flex-shrink-0" size={20} />
            )}
            <span className="font-bold text-white truncate">{title}</span>
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded ml-2 whitespace-nowrap ${!status ? 'bg-slate-800 text-slate-400' : status.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {!status ? 'POLLING...' : status.message.toUpperCase()}
        </span>
    </div>
);

const Admin: FC = () => {
    const { token } = useAuth();
    const { activeOrg, availableThemes, activeTheme, refreshConfig } = useAppContext();
    
    // PERSISTENCE FIX: Save active tab to session storage so saves don't reset view to Diagnostics
    const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
        return (sessionStorage.getItem('mco_admin_active_tab') as AdminTab) || 'diagnostics';
    });

    const setActiveTab = (tab: AdminTab) => {
        setActiveTabState(tab);
        sessionStorage.setItem('mco_admin_active_tab', tab);
    };
    
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

    useEffect(() => {
        if (activeOrg) {
            setLocalSettings({
                purchaseNotifierEnabled: activeOrg.purchaseNotifierEnabled ?? true,
                bundlesEnabled: activeOrg.bundlesEnabled ?? true,
                subscriptionsEnabled: activeOrg.subscriptionsEnabled ?? true,
                activeThemeId: activeTheme
            });
        }
    }, [activeOrg, activeTheme]);

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
            toast.error(e.message || "Failed to reach backend API.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [token]);

    const handleSyncSettings = async (updates: Partial<typeof localSettings>) => {
        if (!token) return;
        setIsSavingSettings(true);
        const tid = toast.loading("Persisting Changes...");
        try {
            const newSettings = { ...localSettings, ...updates };
            // 1. Send to Backend
            await googleSheetsService.adminUpdateGlobalSettings(token, newSettings);
            // 2. Refresh local visual state
            setLocalSettings(newSettings);
            // 3. Force Global context to re-fetch JSON
            await refreshConfig();
            toast.success("Settings Saved & Cache Purged", { id: tid });
        } catch (e: any) {
            toast.error(e.message || "Save Failed", { id: tid });
        } finally {
            setIsSavingSettings(false);
        }
    };

    const flushCache = async () => {
        if (!token) return;
        const tid = toast.loading("Purging configurations...");
        try {
            await googleSheetsService.adminClearConfigCache(token);
            await refreshConfig();
            toast.success("Config Cache Cleared", { id: tid });
            loadData();
        } catch (e: any) { toast.error(e.message, { id: tid }); }
    };

    if (isLoading && !health) return <div className="flex flex-col items-center justify-center py-20 text-slate-200"><Spinner size="lg"/><p className="mt-4 font-mono text-xs uppercase tracking-widest animate-pulse">Establishing Secure Uplink...</p></div>;

    return (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-20">
            <aside className="lg:w-64 flex flex-col gap-2">
                <NavItem id="diagnostics" label="Health Audit" icon={<Activity size={18}/>} active={activeTab === 'diagnostics'} onClick={setActiveTab} />
                <NavItem id="appearance" label="Platform Design" icon={<Palette size={18}/>} active={activeTab === 'appearance'} onClick={setActiveTab} />
                <NavItem id="bulk" label="Maintenance" icon={<DatabaseZap size={18}/>} active={activeTab === 'bulk'} onClick={setActiveTab} />
            </aside>

            <main className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'diagnostics' && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-black mb-6 flex items-center gap-3 text-white"><Cpu className="text-cyan-500" /> Platform Diagnostics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <HealthCard title="API Core" status={health?.api_connection} />
                                <HealthCard title="JWT Security" status={health?.jwt_secret} />
                                <HealthCard title="WooCommerce" status={health?.woocommerce} />
                                <HealthCard title="Subscriptions" status={health?.wc_subscriptions} />
                                <HealthCard title="App Configuration" status={health?.app_url_config} />
                                <HealthCard title="Google Sheets" status={health?.sheet_accessibility} />
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><BarChart3 size={20} className="text-cyan-500" /> System Metrics</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-1">Total Sales</p>
                                    <p className="text-4xl font-black text-white">{stats?.reduce((acc, s) => acc + (s.totalSales || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-1">Gross Revenue</p>
                                    <p className="text-4xl font-black text-emerald-400">${stats?.reduce((acc, s) => acc + (s.totalRevenue || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-1">User Engagement</p>
                                    <p className="text-4xl font-black text-cyan-400">{stats?.reduce((acc, s) => acc + (s.attempts || 0), 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black flex items-center gap-3 text-white"><Settings2 className="text-cyan-500" /> Feature Management</h2>
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-xl">
                                {[
                                    { id: 'purchaseNotifierEnabled', label: 'Purchase Notifier', desc: 'Social proof popups for visitors' },
                                    { id: 'subscriptionsEnabled', label: 'Subscription Core', desc: 'Enables monthly/yearly recurring access' },
                                    { id: 'bundlesEnabled', label: 'Product Bundles', desc: 'Allows "Exam + Subscription" checkout deals' }
                                ].map(f => (
                                    <div key={f.id} className="flex items-center justify-between p-6 bg-slate-900 hover:bg-slate-800/50 transition-colors">
                                        <div><p className="font-bold text-white text-lg">{f.label}</p><p className="text-sm text-slate-300 italic mt-1">{f.desc}</p></div>
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
                            <h2 className="text-3xl font-black flex items-center gap-3 text-white"><Palette className="text-cyan-500" /> Branding Theme</h2>
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-xl">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {(availableThemes || []).map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => handleSyncSettings({ activeThemeId: theme.id })}
                                            className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                                                localSettings.activeThemeId === theme.id 
                                                    ? 'bg-cyan-500/10 border-cyan-500 ring-4 ring-cyan-500/20' 
                                                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            {localSettings.activeThemeId === theme.id && <Check className="absolute top-3 right-3 text-cyan-400" size={18} strokeWidth={3}/>}
                                            <div className="w-full h-10 flex rounded-lg overflow-hidden border border-white/10">
                                                <div className="flex-1 bg-cyan-500"></div>
                                                <div className="flex-1 bg-pink-500"></div>
                                                <div className="flex-1 bg-yellow-400"></div>
                                            </div>
                                            <span className={`font-black text-xs uppercase tracking-tighter ${localSettings.activeThemeId === theme.id ? 'text-cyan-400' : 'text-slate-400'}`}>{theme.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bulk' && (
                    <div className="space-y-8">
                        <h2 className="text-3xl font-black flex items-center gap-3 text-white"><DatabaseZap className="text-cyan-500" /> Infrastructure Maintenance</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-xl">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-white"><RefreshCw size={20} className="text-cyan-400"/> Cache Management</h3>
                                <div className="space-y-4">
                                    <button onClick={flushCache} className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-3 transition">
                                        <RefreshCw size={18}/> Wipe App Configuration Cache
                                    </button>
                                    <button onClick={() => googleSheetsService.adminClearQuestionCaches(token!)} className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-3 transition">
                                        <FileSpreadsheet size={18}/> Refresh All Data Sheets
                                    </button>
                                </div>
                                <p className="mt-4 text-[10px] text-slate-500 uppercase font-bold text-center">Flush cache after making changes in WordPress.</p>
                            </div>
                            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-white"><DownloadCloud size={20} className="text-cyan-400"/> System Snapshots</h3>
                                <div className="space-y-3 flex-1">
                                    <p className="text-slate-400 text-sm mb-4 leading-relaxed">Download structural CSV templates to bulk import content or backup this tenant.</p>
                                    <a href="/template-exam-programs.csv" download className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 transition text-slate-300">
                                        <span className="font-bold">Exam Programs Template</span>
                                        <ExternalLink size={14}/>
                                    </a>
                                    <a href="/template-questions.csv" download className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 transition text-slate-300">
                                        <span className="font-bold">Question Dataset Template</span>
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