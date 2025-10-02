import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, ExamProductCategory } from '../types.ts';
import { User, Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, ShoppingCart, RefreshCw, PlayCircle, Star } from 'lucide-react';
import Spinner from './Spinner.tsx';

const StatCard: FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-50 p-4 rounded-lg flex items-center">
        <div className="bg-cyan-100 p-3 rounded-full mr-4">{icon}</div>
        <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const ExamCard: FC<{ exam: Exam; isPractice: boolean; isPurchased: boolean }> = ({ exam, isPractice, isPurchased }) => {
    const navigate = useNavigate();
    const { isSubscribed } = useAuth();
    const canTake = isPractice || isPurchased || isSubscribed;
    const buttonText = isPractice ? 'Start Practice' : canTake ? 'Start Exam' : 'Purchase Exam';

    const handleButtonClick = () => {
        if (canTake) {
            navigate(`/test/${exam.id}`);
        } else if (exam.productSlug) {
            navigate(`/checkout/${exam.productSlug}`);
        } else {
            toast.error("This exam is not available for purchase at the moment.");
        }
    };

    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${isPractice ? 'border-cyan-500' : 'border-amber-500'}`}>
            <h3 className="font-bold text-lg text-slate-800">{exam.name}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4 h-10 overflow-hidden">{exam.description}</p>
            <div className="flex justify-between text-sm text-slate-600 mb-4">
                <span><HelpCircle size={14} className="inline mr-1" />{exam.numberOfQuestions} Questions</span>
                <span><Clock size={14} className="inline mr-1" />{exam.durationMinutes} Mins</span>
                <span><CheckCircle size={14} className="inline mr-1" />{exam.passScore}% to Pass</span>
            </div>
            <button
                onClick={handleButtonClick}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-2 px-4 rounded-lg transition ${
                    canTake
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
            >
                {canTake ? <PlayCircle size={16} /> : <ShoppingCart size={16} />}
                {buttonText}
            </button>
        </div>
    );
};


const Dashboard: FC = () => {
    const { user, token, paidExamIds, isSubscribed, loginWithToken } = useAuth();
    const { activeOrg, isInitializing, inProgressExam, examPrices } = useAppContext();
    const navigate = useNavigate();

    const [results, setResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const handleSync = useCallback(async () => {
        if (!token) return;
        setIsSyncing(true);
        try {
            // Using loginWithToken to sync also updates the auth context (paid exams, etc.)
            await loginWithToken(token, true);
        } catch(e: any) {
            toast.error(e.message || "Sync failed.");
        } finally {
            setIsSyncing(false);
        }
    }, [token, loginWithToken]);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            userResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(userResults);
            setIsLoading(false);
        }
    }, [user]);

    const stats = useMemo(() => {
        if (results.length === 0) {
            return { totalAttempts: 0, averageScore: 'N/A', bestScore: 'N/A', examsPassed: 0 };
        }
        const totalScore = results.reduce((acc, r) => acc + r.score, 0);
        const averageScore = (totalScore / results.length).toFixed(1) + '%';
        const bestScore = Math.max(...results.map(r => r.score)).toFixed(1) + '%';
        const examsPassed = results.filter(r => {
            const exam = activeOrg?.exams.find(e => e.id === r.examId);
            return exam && r.score >= exam.passScore;
        }).length;

        return { totalAttempts: results.length, averageScore, bestScore, examsPassed };
    }, [results, activeOrg]);

    const examCategories = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(category => {
            const practiceExam = activeOrg.exams.find(e => e.id === category.practiceExamId);
            const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);
            return { ...category, practiceExam, certExam };
        });
    }, [activeOrg]);

    if (isInitializing || isLoading) {
        return <div className="text-center py-10"><Spinner size="lg" /></div>;
    }

    if (!user || !activeOrg) {
        return <p>Could not load dashboard data.</p>;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Welcome back, {user.name}!</h1>
                    <p className="text-slate-500">Ready to ace your next exam?</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Syncing...' : 'Sync My Exams'}
                </button>
            </div>

            {inProgressExam && (
                <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-amber-800">You have an exam in progress!</h3>
                        <p className="text-sm text-amber-700">"{inProgressExam.examName}"</p>
                    </div>
                    <button onClick={() => navigate(`/test/${inProgressExam.examId}`)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg">
                        Resume Exam
                    </button>
                </div>
            )}
            
             {!isSubscribed && (
                 <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-xl shadow-lg flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Star /> Go Premium!</h2>
                        <p className="text-blue-100">Unlock unlimited practice exams and AI-powered study guides.</p>
                    </div>
                    <button onClick={() => navigate('/pricing')} className="bg-white text-cyan-600 font-bold py-2 px-6 rounded-lg transition hover:bg-cyan-50">View Plans</button>
                 </div>
            )}

            {/* My Stats */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">My Stats</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Attempts" value={stats.totalAttempts} icon={<FileText className="text-cyan-600" />} />
                    <StatCard title="Average Score" value={stats.averageScore} icon={<Activity className="text-cyan-600" />} />
                    <StatCard title="Best Score" value={stats.bestScore} icon={<BarChart2 className="text-cyan-600" />} />
                    <StatCard title="Exams Passed" value={stats.examsPassed} icon={<Award className="text-cyan-600" />} />
                </div>
            </div>

            {/* Exam Programs */}
            <div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-4">My Exam Programs</h2>
                 <div className="space-y-6">
                     {examCategories.map(category => (
                        <div key={category.id} id={category.id} className="bg-slate-100 p-6 rounded-xl border border-slate-200">
                             <h3 className="text-xl font-bold text-slate-800 mb-1">{category.name}</h3>
                             <p className="text-slate-500 mb-4">{category.description}</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 {category.practiceExam && <ExamCard exam={category.practiceExam} isPractice={true} isPurchased={false} />}
                                 {category.certExam && <ExamCard exam={category.certExam} isPractice={false} isPurchased={paidExamIds.includes(category.certExam.productSku)} />}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Exam History */}
             <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">My Exam History</h2>
                <div className="space-y-3">
                    {results.length > 0 ? results.slice(0, 5).map(result => {
                        const exam = activeOrg.exams.find(e => e.id === result.examId);
                        if (!exam) return null;
                        const isPass = result.score >= exam.passScore;
                        return (
                            <div key={result.testId} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center hover:bg-slate-100 transition">
                                <div>
                                    <p className="font-semibold text-slate-800">{exam.name}</p>
                                    <p className="text-xs text-slate-500">{new Date(result.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`font-bold text-lg ${isPass ? 'text-green-600' : 'text-red-600'}`}>{result.score}%</span>
                                    {isPass ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                                    <button onClick={() => navigate(`/results/${result.testId}`)} className="text-cyan-600 hover:text-cyan-800">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    }) : <p className="text-center text-slate-500 py-4">You haven't completed any exams yet.</p>}
                     {results.length > 5 && (
                        <div className="text-center mt-4">
                            <button onClick={() => navigate('/profile')} className="font-semibold text-cyan-600 hover:underline">
                                View All History
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
