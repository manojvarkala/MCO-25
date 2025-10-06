import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam } from '../types.ts';
import { Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, RefreshCw, PlayCircle, Star } from 'lucide-react';
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';
import ExamBundleCard from './ExamBundleCard.tsx';
import SubscriptionOfferCard from './SubscriptionOfferCard.tsx';

const StatCard: FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg flex items-center border border-[rgb(var(--color-border-rgb))]">
        <div className="bg-[rgba(var(--color-primary-rgb),0.1)] p-3 rounded-full mr-4">{icon}</div>
        <div>
            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">{title}</p>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{value}</p>
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
        } else {
            // If no user, we're not loading user-specific data
            setIsLoading(false);
        }
    }, [user, token]); // Re-run if token changes (after sync)

    const stats = useMemo(() => {
        if (!user || results.length === 0) {
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
    }, [results, activeOrg, user]);

    const examCategories = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories.map(category => {
            const practiceExam = activeOrg.exams.find(e => e.id === category.practiceExamId);
            const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);
            return { ...category, practiceExam, certExam };
        });
    }, [activeOrg]);
    
    const { monthlyPrice, yearlyPrice, monthlySubUrl, yearlySubUrl } = useMemo(() => {
        const monthlyData = examPrices?.['sub-monthly'];
        const yearlyData = examPrices?.['sub-yearly'];
        const website = activeOrg ? `https://www.${activeOrg.website}` : '';

        return {
            monthlyPrice: monthlyData?.price ?? 19.99,
            yearlyPrice: yearlyData?.price ?? 149.99,
            monthlySubUrl: monthlyData?.productId ? `${website}/cart/?add-to-cart=${monthlyData.productId}` : `${website}/product/monthly-subscription/`,
            yearlySubUrl: yearlyData?.productId ? `${website}/cart/?add-to-cart=${yearlyData.productId}` : `${website}/product/yearly-subscription/`,
        };
    }, [examPrices, activeOrg]);

    if (isInitializing || isLoading) {
        return <div className="text-center py-10"><Spinner size="lg" /></div>;
    }

    if (!activeOrg) {
        return <p>Could not load dashboard data.</p>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[rgb(var(--color-text-strong-rgb))]">
                        {user ? `Welcome back, ${user.name}!` : "Welcome to the Examination Portal!"}
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))]">
                        {user ? "Ready to ace your next exam?" : "Browse our programs and start your certification journey."}
                    </p>
                </div>
                {user && token && (
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 bg-[rgb(var(--color-muted-rgb))] hover:bg-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-default-rgb))] font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync My Exams'}
                    </button>
                )}
            </div>

            {user && inProgressExam && (
                <div className="bg-[rgba(var(--color-secondary-rgb),0.1)] p-4 rounded-lg border-l-4 border-[rgb(var(--color-secondary-rgb))] flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-[rgb(var(--color-secondary-hover-rgb))]">You have an exam in progress!</h3>
                        <p className="text-sm text-[rgb(var(--color-secondary-hover-rgb))] opacity-80">"{inProgressExam.examName}"</p>
                    </div>
                    <button onClick={() => navigate(`/test/${inProgressExam.examId}`)} className="bg-[rgb(var(--color-secondary-rgb))] hover:bg-[rgb(var(--color-secondary-hover-rgb))] text-white font-bold py-2 px-4 rounded-lg">
                        Resume Exam
                    </button>
                </div>
            )}
            
            {!isSubscribed && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-2 flex items-center gap-2"><Star className="text-yellow-400" /> Unlock Your Full Potential</h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">Get unlimited access to all practice exams and AI study guides with a subscription.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <SubscriptionOfferCard
                            planName="Monthly Subscription"
                            price={monthlyPrice}
                            priceUnit="month"
                            url={monthlySubUrl}
                            features={[
                                'Unlimited Practice Exams',
                                'Unlimited AI Feedback',
                                'Cancel Anytime',
                            ]}
                            gradientClass="bg-gradient-to-br from-cyan-500 to-sky-600"
                        />
                        <SubscriptionOfferCard
                            planName="Yearly Subscription"
                            price={yearlyPrice}
                            priceUnit="year"
                            url={yearlySubUrl}
                            features={[
                                'All Monthly features',
                                'Access All Exam Programs',
                                'Saves over 35%!',
                            ]}
                            isBestValue={true}
                            gradientClass="bg-gradient-to-br from-purple-600 to-indigo-700"
                        />
                    </div>
                </div>
            )}

            {user && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">My Stats</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Total Attempts" value={stats.totalAttempts} icon={<FileText className="text-[rgb(var(--color-primary-rgb))]" />} />
                        <StatCard title="Average Score" value={stats.averageScore} icon={<Activity className="text-[rgb(var(--color-primary-rgb))]" />} />
                        <StatCard title="Best Score" value={stats.bestScore} icon={<BarChart2 className="text-[rgb(var(--color-primary-rgb))]" />} />
                        <StatCard title="Exams Passed" value={stats.examsPassed} icon={<Award className="text-[rgb(var(--color-primary-rgb))]" />} />
                    </div>
                </div>
            )}

            <div>
                 <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Exam Programs</h2>
                 <div className="space-y-6">
                     {examCategories.map((category, index) => {
                         const certAttempts = user && category.certExam ? results.filter(r => r.examId === category.certExam.id).length : undefined;

                         return (
                            <div key={category.id} id={category.id} className="bg-[rgb(var(--color-muted-rgb))] p-6 rounded-xl border border-[rgb(var(--color-border-rgb))]">
                                <Link to={`/program/${category.id}`} className="group">
                                    <h3 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-1 group-hover:text-[rgb(var(--color-primary-rgb))] transition">{category.name}</h3>
                                </Link>
                                <div className="text-[rgb(var(--color-text-muted-rgb))] mb-4 text-sm" dangerouslySetInnerHTML={{ __html: category.description }} />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {category.practiceExam && <ExamCard exam={category.practiceExam} programId={category.id} isPractice={true} isPurchased={false} activeOrg={activeOrg} examPrices={examPrices} />}
                                    {category.certExam && <ExamCard exam={category.certExam} programId={category.id} isPractice={false} isPurchased={paidExamIds.includes(category.certExam.productSku)} activeOrg={activeOrg} examPrices={examPrices} attemptsMade={certAttempts}/>}
                                    {category.certExam && <ExamBundleCard certExam={category.certExam} activeOrg={activeOrg} examPrices={examPrices} />}
                                </div>
                            </div>
                         );
                     })}
                 </div>
            </div>

             {user && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">My Exam History</h2>
                    <div className="space-y-3">
                        {results.length > 0 ? results.slice(0, 5).map(result => {
                            const exam = activeOrg.exams.find(e => e.id === result.examId);
                            if (!exam) return null;
                            const isPass = result.score >= exam.passScore;
                            return (
                                <div key={result.testId} className="bg-[rgb(var(--color-muted-rgb))] p-3 rounded-lg flex justify-between items-center hover:bg-[rgb(var(--color-border-rgb))] transition">
                                    <div>
                                        <p className="font-semibold text-[rgb(var(--color-text-strong-rgb))]">{exam.name}</p>
                                        <p className="text-xs text-[rgb(var(--color-text-muted-rgb))]">{new Date(result.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold text-lg ${isPass ? 'text-[rgb(var(--color-success-rgb))]' : 'text-[rgb(var(--color-danger-rgb))]'}`}>{result.score}%</span>
                                        {isPass ? <CheckCircle size={20} className="text-[rgb(var(--color-success-rgb))]" /> : <XCircle size={20} className="text-[rgb(var(--color-danger-rgb))]" />}
                                        <button onClick={() => navigate(`/results/${result.testId}`)} className="text-[rgb(var(--color-primary-rgb))] hover:text-[rgb(var(--color-primary-hover-rgb))]">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-center text-[rgb(var(--color-text-muted-rgb))] py-4">You haven't completed any exams yet.</p>}
                         {results.length > 5 && (
                            <div className="text-center mt-4">
                                <Link to='/profile' className="font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline">
                                    View All History
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;