import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, ProductVariation } from '../types.ts';
import { Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, RefreshCw, PlayCircle, Star, Edit, CreditCard, Gift, X } from 'lucide-react';
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';
import ExamBundleCard from './ExamBundleCard.tsx';
import SubscriptionOfferCard from './SubscriptionOfferCard.tsx';
import ShareButtons from './ShareButtons.tsx';
import FeaturedBundleCard from './FeaturedBundleCard.tsx';

const StatCard: FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-[rgb(var(--color-muted-rgb))] p-4 rounded-lg flex items-center border border-[rgb(var(--color-border-rgb))]">
        <div className="bg-[rgba(var(--color-primary-rgb),0.1)] p-3 rounded-full mr-4">{icon}</div>
        <div>
            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">{title}</p>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{value}</p>
        </div>
    </div>
);

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

const Dashboard: FC = () => {
    const { user, token, paidExamIds, isSubscribed, subscriptionInfo, loginWithToken, isEffectivelyAdmin, isBetaTester } = useAuth();
    const { activeOrg, isInitializing, inProgressExam, examPrices, subscriptionsEnabled, bundlesEnabled, feedbackRequiredForExam } = useAppContext();
    const navigate = useNavigate();

    const [results, setResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTesterBannerVisible, setIsTesterBannerVisible] = useState(isBetaTester);
    
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
            setIsLoading(false);
        }
    }, [user, token]);

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
        if (!activeOrg || !activeOrg.examProductCategories || !Array.isArray(activeOrg.examProductCategories) || !activeOrg.exams || !Array.isArray(activeOrg.exams)) {
            return [];
        }
        return activeOrg.examProductCategories
            .filter(Boolean)
            .map(category => {
                const practiceExam = activeOrg.exams.find(e => e && e.id === category.practiceExamId);
                const certExam = activeOrg.exams.find(e => e && e.id === category.certificationExamId);
                    
                return { ...category, practiceExam, certExam };
            });
    }, [activeOrg]);
    
    const { monthlyPrice, monthlyRegularPrice, yearlyPrice, yearlyRegularPrice, monthlySubUrl, yearlySubUrl } = useMemo(() => {
        // With new flat structure, look for SKU keys directly
        const monthlyData = examPrices?.['sub-monthly'];
        const yearlyData = examPrices?.['sub-yearly'];
        const website = activeOrg ? `https://${activeOrg.website}` : '';

        return {
            monthlyPrice: monthlyData?.price ?? 19.99,
            monthlyRegularPrice: monthlyData?.regularPrice,
            yearlyPrice: yearlyData?.price ?? 149.99,
            yearlyRegularPrice: yearlyData?.regularPrice,
            monthlySubUrl: monthlyData?.productId ? `${website}/cart/?add-to-cart=${monthlyData.productId}` : `${website}/product/monthly-subscription/`,
            yearlySubUrl: yearlyData?.productId ? `${website}/cart/?add-to-cart=${yearlyData.productId}` : `${website}/product/yearly-subscription/`,
        };
    }, [examPrices, activeOrg]);

    const featuredBundles = useMemo(() => {
        if (!bundlesEnabled || !examPrices) return [];
        return Object.values(examPrices)
            .filter((p: any) => p.isBundle && p.bundledSkus && p.bundledSkus.length > 1)
            .map((p: any): ProductVariation => ({
                id: p.productId?.toString() || p.sku,
                sku: p.sku,
                name: stripHtml(p.name),
                type: 'bundle',
                salePrice: p.price?.toString() || '0',
                regularPrice: p.regularPrice?.toString() || '0',
                isBundle: true,
                bundledSkus: p.bundledSkus,
            }))
            .sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    }, [examPrices, bundlesEnabled]);

    if (isInitializing || isLoading || !activeOrg || !Array.isArray(activeOrg.examProductCategories) || !Array.isArray(activeOrg.exams)) {
        return <div className="text-center py-10"><Spinner size="lg" /><p className="mt-2 text-[rgb(var(--color-text-muted-rgb))]">Loading dashboard data...</p></div>;
    }

    const myAccountUrl = activeOrg ? `https://www.${activeOrg.website}/my-account/` : '#';

    return (
        <div className="space-y-8">
            {isBetaTester && isTesterBannerVisible && !feedbackRequiredForExam && (
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg shadow-lg flex justify-between items-center">
                    <div>
                        <h3 className="font-bold flex items-center gap-2"><Gift size={16} /> Welcome to the Beta Program!</h3>
                        <p className="text-sm opacity-90 mt-1">Thank you for your help. You have 1-month of premium access. Please <Link to="/feedback" className="font-bold underline hover:text-yellow-200">submit your feedback</Link> to help us improve!</p>
                    </div>
                    <button onClick={() => setIsTesterBannerVisible(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Dismiss">
                        <X size={20} />
                    </button>
                </div>
            )}
            {isBetaTester && feedbackRequiredForExam && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-r-lg" role="alert">
                    <p className="font-bold">Feedback Required</p>
                    <p>Please <Link to="/feedback" className="font-semibold underline">submit your feedback</Link> for the <strong>{feedbackRequiredForExam.examName}</strong> exam to unlock other tests.</p>
                </div>
            )}
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
            
            {/* Show Subscription Status if User HAS a subscription OR if subscriptions are ENABLED */}
            {user && subscriptionInfo && (
                 <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
                     <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4 flex items-center gap-2"><CreditCard className="text-[rgb(var(--color-primary-rgb))]" /> Subscription Status</h2>
                     {isSubscribed ? (
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <p className="text-sm text-green-400 font-semibold">STATUS: ACTIVE</p>
                                <p className="text-lg font-bold">You have full access to all practice exams.</p>
                                {subscriptionInfo.nextPaymentDate && (
                                    <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Your subscription will renew on {subscriptionInfo.nextPaymentDate}.</p>
                                )}
                            </div>
                            <a href={myAccountUrl} target="_blank" rel="noopener noreferrer" className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg text-sm hover:bg-slate-300 transition">
                                Manage Subscription
                            </a>
                        </div>
                     ) : (
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <p className="text-sm text-yellow-400 font-semibold">STATUS: INACTIVE</p>
                                <p className="text-lg font-bold">Your subscription has expired or is on hold.</p>
                                <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Renew now to regain access to all premium features.</p>
                            </div>
                            <Link to="/pricing" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition">
                                Renew Now
                            </Link>
                        </div>
                     )}
                 </div>
            )}


            {/* CONDITIONAL RENDERING: Only show subscription offers if enabled in backend */}
            {subscriptionsEnabled && !isSubscribed && !subscriptionInfo && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-2 flex items-center gap-2"><Star className="text-yellow-400" /> Unlock Your Full Potential</h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">Get unlimited access to all practice exams and AI study guides with a subscription.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <SubscriptionOfferCard
                            planName="Monthly Subscription"
                            price={monthlyPrice}
                            regularPrice={monthlyRegularPrice}
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
                            regularPrice={yearlyRegularPrice}
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

            {/* Exam Programs Grid */}
            <div>
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4 flex items-center gap-2">
                    <FileText className="text-[rgb(var(--color-primary-rgb))]" /> Exam Programs
                </h2>
                {examCategories.length > 0 ? (
                    <div className="space-y-8">
                        {examCategories.map((category) => (
                            <div key={category.id} className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{category.name}</h3>
                                        <p className="text-sm text-[rgb(var(--color-text-muted-rgb))] mt-1 line-clamp-2">{stripHtml(category.description)}</p>
                                    </div>
                                    <Link 
                                        to={`/program/${category.id}`} 
                                        className="text-sm font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline flex-shrink-0"
                                    >
                                        View Program Details →
                                    </Link>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {category.practiceExam && (
                                        <ExamCard
                                            exam={category.practiceExam}
                                            programId={category.id}
                                            isPractice={true}
                                            isPurchased={false}
                                            activeOrg={activeOrg}
                                            examPrices={examPrices}
                                            hideDetailsLink={true}
                                        />
                                    )}
                                    {category.certExam && (
                                        <ExamCard
                                            exam={category.certExam}
                                            programId={category.id}
                                            isPractice={false}
                                            isPurchased={paidExamIds.includes(category.certExam.productSku)}
                                            activeOrg={activeOrg}
                                            examPrices={examPrices}
                                            hideDetailsLink={true}
                                            attemptsMade={user ? results.filter(r => r.examId === category.certExam!.id).length : 0}
                                            isDisabled={isBetaTester && feedbackRequiredForExam !== null && feedbackRequiredForExam.examId !== category.certExam.id}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-[rgb(var(--color-card-rgb))] rounded-xl border border-[rgb(var(--color-border-rgb))]">
                        <p className="text-[rgb(var(--color-text-muted-rgb))]">No exam programs are currently available.</p>
                    </div>
                )}
            </div>

            {featuredBundles.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-2">Well Curated Exam Bundles</h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-4">Get the best value with our comprehensive study packages.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredBundles.map(bundle => (
                            <FeaturedBundleCard
                                key={bundle.sku}
                                bundle={bundle}
                                activeOrg={activeOrg}
                            />
                        ))}
                    </div>
                </div>
            )}

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
                                        <p className="font-semibold text-[rgb(var(--color-text-strong-rgb))]">{stripHtml(exam.name)}</p>
                                        <p className="text-xs text-[rgb(var(--color-text-muted-rgb))]">{new Date(result.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold text-lg ${isPass ? 'text-[rgb(var(--color-success-rgb))]' : 'text-[rgb(var(--color-danger-rgb))]'}`}>{result.score.toFixed(0)}%</span>
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