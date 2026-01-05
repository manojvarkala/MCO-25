import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, ProductVariation } from '../types.ts';
import { Activity, BarChart2, Clock, HelpCircle, FileText, CheckCircle, XCircle, ChevronRight, Award, RefreshCw, PlayCircle, Star, Edit, CreditCard, Gift, X, LogOut } from 'lucide-react';
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
        return <div className="text-center py-10"><Spinner size="lg" /><p className="mt-2 text-[rgb(var(--color-text-muted-rgb))]">Loading dashboard...</p></div>;
    }

    return (
        <div className="space-y-8">
            {isBetaTester && isTesterBannerVisible && !feedbackRequiredForExam && (
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg shadow-lg flex justify-between items-center">
                    <div>
                        <h3 className="font-bold flex items-center gap-2"><Gift size={16} /> Welcome to the Beta Program!</h3>
                        <p className="text-sm opacity-90 mt-1">Thank you for your help. You have 1-month of premium access. Please <Link to="/feedback" className="font-bold underline hover:text-yellow-200">submit your feedback</Link> to help us improve!</p>
                    </div>
                    <button onClick={() => setIsTesterBannerVisible(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
                </div>
            )}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{user ? `Welcome back, ${user.name}!` : "Welcome!"}</h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))]">Ready to ace your next exam?</p>
                </div>
                {user && token && (
                    <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 bg-[rgb(var(--color-muted-rgb))] hover:bg-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-default-rgb))] font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync My Exams'}
                    </button>
                )}
            </div>

            <div className="space-y-8">
                {examCategories.map((category) => {
                    let dashboardBundle = null;
                    if (bundlesEnabled && category.certExam?.productSku && examPrices) {
                        const certSku = category.certExam.productSku;
                        const subBundleSku = `${certSku}-1mo-addon`;
                        const practiceBundleSku = `${certSku}-1`;

                        if (examPrices[subBundleSku]) {
                            dashboardBundle = { product: { ...examPrices[subBundleSku], sku: subBundleSku }, type: 'subscription' as const };
                        } else if (examPrices[practiceBundleSku]) {
                            dashboardBundle = { product: { ...examPrices[practiceBundleSku], sku: practiceBundleSku }, type: 'practice' as const };
                        }
                    }

                    return (
                        <div key={category.id} className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))]">{category.name}</h3>
                                <Link to={`/program/${category.id}`} className="text-sm font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline">View Details →</Link>
                            </div>
                            <div className="mco-grid-container">
                                {category.practiceExam && (
                                    <ExamCard exam={category.practiceExam} programId={category.id} isPractice={true} isPurchased={false} activeOrg={activeOrg} examPrices={examPrices} hideDetailsLink={true} />
                                )}
                                {category.certExam && (
                                    <ExamCard exam={category.certExam} programId={category.id} isPractice={false} isPurchased={paidExamIds.includes(category.certExam.productSku)} activeOrg={activeOrg} examPrices={examPrices} hideDetailsLink={true} attemptsMade={user ? results.filter(r => r.examId === category.certExam!.id).length : 0} />
                                )}
                                {dashboardBundle && (
                                    <ExamBundleCard type={dashboardBundle.type} bundleDataRaw={dashboardBundle.product} activeOrg={activeOrg} examPrices={examPrices} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {featuredBundles.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-4">Curated Exam Bundles</h2>
                    <div className="mco-grid-container">
                        {featuredBundles.map(bundle => <FeaturedBundleCard key={bundle.sku} bundle={bundle} activeOrg={activeOrg} />)}
                    </div>
                </div>
            )}
        </div>
    );
};
export default Dashboard;