import React, { FC, useMemo, useState, useEffect } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors in this environment.
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate, Link } = ReactRouterDOM as any;
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { RecommendedBook, TestResult } from '../types.ts';
import { BookOpen, ChevronLeft, ChevronRight, Edit, Star, Zap } from 'lucide-react';
import BookCover from './BookCover.tsx'; 
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';
import ExamBundleCard from './ExamBundleCard.tsx';
import SubscriptionOfferCard from './SubscriptionOfferCard.tsx';
import ShareButtons from './ShareButtons.tsx';

// getGeoAffiliateLink, stripHtml, decodeHtmlEntities logic...
const getGeoAffiliateLink = (book: RecommendedBook, userGeoCountryCode: string | null): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } | null => {
    if (!book.affiliateLinks) return null;
    const links = book.affiliateLinks;
    const countryToAmazonKey: Record<string, keyof RecommendedBook['affiliateLinks']> = {
        'us': 'com', 'in': 'in', 'ae': 'ae', 'gb': 'com', 'ca': 'com', 'au': 'com', 
    };
    const domainNames: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.ae' };
    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    let finalDomainName: string | null = null;
    if (userGeoCountryCode && countryToAmazonKey[userGeoCountryCode.toLowerCase()]) {
        const preferredKey = countryToAmazonKey[userGeoCountryCode.toLowerCase()];
        if (links[preferredKey] && links[preferredKey].trim() !== '') {
            finalKey = preferredKey;
            finalDomainName = domainNames[preferredKey] || `Amazon.${preferredKey}`;
        }
    }
    if (!finalKey) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let preferredKeyFromTimezone: keyof RecommendedBook['affiliateLinks'] = 'com';
        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            preferredKeyFromTimezone = 'in';
        } else if (gccTimezones.some(tz => timeZone === tz)) {
            preferredKeyFromTimezone = 'ae';
        }
        if (links[preferredKeyFromTimezone] && links[preferredKeyFromTimezone].trim() !== '') {
            finalKey = preferredKeyFromTimezone;
            finalDomainName = domainNames[preferredKeyFromTimezone] || `Amazon.${preferredKeyFromTimezone}`;
        }
    }
    if (!finalKey) {
        const fallbackPriority: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
        for (const key of fallbackPriority) {
            if (links[key] && links[key].trim() !== '') {
                finalKey = key;
                finalDomainName = domainNames[key] || `Amazon.${key}`;
                break;
            }
        }
    }
    if (finalKey && finalDomainName) {
        try {
            localStorage.setItem('mco_preferred_geo_key', finalKey);
            localStorage.setItem('mco_user_geo_country_code', userGeoCountryCode || 'UNKNOWN');
        } catch(e) {}
        return { url: links[finalKey], domainName: finalDomainName, key: finalKey };
    }
    return null;
};

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) { return html; }
};

const decodeHtmlEntities = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const textarea = document.createElement('div');
        textarea.innerHTML = html;
        return textarea.textContent || textarea.innerText || '';
    } catch (e) { return html; }
};

