import React, { FC, useState, useEffect, ReactNode, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ExamStat } from '../types.ts';
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

const themePreviewColors: { [key: string]: string[] } = {
    default: ['#06b6d4', '#db2777', '#fde047', '#0f172a'],
    professional: ['#047857', '#3b82f6', '#eab308', '#f1f5f9'],
    serene: ['#60a5fa', '#34d399', '#fb923c', '#f0fdfa'],
    academic: ['#7f1d1d', '#a16207', '#d97706', '#fafaf9'],
    noir: ['#e5e7eb', '#8b5cf6', '#eab308', '#1f2937']
};

const HealthCard: FC<{ title: string; status?: { success: boolean; message: string } }> = ({ title, status }) => (
    <div className="bg-[rgb(var(--color-card-rgb))] p-5 rounded-2xl border-2 border-[rgb(var(--color-border-rgb))] flex items-center justify-between shadow-xl group hover:border-[rgb(var(--color-primary-rgb))] transition-all">
        <div className="flex items-center gap-3 overflow-hidden">
            {!status ? (
                <RefreshCw size={22} className="text-[rgb(var(--color-primary-rgb))] animate-spin flex-shrink-0" />
            ) : status.success ? (
                <CheckCircle className="text-emerald-400 flex-shrink-0" size={22} />
            ) : (
                <XCircle className="text-rose-500 flex-shrink-0" size={22} />
            )}
            <span className="font-black text-[rgb(var(--color-text-strong-rgb))] text-sm tracking-tight truncate">{title}</span>
        </div>
        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
            !status ? 'bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-muted-rgb))]' : status.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
        }`}>
            {!status ? 'POLLING' : status.message}
        </span>
    </div>
);

const Admin: FC = () => {
    const { token } = useAuth();
    const { activeOrg, availableThemes, refreshConfig, setActiveTheme, activeTheme } = useAppContext();
    const [activeTab, setActiveTabState] = useState<AdminTab>('diagnostics');
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [stats, setStats] = useState<ExamStat[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [localSettings, setLocalSettings] = useState({
        purchaseNotifierEnabled: true,
        bundlesEnabled: true,
        subscriptionsEnabled: true,
        activeThemeId: 'default'
    });

    const setActiveTab = (tab: AdminTab) => {
        setActiveTabState(tab);
        sessionStorage.setItem('mco_admin_active_tab', tab);
    };

    useEffect(() => {
        if (activeOrg) {
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
        } catch (e: any) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { loadData(); }, [token]);

    const handleSyncSettings = async (updates: Partial<typeof localSettings>) => {
        if (!token || isSavingSettings) return;
        setIsSavingSettings(true);
        const nextSettings = { ...localSettings, ...updates };
        setLocalSettings(nextSettings);
        
        if (updates.activeThemeId) {
            setActiveTheme(updates.activeThemeId);
        }

        const tid = toast.loading("Syncing Platform Settings...");
        try {
            await googleSheetsService.adminUpdateGlobalSettings(token, nextSettings);
            await refreshConfig();
            toast.success("Settings Synchronized", { id: tid });
        } catch (e: any) { toast.error(e.message, { id: tid }); }
        finally { setIsSavingSettings(false); }
    };

    if (isLoading && !health) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 font-black text-[rgb(var(--color-primary-rgb))] animate-pulse text-xs tracking-widest uppercase">Initializing Audit...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-20">
            <aside className="lg:w-64 flex flex-col gap-3">
                {[
                    { id: 'diagnostics', label: 'Diagnostics', icon: <Activity size={20}/> },
                    { id: 'appearance', label: 'Appearance', icon: <Palette size={20}/> },
                    { id: 'bulk', label: 'Infrastructure', icon: <DatabaseZap size={20}/> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AdminTab)}
                        className={`mco-admin-nav-item ${activeTab === tab.id ? 'mco-admin-nav-item--active' : 'mco-admin-nav-item--inactive'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </aside>

            <main className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'diagnostics' && (
                    <div className="space-y-8">
                        <h2 className="text-3xl font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-3">
                            <Layout className="text-[rgb(var(--color-primary-rgb))]" size={32} /> System Health
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <HealthCard title="API Gateway" status={health?.api_connection} />
                            <HealthCard title="JWT Security" status={health?.jwt_secret} />
                            <HealthCard title="WooCommerce" status={health?.woocommerce} />
                            <HealthCard title="Billing Engine" status={health?.wc_subscriptions} />
                            <HealthCard title="App Protocol" status={health?.app_url_config} />
                            <HealthCard title="Data Stream" status={health?.sheet_accessibility} />
                        </div>

                        <div className="bg-[rgb(var(--color-card-rgb))] border-2 border-[rgb(var(--color-border-rgb))] rounded-3xl p-10 shadow-2xl">
                            <h3 className="text-xl font-black text-[rgb(var(--color-text-strong-rgb))] mb-10 flex items-center gap-3 border-b border-[rgb(var(--color-border-rgb))] pb-5">
                                <BarChart3 size={24} className="text-[rgb(var(--color-primary-rgb))]" /> Key Performance Indicators
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-2">Total Unit Sales</p>
                                    <p className="text-5xl font-black text-[rgb(var(--color-text-strong-rgb))] tabular-nums">{stats?.reduce((acc, s) => acc + (s.totalSales || 0), 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-2">Gross Revenue</p>
                                    <p className="text-5xl font-black text-emerald-500 tabular-nums">${stats?.reduce((acc, s) => acc + (s.totalRevenue || 0), 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-[rgb(var(--color-text-muted-rgb))] tracking-widest mb-2">User Engagements</p>
                                    <p className="text-5xl font-black text-[rgb(var(--color-primary-rgb))] tabular-nums">{stats?.reduce((acc, s) => acc + (s.attempts || 0), 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-3">
                                <Palette className="text-[rgb(var(--color-primary-rgb))]" size={32} /> Global Theme Identity
                            </h2>
                            <p className="text-[rgb(var(--color-text-muted-rgb))] max-w-2xl font-medium">Select the default visual theme for all users on this tenant.</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {availableThemes.map(theme => {
                                    const colors = themePreviewColors[theme.id] || ['#ccc', '#ccc', '#ccc', '#ccc'];
                                    const isSelected = localSettings.activeThemeId === theme.id;
                                    
                                    return (
                                        <button
                                            key={theme.id}
                                            onClick={() => handleSyncSettings({ activeThemeId: theme.id })}
                                            className={`relative p-5 rounded-2xl border-2 transition-all text-left flex flex-col items-center gap-3 group ${
                                                isSelected 
                                                ? 'bg-[rgb(var(--color-muted-rgb))] border-[rgb(var(--color-primary-rgb))] shadow-lg' 
                                                : 'bg-[rgb(var(--color-card-rgb))] border-[rgb(var(--color-border-rgb))] hover:border-[rgb(var(--color-primary-rgb))]'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 bg-[rgb(var(--color-primary-rgb))] text-[rgb(var(--color-background-rgb))] rounded-full p-1 shadow-lg z-10">
                                                    <Check size={14} strokeWidth={4} />
                                                </div>
                                            )}
                                            <div className="flex w-full h-10 rounded-lg overflow-hidden border border-[rgb(var(--color-border-rgb))]">
                                                {colors.map((c, i) => (
                                                    <div key={i} className="flex-1" style={{ backgroundColor: c }}></div>
                                                ))}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-[rgb(var(--color-primary-rgb))]' : 'text-[rgb(var(--color-text-muted-rgb))]'}`}>
                                                {theme.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-3xl font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-3">
                                <Settings2 className="text-[rgb(var(--color-primary-rgb))]" size={32} /> Feature Overrides
                            </h2>
                            <div className="bg-[rgb(var(--color-card-rgb))] border-2 border-[rgb(var(--color-border-rgb))] rounded-3xl overflow-hidden divide-y divide-[rgb(var(--color-border-rgb))] shadow-2xl">
                                {[
                                    { id: 'purchaseNotifierEnabled', label: 'Purchase Notifier', desc: 'Display randomized social proof notifications for site activity.' },
                                    { id: 'subscriptionsEnabled', label: 'Subscription Engine', desc: 'Enable global recurring billing logic.' },
                                    { id: 'bundlesEnabled', label: 'Dynamic Bundling', desc: 'Display high-value packages on dashboard.' }
                                ].map(f => (
                                    <div key={f.id} className="flex items-center justify-between p-8 hover:bg-[rgba(var(--color-muted-rgb),0.2)] transition-colors">
                                        <div className="max-w-md">
                                            <p className="font-black text-[rgb(var(--color-text-strong-rgb))] text-xl">{f.label}</p>
                                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))] font-bold mt-1">{f.desc}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleSyncSettings({ [f.id]: !(localSettings as any)[f.id] })}
                                            disabled={isSavingSettings}
                                            className={`transition-all transform active:scale-90 ${ (localSettings as any)[f.id] ? 'text-[rgb(var(--color-primary-rgb))]' : 'text-[rgb(var(--color-border-rgb))]'}`}
                                        >
                                            { (localSettings as any)[f.id] ? <ToggleRight size={64} /> : <ToggleLeft size={64} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bulk' && (
                    <div className="space-y-8">
                        <h2 className="text-3xl font-black text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-3">
                            <DatabaseZap className="text-[rgb(var(--color-primary-rgb))]" size={32} /> Infrastructure
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[rgb(var(--color-card-rgb))] border-2 border-[rgb(var(--color-border-rgb))] p-8 rounded-3xl shadow-2xl">
                                <h3 className="text-xl font-black text-[rgb(var(--color-text-strong-rgb))] mb-6 flex items-center gap-3 border-b border-[rgb(var(--color-border-rgb))] pb-4">
                                    <RefreshCw size={22} className="text-[rgb(var(--color-primary-rgb))]"/> Caching
                                </h3>
                                <div className="space-y-4">
                                    <button onClick={async () => { await googleSheetsService.adminClearConfigCache(token!); await refreshConfig(); toast.success("Cleared"); }} className="w-full py-4 bg-[rgb(var(--color-muted-rgb))] hover:opacity-80 text-[rgb(var(--color-text-strong-rgb))] font-black rounded-xl flex items-center justify-center gap-3 transition-all">
                                        <RefreshCw size={18} /> Clear Config Cache
                                    </button>
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