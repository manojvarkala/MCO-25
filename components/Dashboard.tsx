import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors.
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM as any;
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, ProductVariation } from '../types.ts';
import { Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, RefreshCw, PlayCircle, Star, Edit, CreditCard, Gift, X, LogOut, ExternalLink } from 'lucide-react';
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';
import ExamBundleCard from './ExamBundleCard.tsx';
import FeaturedBundleCard from './FeaturedBundleCard.tsx';

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) { return html; }
};

const Dashboard: FC = () => {
    const { user, token, paidExamIds, isSubscribed, subscriptionInfo, isBetaTester } = useAuth();
    const { activeOrg, isInitializing, refreshConfig, examPrices, bundlesEnabled, feedbackRequiredForExam } = useAppContext();
    const [results, setResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTesterBannerVisible, setIsTesterBannerVisible] = useState(isBetaTester);
    
    const handleSync = useCallback(async () => {
        if (!user || !token) return;
        setIsSyncing(true);
        const toastId = toast.loading("Syncing latest exams and results...");
        try {
            await refreshConfig();
            const updatedResults = await googleSheetsService.syncResults(user, token);
            updatedResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(updatedResults);
            toast.success("Synchronized successfully!", { id: toastId });
        } catch(e: any) {
            toast.error(`Sync failed: ${e.message}`, { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    }, [user, token, refreshConfig]);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            userResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(userResults);
            setIsLoading(false);
        } else { setIsLoading(false); }
    }, [user]);

    const examCategories = useMemo(() => {
        if (!activeOrg || !activeOrg.examProductCategories || !activeOrg.exams) return [];
        return activeOrg.examProductCategories
            .filter(Boolean)
            .map(category => {
                const practiceExam = activeOrg.exams.find(e => e && e.id === category.practiceExamId);
                const certExam = activeOrg.exams.find(e => e && e.id === category.certificationExamId);
                return { ...category, practiceExam, certExam };
            });
    }, [activeOrg]);

    const featuredBundles = useMemo(() => {
        if (!bundlesEnabled || !examPrices) return [];
        return Object.entries(examPrices)
            .map(([sku, p]: [string, any]) => ({ ...p, sku }))
            .filter((p: any) => p.isBundle && Array.isArray(p.bundledSkus) && p.bundledSkus.length > 1)
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

    if (isInitializing || isLoading || !activeOrg) {
        return <div className="flex flex-col items-center justify-center min-h-[60vh]"><Spinner size="lg" /><p className="mt-2 text-[rgb(var(--color-text-muted-rgb))]">Loading dashboard...</p></div>;
    }

    const mainSiteBaseUrl = `https://${activeOrg.website}`;

    return (
        <div className="space-y-8">
            {/* Beta Banner */}
            {isBetaTester && isTesterBannerVisible && !feedbackRequiredForExam && (
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg shadow-lg flex justify-between items-center">
                    <div>
                        <h3 className="font-bold flex items-center gap-2"><Gift size={16} /> Welcome to the Beta Program!</h3>
                        <p className="text-sm opacity-90 mt-1">Thank you for your help. You have 1-month of premium access. Please <Link to="/feedback" className="font-bold underline hover:text-yellow-200">submit your feedback</Link> to help us improve!</p>
                    </div>
                    <button onClick={() => setIsTesterBannerVisible(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
                </div>
            )}

            {/* Header and Sync */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{user ? `Welcome back, ${user.name}!` : "Welcome!"}</h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))]">Ready to ace your next exam?</p>
                </div>
                {user && token && (
                    <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-100 font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition disabled:opacity-50 shadow-lg">
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Synchronizing...' : 'Sync My Exams'}
                    </button>
                )}
            </div>

            {/* Subscription Status Card */}
            {user && (isSubscribed || isBetaTester) && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                            <Star className="text-cyan-400 fill-cyan-400" size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-white">Premium Membership</h2>
                                <span className="bg-cyan-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg shadow-cyan-500/20">Active</span>
                            </div>
                            <p className="text-slate-400 text-sm mt-1">Full access to all Practice Exams, AI Study Guides, and Certificates.</p>
                            {subscriptionInfo?.nextPaymentDate && (
                                <p className="text-slate-500 text-[10px] uppercase font-bold mt-2 tracking-widest">Next Renewal: {subscriptionInfo.nextPaymentDate}</p>
                            )}
                        </div>
                    </div>
                    <a href={`${mainSiteBaseUrl}/my-account/subscriptions/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-sm transition">
                        Manage Billing <ExternalLink size={14}/>
                    </a>
                </div>
            )}

            {/* Exam Categories */}
            <div className="space-y-10">
                {examCategories.map((category) => {
                    let dashboardBundle = null;
                    if (bundlesEnabled && category.certExam?.productSku && examPrices) {
                        const certSku = category.certExam.productSku;
                        const addonSku = `${certSku}-1mo-addon`;
                        if (examPrices[addonSku]) {
                            dashboardBundle = { product: { ...examPrices[addonSku], sku: addonSku }, type: 'subscription' as const };
                        }
                    }

                    return (
                        <div key={category.id} className="space-y-4">
                            <div className="flex items-end justify-between px-2">
                                <div>
                                    <h3 className="text-2xl font-black text-[rgb(var(--color-text-strong-rgb))] font-display">{category.name}</h3>
                                    <div className="h-1.5 w-12 bg-cyan-500 rounded-full mt-1 shadow-[0_0_8px_rgba(6,182,212,0.4)]"></div>
                                </div>
                                <Link to={`/program/${category.id}`} className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--color-primary-rgb))] hover:text-[rgb(var(--color-primary-hover-rgb))] transition-colors border-b-2 border-transparent hover:border-current pb-1">Program Details →</Link>
                            </div>
                            <div className="mco-grid-container">
                                {category.practiceExam && (
                                    <ExamCard exam={category.practiceExam} programId={category.id} isPractice={true} isPurchased={false} activeOrg={activeOrg} examPrices={examPrices} hideDetailsLink={true} />
                                )}
                                {category.certExam && (
                                    <ExamCard exam={category.certExam} programId={category.id} isPractice={false} isPurchased={paidExamIds.includes(category.certExam.productSku)} activeOrg={activeOrg} examPrices={examPrices} hideDetailsLink={true} attemptsMade={user ? results.filter(r => r.examId === category.certExam!.id).length : 0} />
                                )}
                                {bundlesEnabled && dashboardBundle && (
                                    <ExamBundleCard type={dashboardBundle.type} bundleDataRaw={dashboardBundle.product} activeOrg={activeOrg} examPrices={examPrices} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {bundlesEnabled && featuredBundles.length > 0 && (
                <div className="pt-10 border-t border-slate-800">
                    <h2 className="text-3xl font-black text-[rgb(var(--color-text-strong-rgb))] mb-6 font-display">Specialized Exam Bundles</h2>
                    <div className="mco-grid-container">
                        {featuredBundles.map(bundle => <FeaturedBundleCard key={bundle.sku} bundle={bundle} activeOrg={activeOrg} />)}
                    </div>
                </div>
            )}
        </div>
    );
};
export default Dashboard;