import React, { FC, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';
import { BarChart3, DollarSign, Percent, Repeat, ShoppingCart, ArrowUp, ArrowDown } from 'lucide-react';

// Utility to decode HTML entities.
const decodeHtmlEntities = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        console.error("Could not parse HTML string for decoding", e);
        return html;
    }
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
                    name: decodeHtmlEntities(stat.name)
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
            const numericKeys: (keyof ExamStat)[] = ['attempts', 'averageScore', 'passRate', 'engagements', 'totalSales', 'totalRevenue', 'passCount', 'totalScoreSum', 'ctr'];
            const isNumeric = numericKeys.includes(key as any);
            return { key, direction: isNumeric ? 'desc' : 'asc' };
        });
    };

    const sortedCertStats = useMemo(() => {
        if (!sortConfig.key) return certStats;

        const sortableData = [...certStats];
        sortableData.sort((a, b) => {
            const aValue = a[sortConfig.key!];
            const bValue = b[sortConfig.key!];

            const numA = (typeof aValue === 'number') ? aValue : 0;
            const numB = (typeof bValue === 'number') ? bValue : 0;
            const strA = (typeof aValue === 'string') ? aValue : '';
            const strB = (typeof bValue === 'string') ? bValue : '';
            
            const numericKeys: (keyof ExamStat)[] = ['attempts', 'averageScore', 'passRate', 'engagements', 'totalSales', 'totalRevenue', 'passCount', 'totalScoreSum', 'ctr'];

            if (numericKeys.includes(sortConfig.key as any)) {
                 if (sortConfig.direction === 'asc') return numA - numB;
                 return numB - numA;
            }
            
            if (sortConfig.direction === 'asc') return strA.localeCompare(strB);
            return strB.localeCompare(strA);
        });
        return sortableData;
    }, [certStats, sortConfig]);


    const summaryStats = useMemo(() => {
        return certStats.reduce((acc, stat) => {
            acc.totalSales += stat.totalSales || 0;
            acc.totalRevenue += stat.totalRevenue || 0;
            acc.totalAttempts += stat.attempts;
            acc.totalEngagements += stat.engagements;
            acc.totalPasses += stat.passCount || 0;
            acc.totalScoreSum += stat.totalScoreSum || 0;
            return acc;
        }, { totalSales: 0, totalRevenue: 0, totalAttempts: 0, totalEngagements: 0, totalPasses: 0, totalScoreSum: 0 });
    }, [certStats]);
    
    const overallCTR = useMemo(() => {
        if (summaryStats.totalEngagements === 0) return 0;
        return (summaryStats.totalAttempts / summaryStats.totalEngagements) * 100;
    }, [summaryStats]);
    
    const overallPassRate = useMemo(() => {
        if (summaryStats.totalAttempts === 0) return 0;
        return (summaryStats.totalPasses / summaryStats.totalAttempts) * 100;
    }, [summaryStats]);

    const overallAverageScore = useMemo(() => {
        if (summaryStats.totalAttempts === 0) return 0;
        return summaryStats.totalScoreSum / summaryStats.totalAttempts;
    }, [summaryStats]);


    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <BarChart3 />
                Sales & Performance Analytics
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                An overview of sales, attempts, and performance for your certification exams.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Sales" value={summaryStats.totalSales.toLocaleString()} icon={<ShoppingCart className="text-[rgb(var(--color-primary-rgb))]" />} />
                <StatCard title="Total Revenue" value={summaryStats.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} icon={<DollarSign className="text-[rgb(var(--color-primary-rgb))]" />} />
                <StatCard title="Total Attempts" value={summaryStats.totalAttempts.toLocaleString()} icon={<Repeat className="text-[rgb(var(--color-primary-rgb))]" />} />
                <StatCard title="Overall Click-to-Attempt Rate" value={`${overallCTR.toFixed(2)}%`} icon={<Percent className="text-[rgb(var(--color-primary-rgb))]" />} />
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                {isLoadingStats ? (
                    <div className="flex justify-center p-8"><Spinner /></div>
                ) : certStats.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[rgb(var(--color-text-muted-rgb))] uppercase bg-[rgb(var(--color-muted-rgb))]">
                                <tr>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-2">Exam Program {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('country')}>
                                        <div className="flex items-center justify-center gap-2">Country {sortConfig.key === 'country' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('totalSales')}>
                                        <div className="flex items-center justify-center gap-2">Sales {sortConfig.key === 'totalSales' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('totalRevenue')}>
                                        <div className="flex items-center justify-center gap-2">Revenue {sortConfig.key === 'totalRevenue' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('attempts')}>
                                        <div className="flex items-center justify-center gap-2">Attempts {sortConfig.key === 'attempts' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('averageScore')}>
                                        <div className="flex items-center justify-center gap-2">Avg. Score {sortConfig.key === 'averageScore' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('passRate')}>
                                        <div className="flex items-center gap-2">Pass Rate {sortConfig.key === 'passRate' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('ctr')}>
                                        <div className="flex items-center justify-center gap-2">Click-to-Attempt Rate {sortConfig.key === 'ctr' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCertStats.map(stat => {
                                    const passRate = stat.passRate || 0;
                                    let progressBarColor = 'bg-red-500';
                                    if (passRate > 70) progressBarColor = 'bg-green-500';
                                    else if (passRate > 50) progressBarColor = 'bg-yellow-500';
                                    
                                    return (
                                        <tr key={stat.id + (stat.country || '')} className="border-b border-[rgb(var(--color-border-rgb))]">
                                            <th scope="row" className="px-6 py-4 font-medium text-[rgb(var(--color-text-strong-rgb))] whitespace-nowrap">{stat.name}</th>
                                            <td className="px-6 py-4 text-center">{stat.country || 'N/A'}</td>
                                            <td className="px-6 py-4 text-center">{stat.totalSales?.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center font-semibold">{(stat.totalRevenue || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                            <td className="px-6 py-4 text-center">{stat.attempts}</td>
                                            <td className="px-6 py-4 text-center font-semibold">{stat.averageScore.toFixed(1)}%</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-full bg-[rgb(var(--color-muted-rgb))] rounded-full h-2.5">
                                                        <div className={`${progressBarColor} h-2.5 rounded-full`} style={{ width: `${passRate}%` }}></div>
                                                    </div>
                                                    <span className="font-semibold">{passRate.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-semibold">{(stat.ctr || 0).toFixed(1)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                             <tfoot>
                                <tr className="bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-strong-rgb))] font-bold">
                                    <td className="px-6 py-4">Total</td>
                                    <td className="px-6 py-4"></td>
                                    <td className="px-6 py-4 text-center">{summaryStats.totalSales.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">{summaryStats.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                    <td className="px-6 py-4 text-center">{summaryStats.totalAttempts.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">{overallAverageScore.toFixed(1)}%</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-full bg-[rgb(var(--color-border-rgb))] rounded-full h-2.5">
                                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${overallPassRate}%` }}></div>
                                            </div>
                                            <span className="font-semibold">{overallPassRate.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">{overallCTR.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-center p-8 text-[rgb(var(--color-text-muted-rgb))]">No analytics data available yet. Data will appear after users complete certification exams.</p>
                )}
            </div>
        </div>
    );
};


export default SalesAnalytics;