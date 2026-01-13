import React, { FC, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';
import { BarChart3, DollarSign, Percent, Repeat, ShoppingCart, ArrowUp, ArrowDown } from 'lucide-react';

const decodeHtmlEntities = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) { return html; }
};

const StatCard: FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg flex items-center border border-[rgb(var(--color-border-rgb))]">
        <div className="p-3 rounded-full mr-4 bg-[rgba(var(--color-primary-rgb),0.1)]">{icon}</div>
        <div>
            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">{title}</p>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{value}</p>
        </div>
    </div>
);

const SalesAnalytics: FC = () => {
    const { token } = useAuth();
    const { activeOrg } = useAppContext();
    const [stats, setStats] = useState<ExamStat[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ExamStat | null; direction: 'asc' | 'desc' }>({ key: 'totalSales', direction: 'desc' });

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            setIsLoadingStats(true);
            try {
                const fetchedStats: ExamStat[] = await googleSheetsService.getExamStats(token);
                const cleanedStats = fetchedStats.map(stat => ({
                    ...stat,
                    name: decodeHtmlEntities(stat.name),
                    attempts: Number(stat.attempts || 0),
                    totalSales: Number(stat.totalSales || 0),
                    totalRevenue: Number(stat.totalRevenue || 0),
                    passRate: Number(stat.passRate || 0),
                    averageScore: Number(stat.averageScore || 0),
                    engagements: Number(stat.engagements || 0)
                }));
                setStats(cleanedStats);
            } catch (error: any) {
                toast.error("Could not load exam analytics: " + error.message);
            } finally {
                setIsLoadingStats(false);
            }
        };
        fetchStats();
    }, [token]);
    
    const certStats = useMemo(() => {
        return stats
            .filter(stat => !stat.isPractice)
            .map(stat => ({
                ...stat,
                ctr: stat.engagements > 0 ? (stat.attempts / stat.engagements) * 100 : 0
            }));
    }, [stats]);
    
    const handleSort = (key: keyof ExamStat) => {
        setSortConfig(currentConfig => {
            if (currentConfig.key === key) {
                return { key, direction: currentConfig.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const sortedCertStats = useMemo(() => {
        if (!sortConfig.key) return certStats;
        const sortableData = [...certStats];
        sortableData.sort((a, b) => {
            const aVal = a[sortConfig.key!];
            const bVal = b[sortConfig.key!];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return sortConfig.direction === 'asc' 
                ? (aVal?.toString() || '').localeCompare(bVal?.toString() || '')
                : (bVal?.toString() || '').localeCompare(aVal?.toString() || '');
        });
        return sortableData;
    }, [certStats, sortConfig]);

    const summaryStats = useMemo(() => {
        const initial = { totalSales: 0, totalRevenue: 0, totalAttempts: 0, totalEngagements: 0, totalPasses: 0, totalScoreSum: 0 };
        if (!certStats.length) return initial;

        const processedSkus = new Set<string>();
        return certStats.reduce((acc, stat) => {
            if (!processedSkus.has(stat.id)) {
                acc.totalSales += Number(stat.totalSales || 0);
                acc.totalRevenue += Number(stat.totalRevenue || 0);
                acc.totalEngagements += Number(stat.engagements || 0);
                processedSkus.add(stat.id);
            }
            acc.totalAttempts += Number(stat.attempts || 0);
            acc.totalPasses += Number(stat.passCount || 0);
            acc.totalScoreSum += Number(stat.totalScoreSum || 0);
            return acc;
        }, initial);
    }, [certStats]);
    
    const overallCTR = summaryStats.totalEngagements > 0 ? (summaryStats.totalAttempts / summaryStats.totalEngagements) * 100 : 0;
    const overallPassRate = summaryStats.totalAttempts > 0 ? (summaryStats.totalPasses / summaryStats.totalAttempts) * 100 : 0;
    const overallAverageScore = summaryStats.totalAttempts > 0 ? summaryStats.totalScoreSum / summaryStats.totalAttempts : 0;

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-white font-display flex items-center gap-3"><BarChart3 className="text-cyan-500" /> Sales Analytics</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Sales" value={summaryStats.totalSales.toLocaleString()} icon={<ShoppingCart className="text-cyan-400" />} />
                <StatCard title="Total Revenue" value={summaryStats.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} icon={<DollarSign className="text-emerald-400" />} />
                <StatCard title="Total Attempts" value={summaryStats.totalAttempts.toLocaleString()} icon={<Repeat className="text-blue-400" />} />
                <StatCard title="CTR" value={`${overallCTR.toFixed(1)}%`} icon={<Percent className="text-purple-400" />} />
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-700">
                {isLoadingStats ? (
                    <div className="flex justify-center p-12"><Spinner size="lg" /></div>
                ) : certStats.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-950">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('name')}>Exam Name</th>
                                    <th className="px-6 py-4 text-center cursor-pointer" onClick={() => handleSort('totalSales')}>Sales</th>
                                    <th className="px-6 py-4 text-center cursor-pointer" onClick={() => handleSort('totalRevenue')}>Revenue</th>
                                    <th className="px-6 py-4 text-center cursor-pointer" onClick={() => handleSort('attempts')}>Attempts</th>
                                    <th className="px-6 py-4 text-center">Pass Rate</th>
                                    <th className="px-6 py-4 text-center cursor-pointer" onClick={() => handleSort('ctr')}>CTR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {sortedCertStats.map(stat => (
                                    <tr key={stat.id + (stat.country || '')} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-200">{stat.name}</td>
                                        <td className="px-6 py-4 text-center text-slate-300">{stat.totalSales?.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center font-bold text-emerald-400">${(stat.totalRevenue || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center text-slate-300">{stat.attempts}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 max-w-[120px] mx-auto">
                                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full ${stat.passRate > 70 ? 'bg-emerald-500' : (stat.passRate > 40 ? 'bg-yellow-500' : 'bg-rose-500')}`} style={{ width: `${stat.passRate}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-black w-8">{Math.round(stat.passRate)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-400">{(stat.ctr || 0).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="bg-slate-950 font-black text-white">
                                <tr>
                                    <td className="px-6 py-5">TOTAL PLATFORM</td>
                                    <td className="px-6 py-5 text-center">{summaryStats.totalSales.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-center text-emerald-400">${summaryStats.totalRevenue.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-center">{summaryStats.totalAttempts.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-center">{overallPassRate.toFixed(1)}%</td>
                                    <td className="px-6 py-5 text-center text-slate-400">{overallCTR.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center p-20 text-slate-600 font-mono italic">No transaction data available for this tenant.</div>
                )}
            </div>
        </div>
    );
};

export default SalesAnalytics;