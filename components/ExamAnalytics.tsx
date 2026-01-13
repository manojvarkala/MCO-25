import React, { FC, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';
import { TrendingUp, MousePointerClick, Check, Repeat, BarChart, Percent, ArrowUp, ArrowDown } from 'lucide-react';

const StatCard: FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg flex items-center border border-[rgb(var(--color-border-rgb))]">
        <div className="p-3 rounded-full mr-4 bg-[rgba(var(--color-primary-rgb),0.1)]">{icon}</div>
        <div>
            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">{title}</p>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{value}</p>
        </div>
    </div>
);

const decodeHtmlEntities = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) { return html; }
};

const ExamAnalytics: FC = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState<ExamStat[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ExamStat | null; direction: 'asc' | 'desc' }>({ key: 'attempts', direction: 'desc' });

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            setIsLoadingStats(true);
            try {
                const fetchedStats = await googleSheetsService.getExamStats(token);
                const cleanedStats = fetchedStats.map(stat => ({
                    ...stat,
                    name: decodeHtmlEntities(stat.name),
                    programName: decodeHtmlEntities(stat.programName),
                    attempts: Number(stat.attempts || 0),
                    engagements: Number(stat.engagements || 0),
                    passCount: Number(stat.passCount || 0),
                    totalScoreSum: Number(stat.totalScoreSum || 0),
                    passRate: Number(stat.passRate || 0),
                    averageScore: Number(stat.averageScore || 0)
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

    const statsWithCtr = useMemo(() => {
        return stats.map(stat => ({
            ...stat,
            ctr: stat.engagements > 0 ? (stat.attempts / stat.engagements) * 100 : 0,
        }));
    }, [stats]);

    const sortedStats = useMemo(() => {
        if (!sortConfig.key) return statsWithCtr;
        const sortableData = [...statsWithCtr];
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
    }, [statsWithCtr, sortConfig]);

    const summaryStats = useMemo(() => {
        const initial = { totalAttempts: 0, totalEngagements: 0, totalPasses: 0, totalScoreSum: 0 };
        if (!stats.length) return initial;
        const processedSkus = new Set<string>();
        return stats.reduce((acc, stat) => {
            if (!processedSkus.has(stat.id)) {
                acc.totalEngagements += Number(stat.engagements || 0);
                processedSkus.add(stat.id);
            }
            acc.totalAttempts += Number(stat.attempts || 0);
            acc.totalPasses += Number(stat.passCount || 0);
            acc.totalScoreSum += Number(stat.totalScoreSum || 0);
            return acc;
        }, initial);
    }, [stats]);

    const overallCTR = summaryStats.totalEngagements > 0 ? (summaryStats.totalAttempts / summaryStats.totalEngagements) * 100 : 0;
    const overallPassRate = summaryStats.totalAttempts > 0 ? (summaryStats.totalPasses / summaryStats.totalAttempts) * 100 : 0;
    const overallAverageScore = summaryStats.totalAttempts > 0 ? summaryStats.totalScoreSum / summaryStats.totalAttempts : 0;

    const handleSort = (key: keyof ExamStat) => {
        setSortConfig(currentConfig => {
            if (currentConfig.key === key) {
                return { key, direction: currentConfig.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <TrendingUp /> Usage Analytics
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Attempts" value={summaryStats.totalAttempts.toLocaleString()} icon={<Repeat className="text-[rgb(var(--color-primary-rgb))]" />} />
                <StatCard title="Engagements" value={summaryStats.totalEngagements.toLocaleString()} icon={<MousePointerClick className="text-[rgb(var(--color-primary-rgb))]" />} />
                <StatCard title="Avg. CTR" value={`${overallCTR.toFixed(1)}%`} icon={<Percent className="text-[rgb(var(--color-primary-rgb))]" />} />
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                {isLoadingStats ? (
                    <div className="flex justify-center p-8"><Spinner /></div>
                ) : stats.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[rgb(var(--color-text-muted-rgb))] uppercase bg-[rgb(var(--color-muted-rgb))]">
                                <tr>
                                    <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('name')}>Exam</th>
                                    <th className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('attempts')}>Attempts</th>
                                    <th className="px-6 py-3 text-center">Avg. Score</th>
                                    <th className="px-6 py-3 text-center">Pass Rate</th>
                                    <th className="px-6 py-3 text-center">CTR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStats.map(stat => (
                                    <tr key={stat.id + (stat.country || '')} className="border-b border-[rgb(var(--color-border-rgb))] hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[rgb(var(--color-text-strong-rgb))]">
                                            {stat.name}
                                            <span className="block text-[10px] opacity-50 uppercase tracking-tighter">{stat.programName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">{stat.attempts}</td>
                                        <td className="px-6 py-4 text-center font-bold text-cyan-400">{stat.averageScore.toFixed(1)}%</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 justify-center">
                                                <div className="w-20 bg-[rgb(var(--color-muted-rgb))] rounded-full h-1.5 overflow-hidden">
                                                    <div className="bg-green-500 h-full" style={{ width: `${stat.passRate}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold">{Math.round(stat.passRate)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">{(stat.ctr || 0).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="bg-[rgb(var(--color-muted-rgb))] text-white font-black">
                                <tr>
                                    <td className="px-6 py-4">GRAND TOTAL</td>
                                    <td className="px-6 py-4 text-center">{summaryStats.totalAttempts.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">{overallAverageScore.toFixed(1)}%</td>
                                    <td className="px-6 py-4 text-center">{overallPassRate.toFixed(1)}%</td>
                                    <td className="px-6 py-4 text-center">{overallCTR.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-center p-8 text-[rgb(var(--color-text-muted-rgb))] italic">Analytics engine awaiting data streams.</p>
                )}
            </div>
        </div>
    );
};

export default ExamAnalytics;