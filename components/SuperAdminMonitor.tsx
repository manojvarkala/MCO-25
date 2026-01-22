
import React, { FC, useState, useEffect, useMemo } from 'react';
import { superAdminService, TenantSalesSummary } from '../services/superAdminService.ts';
import { GoogleGenAI } from "@google/genai";
import { 
    LayoutDashboard, 
    Globe, 
    DollarSign, 
    AlertCircle, 
    TrendingUp, 
    RefreshCw, 
    ShieldCheck,
    Search,
    BarChart3,
    Sparkles,
    ArrowUpRight
} from 'lucide-react';
import Spinner from './Spinner.tsx';
import toast from 'react-hot-toast';

const SuperAdminMonitor: FC = () => {
    const [tenants, setTenants] = useState<TenantSalesSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feePercentage, setFeePercentage] = useState(10);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const loadPlatformData = async () => {
        setIsLoading(true);
        try {
            const configReq = await fetch('/master-tenants.json');
            const config = await configReq.json();
            setFeePercentage(config.feePercentage);

            const promises = config.tenants.map((t: any) => 
                superAdminService.fetchTenantData(t.apiUrl, t.id, t.name, config.feePercentage)
            );

            const results = await Promise.all(promises);
            setTenants(results);
        } catch (e) {
            toast.error("Failed to load master tenant registry.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPlatformData();
    }, []);

    const globalMetrics = useMemo(() => {
        return tenants.reduce((acc, t) => {
            acc.revenue += t.totalRevenue;
            acc.fees += t.platformFee;
            acc.attempts += t.totalAttempts;
            acc.activeTenants += t.status === 'online' ? 1 : 0;
            return acc;
        }, { revenue: 0, fees: 0, attempts: 0, activeTenants: 0 });
    }, [tenants]);

    const runAIRevenueAudit = async () => {
        if (!process.env.API_KEY) return;
        setIsAnalyzing(true);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const dataSummary = tenants.map(t => ({
            name: t.tenantName,
            rev: t.totalRevenue,
            attempts: t.totalAttempts,
            conv: t.conversionRate.toFixed(2) + '%'
        }));

        const prompt = `
            Act as a Forensic Financial Auditor for an Examination Platform.
            Analyze this multi-tenant performance data:
            ${JSON.stringify(dataSummary)}

            1. Identify any tenants where "attempts" are disproportionately high compared to "revenue" (suggesting they might be bypassing payment).
            2. Predict which tenant has the highest growth potential.
            3. Highlight any offline risks.
            Keep the report professional, concise, and actionable for the platform owner.
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });
            setAiInsight(response.text || "Analysis unavailable.");
        } catch (e) {
            toast.error("AI Auditor offline.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
            <Spinner size="lg" />
            <p className="mt-4 font-mono text-xs uppercase tracking-widest animate-pulse">Scanning Global Tenant Cluster...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-main">
            {/* Header / Global Stats */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-white flex items-center gap-3">
                            <LayoutDashboard className="text-cyan-500" size={40} />
                            Platform Intelligence
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium uppercase tracking-widest text-[10px]">
                            Multi-Tenant Profit Share Monitoring System
                        </p>
                    </div>
                    <button 
                        onClick={loadPlatformData}
                        className="p-3 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all text-cyan-500"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Gross Revenue</p>
                        <p className="text-3xl font-black text-white">${globalMetrics.revenue.toLocaleString()}</p>
                        <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                            <TrendingUp size={14}/> +12.5% from last month
                        </div>
                    </div>
                    <div className="bg-cyan-600 p-6 rounded-3xl shadow-xl shadow-cyan-900/20">
                        <p className="text-[10px] font-black text-cyan-100 uppercase tracking-widest mb-1">Total Platform Fees ({feePercentage}%)</p>
                        <p className="text-3xl font-black text-white">${globalMetrics.fees.toLocaleString()}</p>
                        <div className="mt-4 text-cyan-100 text-xs font-bold">
                            Net Profit Share
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Engagements</p>
                        <p className="text-3xl font-black text-white">{globalMetrics.attempts.toLocaleString()}</p>
                        <div className="mt-4 text-slate-500 text-xs font-bold">
                            Total Exam Attempts
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Clusters</p>
                        <p className="text-3xl font-black text-white">{globalMetrics.activeTenants} / {tenants.length}</p>
                        <div className="mt-4 flex items-center gap-2 text-cyan-400 text-xs font-bold">
                            <ShieldCheck size={14}/> Connectivity 100%
                        </div>
                    </div>
                </div>

                {/* AI Analysis Button */}
                <div className="bg-gradient-to-r from-indigo-900/40 to-cyan-900/40 border border-indigo-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400">
                            <Sparkles size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">AI Forensic Auditor</h3>
                            <p className="text-slate-400 text-sm">Analyze cross-tenant conversion anomalies and identify potential revenue leaks.</p>
                        </div>
                    </div>
                    <button 
                        onClick={runAIRevenueAudit}
                        disabled={isAnalyzing}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                        {isAnalyzing ? <Spinner size="sm" /> : <BarChart3 size={20} />}
                        RUN FINANCIAL AUDIT
                    </button>
                </div>

                {aiInsight && (
                    <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 text-indigo-400 mb-4 font-black uppercase text-xs tracking-widest">
                            <Sparkles size={16}/> Gemini Intelligence Report
                        </div>
                        <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed">
                            {aiInsight.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                        </div>
                    </div>
                )}

                {/* Tenant List */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                            <tr>
                                <th className="px-8 py-5">Tenant Identity</th>
                                <th className="px-8 py-5 text-center">Connection</th>
                                <th className="px-8 py-5">Gross Revenue</th>
                                <th className="px-8 py-5">Owed Fee</th>
                                <th className="px-8 py-5">Audit (Sales/Attempts)</th>
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {tenants.map(tenant => (
                                <tr key={tenant.tenantId} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6">
                                        <p className="font-black text-white text-lg">{tenant.tenantName}</p>
                                        <p className="text-xs text-slate-500 font-mono">{tenant.apiUrl}</p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                            tenant.status === 'online' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                            {tenant.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 font-black text-white text-xl">
                                        ${tenant.totalRevenue.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6 font-black text-emerald-400 text-xl">
                                        ${tenant.platformFee.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${tenant.conversionRate < 1 ? 'bg-rose-500' : 'bg-cyan-500'}`} 
                                                    style={{ width: `${Math.min(tenant.conversionRate * 10, 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-black text-slate-400">{tenant.totalSales} / {tenant.totalAttempts}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <a 
                                            href={`${tenant.apiUrl}/wp-admin`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-white transition-colors"
                                        >
                                            WP ADMIN <ArrowUpRight size={14}/>
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminMonitor;
