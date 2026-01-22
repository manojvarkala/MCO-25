import React, { FC, useState, useEffect, ReactNode, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ExamStat, Theme } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { 
    CheckCircle, XCircle, RefreshCw, BarChart3, 
    Settings2, DatabaseZap, DownloadCloud, ToggleLeft, 
    ToggleRight, Activity, Palette, Check, ExternalLink, Layout,
    FileSpreadsheet
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

const themeColors: { [key: string]: { [key: string]: string } } = {
    default: {
        primary: 'rgb(6, 182, 212)',
        secondary: 'rgb(219, 39, 119)',
        accent: 'rgb(253, 224, 71)',
        background: 'rgb(15, 23, 42)',
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

const NavItem: FC<{ id: AdminTab; label: string; icon: ReactNode; active: boolean; onClick: (id: AdminTab) => void }> = ({ id, label, icon, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-3 px-5 py-4 rounded-xl transition-all font-bold text-sm w-full text-left border ${
            active 
                ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/20' 
                : 'bg-[rgb(var(--color-card-rgb))] border-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]'
        }`}
    >
        {icon} {label}
    </button>
);

const HealthCard: FC<{ title: string; status?: { success: boolean; message: string } }> = ({ title, status }) => (
    <div className="bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl border border-[rgb(var(--color-border-rgb))] flex items-center justify-between shadow-sm hover:border-cyan-500 transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
            {!status ? (
                <RefreshCw size={18} className="text-cyan-500 animate-spin flex-shrink-0" />
            ) : status.success ? (
                <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />
            ) : (
                <XCircle className="text-rose-500 flex-shrink-0" size={18} />
            )}
            <span className="font-bold text-[rgb(var(--color-text-strong-rgb))] text-sm truncate">{title}</span>
        </div>
        <span className={`mco-admin-badge ${!status ? 'mco-admin-badge--pending' : status.success ? 'mco-admin-badge--success' : 'mco-admin-badge--error'}`}>
            {!status ? 'POLLING...' : status.message.toUpperCase()}
        </span>
    </div>
);

const Admin: FC = () => {
    const { token } = useAuth();
    const { activeOrg, availableThemes, refreshConfig, setActiveTheme } = useAppContext();
    
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
    
    // Lock ref to prevent race conditions during save/refresh cycles
    const pendingUpdateRef = useRef(false);

    // Initial local state with defensive defaults
    const [localSettings, setLocalSettings] = useState({
        purchaseNotifierEnabled: true,
        bundlesEnabled: true,
        subscriptionsEnabled: true,
        activeThemeId: 'default'
    });

    // Synchronize local settings with global AppContext when activeOrg changes
    useEffect(() => {
        if (activeOrg && !pendingUpdateRef.current) {
            setLocalSettings({
                purchaseNotifierEnabled: activeOrg.purchaseNotifierEnabled ?? true,
                bundlesEnabled: activeOrg.bundlesEnabled ?? true,
                subscriptionsEnabled: activeOrg.subscriptionsEnabled ?? true,
                activeThemeId: activeOrg.activeThemeId || 'default'
            });
        }
    }, [activeOrg]);

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
            console.error("Diagnostic failure:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [token]);

    const handleSyncSettings = async (updates: Partial<typeof localSettings>) => {
        if (!token || isSavingSettings) return;
        
        pendingUpdateRef.current = true;
        setIsSavingSettings(true);
        
        // 1. Optimistic UI Update
        const nextSettings = { ...localSettings, ...updates };
        setLocalSettings(nextSettings);

        // Immediate Visual Feedback for Admin
        if (updates.activeThemeId) {
            setActiveTheme(updates.activeThemeId);
        }

        const tid = toast.loading("Syncing branding to server...");
        try {
            // 2. Transmit to Backend
            await googleSheetsService.adminUpdateGlobalSettings(token, nextSettings);
            
            // 3. Purge Server Transients and reload global app state
            await refreshConfig();
            
            toast.success("Settings saved and verified", { id: tid });
        } catch (e: any) {
            toast.error(e.message || "Save failed", { id: tid });
            // Revert on failure
            if (activeOrg) {
                setLocalSettings({
                    purchaseNotifierEnabled: activeOrg.purchaseNotifierEnabled ?? true,
                    bundlesEnabled: activeOrg.bundlesEnabled ?? true,
                    subscriptionsEnabled: activeOrg.subscriptionsEnabled ?? true,
                    activeThemeId: activeOrg.activeThemeId || 'default'
                });
                setActiveTheme(activeOrg.activeThemeId || 'default');
            }
        } finally {
            pendingUpdateRef.current = false;
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

    if (isLoading && !health) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-200">
            <Spinner size="lg"/>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest animate-pulse">Establishing Secure Uplink...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-20">
            <aside className="lg:w-64 flex flex-col gap-3">
                <NavItem id="diagnostics" label="Platform Audit" icon={<Activity size={20}/>} active={activeTab === 'diagnostics'} onClick={setActiveTab} />
                <NavItem id="appearance" label="Visual Branding" icon={<Palette size={20}/>} active={activeTab === 'appearance'} onClick={setActiveTab} />
                <NavItem id="bulk" label="Infrastructure" icon={<DatabaseZap size={20}/>} active={activeTab === 'bulk'} onClick={setActiveTab} />
            </aside>

            <main className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'diagnostics' && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-black mb-6 flex items-center gap-3 text-[rgb(var(--color-text-strong-rgb))]">
                                <Layout className="text-cyan-500" size={32} /> Platform Health
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <HealthCard title="API Gateway" status={health?.api_connection} />
                                <HealthCard title="Security Layer" status={health?.jwt_secret} />
                                <HealthCard title="Commerce Core" status={health?.woocommerce} />
                                <HealthCard title="Billing Engine" status={health?.wc_subscriptions} />
                                <HealthCard title="App Protocol" status={health?.app_url_config} />
                                <HealthCard title="Data Sheets" status={health?.sheet_accessibility} />
                            </div>
                        </div>

                        <div className="bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-[rgb(var(--color-text-strong-rgb))] border-b border-[rgb(var(--color-border-rgb))] pb-4">
                                <BarChart3 size={24} className="text-cyan-500" /> Platform Metrics
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted-rgb))] font-black uppercase tracking-widest">Total Sales Units</p>
                                    <p className="text-4xl font-black text-[rgb(var(--color-text-strong-rgb))]">{stats?.reduce((acc, s) => acc + (s.totalSales || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted-rgb))] font-black uppercase tracking-widest">Estimated Gross</p>
                                    <p className="text-4xl font-black text-emerald-400">${stats?.reduce((acc, s) => acc + (s.totalRevenue || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted-rgb))] font-black uppercase tracking-widest">User Engagement</p>
                                    <p className="text-4xl font-black text-cyan-400">{stats?.reduce((acc, s) => acc + (s.attempts || 0), 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black flex items-center gap-3 text-[rgb(var(--color-text-strong-rgb))]">
                                <Settings2 className="text-cyan-500" size={32} /> Component Toggles
                            </h2>
                            <div className="bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-2xl overflow-hidden divide-y divide-[rgb(var(--color-border-rgb))] shadow-xl">
                                {[
                                    { id: 'purchaseNotifierEnabled', label: 'Site Purchase Notifier', desc: 'Real-time social proof popups for visitors' },
                                    { id: 'subscriptionsEnabled', label: 'Subscription Framework', desc: 'Global recurring billing and membership logic' },
                                    { id: 'bundlesEnabled', label: 'Smart Product Bundling', desc: 'Automated package deal rendering (Exam + Sub)' }
                                ].map(f => (
                                    <div key={f.id} className="flex items-center justify-between p-6 bg-[rgb(var(--color-card-rgb))] hover:bg-[rgba(var(--color-muted-rgb),0.4)] transition-colors">
                                        <div className="max-w-md">
                                            <p className="font-black text-[rgb(var(--color-text-strong-rgb))] text-lg">{f.label}</p>
                                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))] font-medium mt-1">{f.desc}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleSyncSettings({ [f.id]: !(localSettings as any)[f.id] })}
                                            disabled={isSavingSettings}
                                            className={`transition-all transform active:scale-95 ${ (localSettings as any)[f.id] ? 'text-cyan-500' : 'text-slate-400'}`}
                                        >
                                            { (localSettings as any)[f.id] ? <ToggleRight size={52} strokeWidth={1.5}/> : <ToggleLeft size={52} strokeWidth={1.5}/>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {activeOrg && (
                            <div className="space-y-6">
                                <h2 className="text-3xl font-black flex items-center gap-3 text-[rgb(var(--color-text-strong-rgb))]">
                                    <Palette className="text-cyan-500" size={32} /> Organizational Theme
                                </h2>
                                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))]">
                                    <p className="text-[rgb(var(--color-text-muted-rgb))] text-sm font-medium mb-8 leading-relaxed max-w-2xl">
                                        Set the <strong>global default theme</strong> for all users. This selection will be the baseline visual profile for the dashboard, certificates, and marketing elements.
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {(availableThemes || []).map(theme => (
                                            <button
                                                key={theme.id}
                                                type="button"
                                                onClick={() => handleSyncSettings({ activeThemeId: theme.id })}
                                                className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                                    localSettings.activeThemeId === theme.id 
                                                        ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20 shadow-md' 
                                                        : 'border-[rgb(var(--color-border-rgb))] hover:border-cyan-400 bg-[rgba(var(--color-muted-rgb),0.2)]'
                                                }`}
                                            >
                                                {localSettings.activeThemeId === theme.id && (
                                                    <div className="absolute -top-2 -right-2 bg-cyan-500 text-white rounded-full p-1 shadow-md border-2 border-[rgb(var(--color-card-rgb))]">
                                                        <Check size={12} strokeWidth={4}/>
                                                    </div>
                                                )}
                                                
                                                <div className="flex justify-center space-x-1 w-full h-8 pointer-events-none">
                                                    <div className="w-1/4 rounded shadow-sm border border-black/5" style={{ backgroundColor: themeColors[theme.id]?.primary || '#ccc' }}></div>
                                                    <div className="w-1/4 rounded shadow-sm border border-black/5" style={{ backgroundColor: themeColors[theme.id]?.secondary || '#ccc' }}></div>
                                                    <div className="w-1/4 rounded shadow-sm border border-black/5" style={{ backgroundColor: themeColors[theme.id]?.accent || '#ccc' }}></div>
                                                    <div className="w-1/4 rounded shadow-sm border border-black/5" style={{ backgroundColor: themeColors[theme.id]?.background || '#ccc' }}></div>
                                                </div>

                                                <span className={`font-bold text-xs uppercase tracking-tight ${
                                                    localSettings.activeThemeId === theme.id ? 'text-cyan-400' : 'text-[rgb(var(--color-text-muted-rgb))]'
                                                }`}>
                                                    {theme.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'bulk' && (
                    <div className="space-y-8">
                        <h2 className="text-3xl font-black flex items-center gap-3 text-[rgb(var(--color-text-strong-rgb))]">
                            <DatabaseZap className="text-cyan-500" size={32} /> Infrastructure Tools
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl border border-[rgb(var(--color-border-rgb))] shadow-xl">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-[rgb(var(--color-text-strong-rgb))] border-b border-[rgb(var(--color-border-rgb))] pb-4">
                                    <RefreshCw size={22} className="text-cyan-400"/> Memory Management
                                </h3>
                                <div className="space-y-4">
                                    <button onClick={flushCache} className="w-full py-4 bg-[rgb(var(--color-background-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-default-rgb))] font-bold rounded-xl border border-[rgb(var(--color-border-rgb))] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg">
                                        <RefreshCw size={18} className="text-cyan-500"/> Purge Configuration Cache
                                    </button>
                                    <button onClick={() => googleSheetsService.adminClearQuestionCaches(token!)} className="w-full py-4 bg-[rgb(var(--color-background-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-default-rgb))] font-bold rounded-xl border border-[rgb(var(--color-border-rgb))] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg">
                                        <FileSpreadsheet size={18} className="text-emerald-500"/> Force Sync All Data Sheets
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl border border-[rgb(var(--color-border-rgb))] shadow-xl flex flex-col">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-[rgb(var(--color-text-strong-rgb))] border-b border-[rgb(var(--color-border-rgb))] pb-4">
                                    <DownloadCloud size={22} className="text-cyan-400"/> Bulk Templates
                                </h3>
                                <div className="space-y-4 flex-1">
                                    <p className="text-[rgb(var(--color-text-muted-rgb))] text-sm font-medium mb-4 leading-relaxed italic">Download canonical CSV structures for rapid migration or backup.</p>
                                    <a href="/template-exam-programs.csv" download className="flex items-center justify-between p-5 bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl hover:bg-[rgb(var(--color-muted-rgb))] transition-all text-[rgb(var(--color-text-default-rgb))] font-bold hover:text-cyan-400">
                                        <span>Exam Programs Structure</span>
                                        <ExternalLink size={16} className="opacity-50"/>
                                    </a>
                                    <a href="/template-questions.csv" download className="flex items-center justify-between p-5 bg-[rgb(var(--color-background-rgb))] border border-[rgb(var(--color-border-rgb))] rounded-xl hover:bg-[rgb(var(--color-muted-rgb))] transition-all text-[rgb(var(--color-text-default-rgb))] font-bold hover:text-cyan-400">
                                        <span>Master Question Dataset</span>
                                        <ExternalLink size={16} className="opacity-50"/>
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