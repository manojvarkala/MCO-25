import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, Organization } from '../types.ts';
import { Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, ShoppingCart, RefreshCw, PlayCircle, Star, BookOpen } from 'lucide-react';
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

interface ExamCardProps {
    exam: Exam;
    programId: string;
    isPractice: boolean;
    isPurchased: boolean;
    gradientClass: string;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
}

const ExamCard: FC<ExamCardProps> = ({ exam, programId, isPractice, isPurchased, gradientClass, activeOrg, examPrices }) => {
    const navigate = useNavigate();
    const { isSubscribed } = useAuth();
    const canTake = isPractice || isPurchased || isSubscribed;
    const buttonText = isPractice ? 'Start Practice' : canTake ? 'Start Exam' : 'Add to Cart';

    const handleButtonClick = () => {
        if (canTake) {
            navigate(`/test/${exam.id}`);
        } else if (exam.productSku && examPrices && activeOrg) {
            const product = examPrices[exam.productSku];
            if (product && product.productId) {
                const addToCartUrl = `https://www.${activeOrg.website}/cart/?add-to-cart=${product.productId}`;
                window.location.href = addToCartUrl;
            } else {
                 toast.error("This exam cannot be added to the cart at this moment.");
            }
        } else {
            toast.error("This exam is not available for purchase at the moment.");
        }
    };

    const Icon = isPractice ? BookOpen : Award;

    return (
        <div className={`rounded-xl shadow-lg overflow-hidden flex flex-col text-white ${gradientClass}`}>
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/10 p-2 rounded-full">
                        <Icon size={20} />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider">{isPractice ? "Practice Exam" : "Certification Exam"}</span>
                </div>
                
                <h3 className="text-lg font-bold mb-2 leading-tight flex-grow">{exam.name}</h3>

                <div className="flex justify-between text-sm text-white/80 my-4 p-3 bg-black/10 rounded-md">
                    <span><HelpCircle size={14} className="inline mr-1" />{exam.numberOfQuestions} Qs</span>
                    <span><Clock size={14} className="inline mr-1" />{exam.durationMinutes} Mins</span>
                    <span><CheckCircle size={14} className="inline mr-1" />{exam.passScore}% Pass</span>
                </div>
                
                {!canTake && exam.price > 0 && (
                    <div className="text-center mb-4">
                        {exam.regularPrice && exam.regularPrice > exam.price ? (
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-xl line-through text-white/70">${exam.regularPrice.toFixed(2)}</span>
                                <span className="text-4xl font-extrabold text-white">${exam.price.toFixed(2)}</span>
                            </div>
                        ) : (
                            <span className="text-4xl font-extrabold text-white">${exam.price.toFixed(2)}</span>
                        )}
                    </div>
                )}

                <div className="mt-auto space-y-2">
                    <button
                        onClick={handleButtonClick}
                        className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 ${
                            canTake
                                ? 'bg-white text-slate-800 hover:bg-slate-200'
                                : 'bg-yellow-400 hover:bg-yellow-500 text-slate-800'
                        }`}
                    >
                        {isPractice ? <PlayCircle size={18} /> : (canTake ? <PlayCircle size={18} /> : <ShoppingCart size={18} />)}
                        {buttonText}
                    </button>
                    <Link
                        to={`/program/${programId}`}
                        className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all"
                    >
                        View Program Details
                    </Link>
                </div>
            </div>
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
    
    const practiceGradients = ['bg-gradient-to-br from-sky-500 to-cyan-500', 'bg-gradient-to-br from-emerald-500 to-green-500'];
    const certGradients = ['bg-gradient-to-br from-indigo-500 to-purple-600', 'bg-gradient-to-br from-rose-500 to-pink-600'];

    const handleSync = useCallback(async () => {
        if (!token) return;
        setIsSyncing(true);
        try {
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
    }, [user, token]); // Re-run if token changes (after sync)

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

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">My Stats</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Attempts" value={stats.totalAttempts} icon={<FileText className="text-cyan-600" />} />
                    <StatCard title="Average Score" value={stats.averageScore} icon={<Activity className="text-cyan-600" />} />
                    <StatCard title="Best Score" value={stats.bestScore} icon={<BarChart2 className="text-cyan-600" />} />
                    <StatCard title="Exams Passed" value={stats.examsPassed} icon={<Award className="text-cyan-600" />} />
                </div>
            </div>

            <div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-4">My Exam Programs</h2>
                 <div className="space-y-6">
                     {examCategories.map((category, index) => (
                        <div key={category.id} id={category.id} className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <Link to={`/program/${category.id}`} className="group">
                                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-cyan-600 transition">{category.name}</h3>
                            </Link>
                            <p className="text-slate-500 mb-4">{category.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {category.practiceExam && <ExamCard exam={category.practiceExam} programId={category.id} isPractice={true} isPurchased={false} gradientClass={practiceGradients[index % practiceGradients.length]} activeOrg={activeOrg} examPrices={examPrices} />}
                                {category.certExam && <ExamCard exam={category.certExam} programId={category.id} isPractice={false} isPurchased={paidExamIds.includes(category.certExam.productSku)} gradientClass={certGradients[index % certGradients.length]} activeOrg={activeOrg} examPrices={examPrices}/>}
                            </div>
                        </div>
                     ))}
                 </div>
            </div>

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
                            <Link to='/profile' className="font-semibold text-cyan-600 hover:underline">
                                View All History
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;