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

// Unified geo-affiliate link logic
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
    
    const recommendedBooksForProgram = useMemo(() => {
        if (!programData?.certExam?.recommendedBookIds || !suggestedBooks) return [];
        return suggestedBooks.filter(book => programData.certExam.recommendedBookIds.includes(book.id));
    }, [programData, suggestedBooks]);

    const navigationLinks = useMemo(() => {
        if (!activeOrg || !Array.isArray(activeOrg.examProductCategories) || !programId) return { prev: null, next: null };
        const categories = activeOrg.examProductCategories.filter(Boolean);
        const currentIndex = categories.findIndex(cat => cat.id === programId);
        if (currentIndex === -1) return { prev: null, next: null };
        const prevProgram = currentIndex > 0 ? categories[currentIndex - 1] : null;
        const nextProgram = currentIndex < categories.length - 1 ? categories[currentIndex + 1] : null;
        return {
            prev: prevProgram ? { id: prevProgram.id, name: prevProgram.name } : null,
            next: nextProgram ? { id: nextProgram.id, name: nextProgram.name } : null,
        };
    }, [programId, activeOrg]);

    const foundBundle = useMemo(() => {
        if (!bundlesEnabled || !programData?.certExam?.productSku || !examPrices) return null;
        const certSku = programData.certExam.productSku;
        
        // SCAN ALL PRODUCTS for a bundle containing this SKU
        const bundleEntry = Object.entries(examPrices).find(([sku, p]: [string, any]) => 
            p.isBundle === true && Array.isArray(p.bundledSkus) && p.bundledSkus.includes(certSku)
        );

        if (bundleEntry) {
            const [sku, p] = bundleEntry;
            const isSubAddon = sku.includes('addon') || p.type === 'subscription';
            return { product: { ...p, sku }, type: isSubAddon ? 'subscription' as const : 'practice' as const };
        }
        return null;
    }, [programData, examPrices, bundlesEnabled]);

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
                <div className="flex justify-between items-center mt-4 mb-6 border-t border-b border-slate-200 py-3">
                    {navigationLinks.prev ? (
                        <Link to={`/program/${navigationLinks.prev.id}`} className="flex items-center gap-2 text-cyan-600 hover:text-cyan-800 group">
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
                            <div><span className="text-xs text-slate-500">Previous</span><span className="block font-semibold text-sm line-clamp-1">{decodeHtmlEntities(navigationLinks.prev.name)}</span></div>
                        </Link>
                    ) : <div />}
                    {navigationLinks.next ? (
                        <Link to={`/program/${navigationLinks.next.id}`} className="flex items-center gap-2 text-cyan-600 hover:text-cyan-800 text-right group">
                            <div className="text-right"><span className="text-xs text-slate-500">Next</span><span className="block font-semibold text-sm line-clamp-1">{decodeHtmlEntities(navigationLinks.next.name)}</span></div>
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                        </Link>
                    ) : <div />}
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

            {recommendedBooksForProgram.length > 0 && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><BookOpen className="mr-3 text-cyan-500" /> Recommended Study Material</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {recommendedBooksForProgram.map(book => {
                            const linkData = getGeoAffiliateLink(book as RecommendedBook, userGeoCountryCode);
                            if (!linkData) return null;
                            return (
                                <div key={book.id} className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex flex-col transform hover:-translate-y-1 transition-transform">
                                    <BookCover book={book} className="w-full h-40"/>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h4 className="font-bold text-slate-800 text-sm mb-2 leading-tight flex-grow">{decodeHtmlEntities(book.title)}</h4>
                                        <a href={linkData.url} target="_blank" rel="noopener noreferrer" className="mt-auto w-full flex items-center justify-center text-xs text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-2 py-1.5 transition-colors">Buy on {linkData.domainName}</a>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamProgram;
