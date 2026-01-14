import React, { FC, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam } from '../types.ts';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';
import { FileCheck, Search, Award, Eye, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM as any;

const AdminUserResults: FC = () => {
    const { token } = useAuth();
    const { activeOrg } = useAppContext();
    const navigate = useNavigate();
    const [allResults, setAllResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAllResults = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                // Reuse debug-details which already gathers all results from all users
                const debugData = await googleSheetsService.getDebugDetails(token);
                setAllResults(debugData.results || []);
            } catch (error: any) {
                toast.error("Failed to load user results: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllResults();
    }, [token]);

    const getExamName = (examId: string) => {
        return activeOrg?.exams.find(e => e.id === examId)?.name || examId;
    };

    const filteredResults = useMemo(() => {
        return allResults.filter(r => {
            const examName = getExamName(r.examId).toLowerCase();
            const search = searchTerm.toLowerCase();
            return examName.includes(search) || r.userId.toLowerCase().includes(search) || r.testId.toLowerCase().includes(search);
        }).sort((a, b) => b.timestamp - a.timestamp);
    }, [allResults, searchTerm, activeOrg]);

    if (isLoading) {
        return <div className="flex justify-center p-20"><Spinner size="lg" /></div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-4xl font-black text-white font-display flex items-center gap-3">
                    <FileCheck className="text-cyan-500" /> User Results Audit
                </h1>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search exam or User ID..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white focus:border-cyan-500"
                    />
                </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                            <tr>
                                <th className="p-5">Exam & Candidate</th>
                                <th className="p-5">Date</th>
                                <th className="p-5">Score</th>
                                <th className="p-5">Violations</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredResults.map(result => {
                                const exam = activeOrg?.exams.find(e => e.id === result.examId);
                                const isPass = exam && result.score >= exam.passScore;
                                return (
                                    <tr key={result.testId} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="p-5">
                                            <p className="font-bold text-slate-200">{getExamName(result.examId)}</p>
                                            <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1 uppercase mt-0.5">
                                                <User size={10}/> UID: {result.userId}
                                            </p>
                                        </td>
                                        <td className="p-5 text-slate-400 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14}/>
                                                {new Date(result.timestamp).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-lg font-black ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {result.score.toFixed(0)}%
                                                </span>
                                                {isPass ? <CheckCircle size={14} className="text-emerald-500"/> : <XCircle size={14} className="text-rose-500"/>}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${result.proctoringViolations > 0 ? 'bg-rose-900/40 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                                {result.proctoringViolations} FLAGS
                                            </span>
                                        </td>
                                        <td className="p-5 text-right space-x-2">
                                            <button 
                                                onClick={() => navigate(`/results/${result.testId}`)}
                                                className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                                                title="View Detailed Results"
                                            >
                                                <Eye size={18}/>
                                            </button>
                                            {isPass && exam?.certificateEnabled && (
                                                <button 
                                                    onClick={() => navigate(`/certificate/${result.testId}`)}
                                                    className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
                                                    title="View Issued Certificate"
                                                >
                                                    <Award size={18}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredResults.length === 0 && (
                    <div className="p-20 text-center text-slate-600 font-mono italic">
                        No examination records found in the current audit stream.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUserResults;