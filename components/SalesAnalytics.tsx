import React, { FC, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';
import { BarChart3 } from 'lucide-react';

// Utility to strip HTML tags and decode entities.
const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        console.error("Could not parse HTML string for stripping", e);
        return html;
    }
};

const SalesAnalytics: FC = () => {
    const { token } = useAuth();
    const { activeOrg } = useAppContext();
    const [stats, setStats] = useState<ExamStat[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token || !activeOrg) return;
            setIsLoadingStats(true);
            try {
                const fetchedStats: ExamStat[] = await googleSheetsService.getExamStats(token);
                // Filter stats to only include cert exams from the active org
                const certExamIds = activeOrg.exams.filter(e => !e.isPractice).map(e => e.id);
                const relevantStats = fetchedStats
                    .filter(stat => certExamIds.includes(stat.id))
                    .map(stat => ({
                        ...stat,
                        name: stripHtml(stat.name) // Clean the name here
                    }));
                setStats(relevantStats);
            } catch (error: any) {
                toast.error("Could not load exam analytics: " + error.message);
            } finally {
                setIsLoadingStats(false);
            }
        };
        fetchStats();
    }, [token, activeOrg]);

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <BarChart3 />
                Sales Analytics
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                An overview of sales, attempts, and performance for your certification exams.
            </p>
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                {isLoadingStats ? (
                    <div className="flex justify-center p-8"><Spinner /></div>
                ) : stats.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[rgb(var(--color-text-muted-rgb))] uppercase bg-[rgb(var(--color-muted-rgb))]">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Exam Program</th>
                                    <th scope="col" className="px-6 py-3 text-center">Sales</th>
                                    <th scope="col" className="px-6 py-3 text-center">Revenue</th>
                                    <th scope="col" className="px-6 py-3 text-center">Attempts</th>
                                    <th scope="col" className="px-6 py-3 text-center">Avg. Score</th>
                                    <th scope="col" className="px-6 py-3">Pass Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map(stat => {
                                    const passRate = stat.passRate || 0;
                                    let progressBarColor = 'bg-red-500';
                                    if (passRate > 70) progressBarColor = 'bg-green-500';
                                    else if (passRate > 50) progressBarColor = 'bg-yellow-500';
                                    
                                    return (
                                        <tr key={stat.id} className="border-b border-[rgb(var(--color-border-rgb))]">
                                            <th scope="row" className="px-6 py-4 font-medium text-[rgb(var(--color-text-strong-rgb))] whitespace-nowrap">{stat.name}</th>
                                            <td className="px-6 py-4 text-center">{stat.totalSales}</td>
                                            <td className="px-6 py-4 text-center font-semibold">{stat.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
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
                                        </tr>
                                    );
                                })}
                            </tbody>
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