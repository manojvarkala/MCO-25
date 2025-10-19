import React, { FC, useMemo, useState, useEffect } from 'react';
// FIX: Corrected react-router-dom import to resolve module export errors.
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { RecommendedBook, TestResult } from '../types.ts';
import { BookOpen, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';
import ExamBundleCard from './ExamBundleCard.tsx';
import SubscriptionOfferCard from './SubscriptionOfferCard.tsx';
import ShareButtons from './ShareButtons.tsx';

const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string } | null => {
    const links = book.affiliateLinks;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    let preferredKey: keyof RecommendedBook['affiliateLinks'] = 'com';
    const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
    if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
        preferredKey = 'in';
    } else if (gccTimezones.some(tz => timeZone === tz)) {
        preferredKey = 'ae';
    }

    const preferredUrl = links[preferredKey];
    if (preferredUrl && preferredUrl.trim() !== '') {
        let domainName = 'Amazon.com';
        if (preferredKey === 'in') domainName = 'Amazon.in';
        if (preferredKey === 'ae') domainName = 'Amazon.ae';
        return { url: preferredUrl, domainName };
    }

    const fallbackPriority: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
    for (const key of fallbackPriority) {
        if (key === preferredKey) continue;
        const url = links[key];
        if (url && url.trim() !== '') {
            let domainName = 'Amazon.com';
            if (key === 'in') domainName = 'Amazon.in';
            if (key === 'ae') domainName = 'Amazon.ae';
            return { url, domainName };
        }
    }
    return null;
};

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

const ExamProgram: FC = () => {
    const { programId } = useParams<{ programId: string }>();
    const navigate = useNavigate();
    const { activeOrg, suggestedBooks, isInitializing, examPrices } = useAppContext();
    const { user, paidExamIds, isSubscribed, isEffectivelyAdmin } = useAuth();
    
    const [results, setResults] = useState<TestResult[]>([]);
    
    useEffect(() => {
        if (user) {
            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            setResults(userResults);
        } else {
            setResults([]); // Clear results if user logs out
        }
    }, [user]);

    const programData = useMemo(() => {
        if (!activeOrg || !Array.isArray(activeOrg.examProductCategories) || !Array.isArray(activeOrg.exams) || !programId) {
            return null;
        }

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
    
    const navigationLinks = useMemo(() => {
        if (!activeOrg || !Array.isArray(activeOrg.examProductCategories) || !programId) {
            return { prev: null, next: null };
        }

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

    // This is the critical guard to prevent rendering with incomplete data on a direct page load.
    if (isInitializing || !activeOrg || !activeOrg.exams) {
        return <div className="text-center py-10"><Spinner size="lg" /><p className="mt-2 text-[rgb(var(--color-text-muted-rgb))]">Loading program details...</p></div>;
    }

    if (!programData) {
        return (
            <div className="text-center bg-white p-8 rounded-xl shadow-lg">
                <h1 className="text-2xl font-bold text-slate-800 mt-4">Program Not Found</h1>
                <p className="text-slate-600 mt-2">The exam program you are looking for does not exist or could not be loaded.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const { category, practiceExam, certExam } = programData;
    
    const bundleTypeToShow = useMemo(() => {
        if (!certExam || !examPrices) return null;
        const subBundleSku = `${certExam.productSku}-1mo-addon`;
        const practiceBundleSku = `${certExam.productSku}-1`;

        if (examPrices[subBundleSku]) return 'subscription';
        if (examPrices[practiceBundleSku]) return 'practice';
        return null;
    }, [certExam, examPrices]);

    const certAttempts = user && certExam ? results.filter(r => r.examId === certExam.id).length : undefined;
    const fullDescription = certExam?.description || practiceExam?.description || category.description;
    
    const shareUrl = `${window.location.origin}/program/${category.id}`;
    const shareTitle = stripHtml(category.name);
    const shareText = `Check out the ${shareTitle} program on ${activeOrg.name}! Great for certification prep.`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <main className="lg:col-span-3 space-y-8">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                        <h1 className="text-3xl font-extrabold text-slate-900">{stripHtml(category.name)}</h1>
                        <div className="flex items-center gap-3">
                            {isEffectivelyAdmin && (
                                <Link 
                                    to={`/admin/programs#${category.id}`} 
                                    className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition"
                                    title="Edit Program"
                                >
                                    <Edit size={14} />
                                    Edit Program
                                </Link>
                            )}
                            <ShareButtons shareUrl={shareUrl} shareText={shareText} shareTitle={shareTitle} size={18} />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 mb-6 border-t border-b border-slate-200 py-3">
                        {navigationLinks.prev ? (
                            <Link to={`/program/${navigationLinks.prev.id}`} className="flex items-center gap-2 text-cyan-600 hover:text-cyan-800 transition-colors group">
                                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
                                <div>
                                    <span className="text-xs text-slate-500">Previous</span>
                                    <span className="block font-semibold text-sm line-clamp-1">{stripHtml(navigationLinks.prev.name)}</span>
                                </div>
                            </Link>
                        ) : (
                            <div /> // Placeholder to keep the 'Next' button on the right
                        )}
                        {navigationLinks.next ? (
                            <Link to={`/program/${navigationLinks.next.id}`} className="flex items-center gap-2 text-cyan-600 hover:text-cyan-800 transition-colors text-right group">
                                <div className="text-right">
                                    <span className="text-xs text-slate-500">Next</span>
                                    <span className="block font-semibold text-sm line-clamp-1">{stripHtml(navigationLinks.next.name)}</span>
                                </div>
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                            </Link>
                        ) : (
                            <div /> // Placeholder
                        )}
                    </div>

                    <div className="prose max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: fullDescription }} />
                </div>

                {recommendedBooksForProgram.length > 0 && (
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><BookOpen className="mr-3 text-cyan-500" /> Recommended Study Material</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {recommendedBooksForProgram.map(book => {
                                const linkData = getGeoAffiliateLink(book);
                                if (!linkData) return null;
                                return (
                                    <div key={book.id} className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 w-full flex-shrink-0 flex flex-col transform hover:-translate-y-1 transition-transform duration-200">
                                        <BookCover book={book} className="w-full h-40"/>
                                        <div className="p-4 flex flex-col flex-grow">
                                            <h4 className="font-bold text-slate-800 text-sm mb-2 leading-tight flex-grow">{book.title}</h4>
                                            <a href={linkData.url} target="_blank" rel="noopener noreferrer" className="mt-auto w-full flex items-center justify-center text-xs text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-2 py-1.5 transition-colors">
                                                Buy on {linkData.domainName}
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            <aside className="lg:col-span-2 space-y-8">
                {practiceExam && (
                    <ExamCard 
                        exam={practiceExam} 
                        programId={category.id} 
                        isPractice={true} 
                        isPurchased={false} 
                        activeOrg={activeOrg} 
                        examPrices={examPrices} 
                        hideDetailsLink={true}
                    />
                )}
                {certExam && (
                    <ExamCard 
                        exam={certExam} 
                        programId={category.id} 
                        isPractice={false} 
                        isPurchased={paidExamIds.includes(certExam.productSku)} 
                        activeOrg={activeOrg} 
                        examPrices={examPrices}
                        hideDetailsLink={true}
                        attemptsMade={certAttempts}
                    />
                )}
                {certExam && bundleTypeToShow && (
                    <ExamBundleCard
                        type={bundleTypeToShow}
                        certExam={certExam}
                        activeOrg={activeOrg}
                        examPrices={examPrices}
                    />
                )}
                {!isSubscribed && (
                    <>
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
                    </>
                )}
            </aside>
        </div>
    );
};

export default ExamProgram;