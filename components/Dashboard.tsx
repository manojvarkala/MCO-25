import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam } from '../types.ts';
import { Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, RefreshCw, PlayCircle, Star, Check, ShoppingBag } from 'lucide-react';
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';

const StatCard: FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-50 p-4 rounded-lg flex items-center">
        <div className="bg-cyan-100 p-3 rounded-full mr-4">{icon}</div>
        <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

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
    
    const { monthlyPrice, yearlyPrice, monthlySubUrl, yearlySubUrl, bundlePrice, bundleRegularPrice, bundleUrl } = useMemo(() => {
        const monthlyData = examPrices?.['sub-monthly'];
        const yearlyData = examPrices?.['sub-yearly'];
        const bundleData = examPrices?.['exam-cpc-cert-1']; // Representative bundle
        const website = activeOrg ? `https://www.${activeOrg.website}` : '';

        return {
            monthlyPrice: monthlyData?.price ?? 19.99,
            yearlyPrice: yearlyData?.price ?? 149.99,
            monthlySubUrl: monthlyData?.productId ? `${website}/cart/?add-to-cart=${monthlyData.productId}` : `${website}/product/monthly-subscription/`,
            yearlySubUrl: yearlyData?.productId ? `${website}/cart/?add-to-cart=${yearlyData.productId}` : `${website}/product/yearly-subscription/`,
            bundlePrice: bundleData?.price ?? 10.00,
            bundleRegularPrice: bundleData?.regularPrice ?? 59.99,
            bundleUrl: `${website}/exam-programs/`
        };
    }, [examPrices, activeOrg]);

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
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2"><Star className="text-yellow-400" /> Unlock Your Full Potential</h2>
                    <p className="text-slate-500 mb-6">Choose a plan to get unlimited access to all practice exams, AI-powered study guides, and more.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                        {/* Monthly Plan Card */}
                        <div className="border border-slate-200 rounded-lg p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-cyan-600">Monthly Subscription</h3>
                            <p className="flex-grow text-slate-500 mt-2 text-sm">Perfect for focused, short-term preparation.</p>
                            <p className="text-4xl font-extrabold text-slate-800 mt-4">${monthlyPrice.toFixed(2)} <span className="text-base font-medium text-slate-500">/month</span></p>
                            <ul className="space-y-2 text-slate-600 mt-4 flex-grow">
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Unlimited Practice Exams</li>
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Unlimited AI Feedback</li>
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Cancel Anytime</li>
                            </ul>
                            <a href={monthlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-6 block w-full bg-cyan-600 text-white font-bold py-3 text-center rounded-lg hover:bg-cyan-700 transition">Subscribe Now</a>
                        </div>

                        {/* Yearly Plan Card (Highlighted) */}
                        <div className="border-2 border-purple-500 rounded-lg p-6 flex flex-col relative transform lg:scale-105">
                            <div className="absolute top-0 -translate-y-1/2 bg-purple-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full">Best Value</div>
                            <h3 className="text-xl font-bold text-purple-600">Yearly Subscription</h3>
                             <p className="flex-grow text-slate-500 mt-2 text-sm">For continuous learning and mastering your craft.</p>
                            <p className="text-4xl font-extrabold text-slate-800 mt-4">${yearlyPrice.toFixed(2)} <span className="text-base font-medium text-slate-500">/year</span></p>
                            <p className="text-sm text-green-600 font-semibold">Saves over 35%!</p>
                            <ul className="space-y-2 text-slate-600 mt-4 flex-grow">
                                 <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Unlimited Practice Exams</li>
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Unlimited AI Feedback</li>
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Billed Annually</li>
                            </ul>
                            <a href={yearlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-6 block w-full bg-purple-600 text-white font-bold py-3 text-center rounded-lg hover:bg-purple-700 transition">Subscribe & Save</a>
                        </div>

                        {/* Exam Bundle Card */}
                        <div className="border border-slate-200 rounded-lg p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-amber-600">Exam Bundle</h3>
                             <p className="flex-grow text-slate-500 mt-2 text-sm">The complete package for one certification.</p>
                             <div className="mt-4">
                                {bundlePrice && bundleRegularPrice && bundleRegularPrice > bundlePrice ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl line-through text-slate-400">${bundleRegularPrice.toFixed(2)}</span>
                                        <span className="text-4xl font-extrabold text-slate-800">${bundlePrice.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-4xl font-extrabold text-slate-800">
                                        {bundlePrice ? `$${bundlePrice.toFixed(2)}` : '$59.99'}
                                    </span>
                                )}
                            </div>
                             <ul className="space-y-2 text-slate-600 mt-4 flex-grow">
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> One Certification Exam</li>
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> 1-Month Unlimited Practice</li>
                                <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> 1-Month Unlimited AI Feedback</li>
                            </ul>
                            <a href={bundleUrl} target="_blank" rel="noopener noreferrer" className="mt-6 block w-full bg-amber-500 text-white font-bold py-3 text-center rounded-lg hover:bg-amber-600 transition">Browse Bundles</a>
                        </div>
                    </div>
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
                            <div className="text-slate-500 mb-4 text-sm" dangerouslySetInnerHTML={{ __html: category.description }} />
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