const ExamProgram: FC = () => {
    const { programId } = useParams();
    const navigate = useNavigate();
    const { activeOrg, suggestedBooks, isInitializing, examPrices, subscriptionsEnabled, bundlesEnabled, userGeoCountryCode } = useAppContext();
    const { user, paidExamIds, isSubscribed, isEffectivelyAdmin, isBetaTester } = useAuth();
    const [results, setResults] = useState<TestResult[]>([]);
    
    useEffect(() => {
        if (user) {
            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            setResults(userResults);
        } else { setResults([]); }
    }, [user]);

    const programData = useMemo(() => {
        if (!activeOrg || !programId) return null;
        const category = activeOrg.examProductCategories.find(cat => cat && cat.id === programId);
        if (!category) return null;
        const practiceExam = activeOrg.exams.find(e => e && e.id === category.practiceExamId);
        const certExam = activeOrg.exams.find(e => e && e.id === category.certificationExamId);
        return { category, practiceExam, certExam };
    }, [programId, activeOrg]);

    const foundBundle = useMemo(() => {
        if (!bundlesEnabled || !programData?.certExam?.productSku || !examPrices) return null;
        const certSku = programData.certExam.productSku;
        
        // PRECISE ADDON TARGETING
        // Favor stored meta if present, otherwise pattern
        const addonSku = programData.certExam.addonSku || `${certSku}-1mo-addon`;
        const p = examPrices[addonSku];
        if (p) {
            return { product: { ...p, sku: addonSku }, type: 'subscription' as const };
        }

        return null;
    }, [programData, examPrices, bundlesEnabled]);

    // Render logic...
    if (isInitializing || !activeOrg || !activeOrg.exams) {
        return <div className="text-center py-10"><Spinner size="lg" /><p className="mt-2 text-[rgb(var(--color-text-muted-rgb))]">Loading program details...</p></div>;
    }

    if (!programData) {
        return (
            <div className="text-center bg-white p-8 rounded-xl shadow-lg">
                <h1 className="text-2xl font-bold text-slate-800 mt-4">Program Not Found</h1>
                <p className="text-slate-600 mt-2">The requested program could not be loaded.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg">Back to Dashboard</button>
            </div>
        );
    }

    const { category, practiceExam, certExam } = programData;
    const certAttempts = user && certExam ? results.filter(r => r.examId === certExam.id).length : undefined;
    const fullDescription = certExam?.description || practiceExam?.description || category.description;
    const mainSiteBaseUrl = `https://${activeOrg.website}`;

    return (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="flex flex-wrap justify-between items-start gap-2">
                    <h1 className="text-3xl font-extrabold text-slate-900">{decodeHtmlEntities(category.name)}</h1>
                    <div className="flex items-center gap-3">
                        {isEffectivelyAdmin && (
                            <Link to={`/admin/programs#${category.id}`} className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition">
                                <Edit size={14} /> Edit Program
                            </Link>
                        )}
                        <ShareButtons shareUrl={`${window.location.origin}/program/${category.id}`} shareText={`Preparing for the ${category.name} exam!`} shareTitle={stripHtml(category.name)} size={18} />
                    </div>
                </div>
                {/* Navigation and description... */}
                <div className="flex justify-between items-center mt-4 mb-6 border-t border-b border-slate-200 py-3">
                    {/* ... NavigationLinks ... */}
                </div>
                <div className="prose max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: fullDescription }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {practiceExam && (
                    <ExamCard exam={practiceExam} programId={category.id} isPractice={true} isPurchased={false} activeOrg={activeOrg} examPrices={examPrices} hideDetailsLink={true} />
                )}
                {certExam && (
                    <ExamCard exam={certExam} programId={category.id} isPractice={false} isPurchased={paidExamIds.includes(certExam.productSku)} activeOrg={activeOrg} examPrices={examPrices} hideDetailsLink={true} attemptsMade={certAttempts} />
                )}
                {foundBundle ? (
                    <ExamBundleCard type={foundBundle.type} bundleDataRaw={foundBundle.product} activeOrg={activeOrg} examPrices={examPrices} />
                ) : (subscriptionsEnabled && !isSubscribed && !isBetaTester) && (
                    <div className="flex flex-col gap-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={10}/> Premium Addon Available</p>
                            <p className="text-xs text-amber-900 leading-relaxed">Unlock <strong>Full Access</strong> to this program's AI study guides and practice resources.</p>
                        </div>
                        <SubscriptionOfferCard 
                            planName="Monthly Access"
                            price={examPrices?.['sub-monthly']?.price || 19.99}
                            priceUnit="mo"
                            url={`${mainSiteBaseUrl}/product/monthly-subscription/`}
                            features={['Practice Material', 'AI Study Guides']}
                            gradientClass="mco-gradient--sub-monthly"
                        />
                    </div>
                )}
            </div>
            {/* Recommended Books Section... */}
        </div>
    );
};

export default ExamProgram;
