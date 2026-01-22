import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors in this environment.
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM as any;
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, ProductVariation } from '../types.ts';
import { Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, RefreshCw, PlayCircle, Star, Edit, CreditCard, Gift, X, LogOut, ExternalLink, Zap, ShoppingBag, Rocket } from 'lucide-react';
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';
import ExamBundleCard from './ExamBundleCard.tsx';
import FeaturedBundleCard from './FeaturedBundleCard.tsx';
import SubscriptionOfferCard from './SubscriptionOfferCard.tsx';

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) { return html; }
};

const Dashboard: FC = () => {
    const { user, token, paidExamIds, isSubscribed, subscriptionInfo, isBetaTester, refreshEntitlements } = useAuth();
    const { activeOrg, isInitializing, refreshConfig, examPrices, bundlesEnabled, subscriptionsEnabled, feedbackRequiredForExam } = useAppContext();
    const [results, setResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTesterBannerVisible, setIsTesterBannerVisible] = useState(isBetaTester);
    
    const handleSync = useCallback(async () => {
        if (!user || !token) return;
        setIsSyncing(true);
        const toastId = toast.loading("Synchronizing access and results...");
        try {
            // 1. Refresh global app config
            await refreshConfig();
            // 2. Refresh user entitlements (Paid Exams & Subscriptions)
            await refreshEntitlements();
            // 3. Sync exam history
            const updatedResults = await googleSheetsService.syncResults(user, token);
            updatedResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(updatedResults);
            toast.success("Synchronized successfully!", { id: toastId });
        } catch(e: any) {
            toast.error(`Sync failed: ${e.message}`, { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    }, [user, token, refreshConfig, refreshEntitlements]);

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

    // Highlight purchased exams for the top section
    const purchasedExams = useMemo(() => {
        if (!activeOrg || !activeOrg.exams) return [];
        
        // Normalize IDs to lower case and trim for robust matching
        const normalizedPaidIds = (paidExamIds || []).map(id => id.toString().trim().toLowerCase());
        
        return activeOrg.exams.filter(e => {
            if (e.isPractice) return false;
            
            // If user is subscribed/beta, all certifications are effectively "purchased" (unlocked)
            if (isSubscribed || isBetaTester) return true;
            
            // Otherwise, check for direct ownership via SKU
            const sku = (e.productSku || '').trim().toLowerCase();
            return normalizedPaidIds.includes(sku);
        });
    }, [activeOrg, paidExamIds, isSubscribed, isBetaTester]);

    const featuredBundles = useMemo(() => {
        if (!bundlesEnabled || !examPrices) return [];
        return Object.entries(examPrices)
            .map(([sku, p]: [string, any]) => ({ ...p, sku }))
            .filter((p: any) => {
                const isExplicitBundle = p.isBundle === true || p.isBundle === 'yes';
                const hasMultipleItems = Array.isArray(p.bundledSkus) && p.bundledSkus.length > 1;
                const isSubscriptionAddon = p.sku.includes('-1mo-addon');
                return (isExplicitBundle || hasMultipleItems || isSubscriptionAddon) && !p.sku.startsWith('sub-');
            })
            .map((p: any): ProductVariation => ({
                id: p.productId?.toString() || p.sku,
                sku: p.sku,
                name: stripHtml(p.name),
                // Visual mapping for styling: Addons and recurring subs use 'subscription' for Teal colors.
                // Actual bundles use 'bundle' for Purple colors.
                type: (p.sku.includes('addon') || p.type === 'subscription') ? 'subscription' : 'bundle',
                salePrice: p.price?.toString() || '0',
                regularPrice: p.regularPrice?.toString() || '0',
                isBundle: true,
                bundledSkus: p.bundledSkus || [],
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
                    <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-slate-100 font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition disabled:opacity-50 shadow-lg">
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Synchronizing...' : 'Sync My Exams'}
                    </button>
                )}
            </div>

            {/* Subscription Status */}
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

            {/* NEW: PROMINENT PURCHASED EXAMS (Pinned to Top) */}
            {purchasedExams.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Rocket className="text-emerald-500" size={20} />
                        <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">Your Unlocked Certifications</h2>
                    </div>
                    <div className="mco-grid-container">
                        {purchasedExams.map(exam => (
                            <ExamCard 
                                key={exam.id} 
                                exam={exam} 
                                programId="" 
                                isPractice={false} 
                                isPurchased={true} 
                                activeOrg={activeOrg} 
                                examPrices={examPrices} 
                                hideDetailsLink={true}
                                attemptsMade={user ? results.filter(r => r.examId === exam.id).length : 0} 
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upgrade Grid for Non-Subscribers */}
            {user && !isSubscribed && !isBetaTester && subscriptionsEnabled && (
                <div className="mco-subscription-grid">
                    <SubscriptionOfferCard 
                        planName="Monthly Access"
                        price={examPrices?.['sub-monthly']?.price || 19.99}
                        regularPrice={examPrices?.['sub-monthly']?.regularPrice}
                        priceUnit="month"
                        url={`${mainSiteBaseUrl}/product/monthly-subscription/`}
                        features={['ALL Practice Exams', 'AI Study Guides', 'Priority Support']}
                        gradientClass="mco-gradient--sub-monthly"
                    />
                    <SubscriptionOfferCard 
                        planName="Yearly Access"
                        price={examPrices?.['sub-yearly']?.price || 149.99}
                        regularPrice={examPrices?.['sub-yearly']?.regularPrice}
                        priceUnit="year"
                        isBestValue={true}
                        url={`${mainSiteBaseUrl}/product/yearly-subscription/`}
                        features={['ALL Monthly Features', 'Free Certification Retakes', '35% Massive Savings']}
                        gradientClass="mco-gradient--sub-yearly"
                    />
                </div>
            )}

            {/* Special Bundles Section */}
            {bundlesEnabled && featuredBundles.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="p-2 bg-amber-50/10 rounded-lg text-amber-500">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">Exclusive Value Bundles</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Premium Examination Packages</p>
                        </div>
                    </div>
                    <div className="mco-grid-container">
                        {featuredBundles.map(bundle => (
                            <FeaturedBundleCard key={bundle.sku} bundle={bundle} activeOrg={activeOrg} />
                        ))}
                    </div>
                </div>
            )}

            {/* Exam Categories */}
            <div className="space-y-10">
                {examCategories.map((category) => {
                    let dashboardBundle = null;
                    if (bundlesEnabled && category.certExam?.productSku && examPrices) {
                        const certSku = category.certExam.productSku;
                        const addonSku = category.certExam.addonSku || `${certSku}-1mo-addon`;
                        const p = examPrices[addonSku];
                        
                        if (p) {
                            dashboardBundle = { 
                                product: { ...p, sku: addonSku }, 
                                type: 'subscription' as const 
                            };
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
                                    <ExamCard exam={category.practiceExam} programId={category.id} isPractice={true} isPurchased={false} activeOrg={activeOrg} hideDetailsLink={true} examPrices={examPrices} />
                                )}
                                {category.certExam && (
                                    <ExamCard exam={category.certExam} programId={category.id} isPractice={false} isPurchased={paidExamIds.includes(category.certExam.productSku)} activeOrg={activeOrg} hideDetailsLink={true} attemptsMade={user ? results.filter(r => r.examId === category.certExam!.id).length : 0} examPrices={examPrices} />
                                )}
                                {bundlesEnabled && dashboardBundle && (
                                    <ExamBundleCard type={dashboardBundle.type} bundleDataRaw={dashboardBundle.product} activeOrg={activeOrg} examPrices={examPrices} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
export default Dashboard;