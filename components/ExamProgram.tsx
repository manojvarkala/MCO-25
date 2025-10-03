import React, { FC, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import type { Exam, RecommendedBook } from '../types.ts';
import { BookOpen, CheckCircle, Clock, HelpCircle, PlayCircle, ShoppingCart, Award, ShoppingBag } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';
import Spinner from './Spinner.tsx';

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

const ExamProgram: FC = () => {
    const { programId } = useParams<{ programId: string }>();
    const navigate = useNavigate();
    const { activeOrg, suggestedBooks, isInitializing, examPrices } = useAppContext();
    const { paidExamIds, isSubscribed } = useAuth();

    const programData = useMemo(() => {
        if (!activeOrg || !programId) return null;

        const category = activeOrg.examProductCategories.find(cat => cat.id === programId);
        if (!category) return null;

        const practiceExam = activeOrg.exams.find(e => e.id === category.practiceExamId);
        const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);

        return { category, practiceExam, certExam };
    }, [programId, activeOrg]);
    
    const recommendedBooksForProgram = useMemo(() => {
        if (!programData?.certExam?.recommendedBookIds || !suggestedBooks) return [];
        return suggestedBooks.filter(book => programData.certExam.recommendedBookIds.includes(book.id));
    }, [programData, suggestedBooks]);

    const { certExam } = programData || {};
    const isCertPurchased = certExam ? paidExamIds.includes(certExam.productSku) : false;
    const canTakeCert = isSubscribed || isCertPurchased;

    const bundleProductSku = useMemo(() => {
        if (!certExam?.productSku) return null;
        // Bundles are often sold as a separate product with a specific SKU pattern
        return `${certExam.productSku}-1`;
    }, [certExam]);

    const bundlePriceData = useMemo(() => {
        if (!bundleProductSku || !examPrices) return null;
        return examPrices[bundleProductSku];
    }, [bundleProductSku, examPrices]);

    const bundleAddToCartUrl = useMemo(() => {
        if (!bundlePriceData?.productId || !activeOrg) return null;
        return `https://www.${activeOrg.website}/cart/?add-to-cart=${bundlePriceData.productId}`;
    }, [bundlePriceData, activeOrg]);


    if (isInitializing) {
        return <div className="text-center py-10"><Spinner size="lg" /></div>;
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

    const { category, practiceExam } = programData;
    const imageUrl = certExam?.imageUrl || practiceExam?.imageUrl;

    const handleButtonClick = (exam: Exam, canTake: boolean) => {
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
    
    // Use the most detailed description available
    const fullDescription = certExam?.description || practiceExam?.description || category.description;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
                 {imageUrl && (
                    <div className="rounded-xl shadow-lg overflow-hidden relative">
                        <img src={imageUrl} alt={category.name} className="w-full h-48 md:h-64 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-8">
                            <h1 className="text-3xl font-extrabold text-white shadow-md">{category.name}</h1>
                        </div>
                    </div>
                )}
                <div className={`bg-white p-8 rounded-xl shadow-lg border border-slate-200 ${imageUrl ? '-mt-8 relative z-10' : ''}`}>
                    {!imageUrl && <h1 className="text-3xl font-extrabold text-slate-900">{category.name}</h1>}
                    <div className="mt-2 text-lg text-slate-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: fullDescription }} />
                </div>
                
                 {recommendedBooksForProgram.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BookOpen className="mr-3 text-cyan-500" /> Recommended Books</h3>
                        <div className="space-y-4">
                            {recommendedBooksForProgram.map(book => {
                                const linkData = getGeoAffiliateLink(book);
                                if (!linkData) return null;
                                return (
                                    <div key={book.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <BookCover book={book} className="w-16 h-20 flex-shrink-0" />
                                        <div className="flex-grow">
                                            <h4 className="font-semibold text-sm text-slate-800 leading-tight">{book.title}</h4>
                                                <a href={linkData.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-2 py-1 transition-colors">
                                                Buy on {linkData.domainName}
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar with Exam Cards */}
            <aside className="space-y-6 lg:col-span-1">
                {practiceExam && (
                    <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-cyan-500 relative overflow-hidden">
                        <div className="absolute top-2 -right-10">
                            <div className="bg-green-500 text-white text-xs font-bold uppercase py-1 px-8 transform rotate-45">
                                Free
                            </div>
                        </div>
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-3"><BookOpen />{practiceExam.name}</h3>
                        <div className="flex justify-between text-sm text-slate-600 my-4 p-3 bg-slate-50 rounded-md">
                            <span><HelpCircle size={14} className="inline mr-1" />{practiceExam.numberOfQuestions} Qs</span>
                            <span><Clock size={14} className="inline mr-1" />{practiceExam.durationMinutes} Mins</span>
                            <span><CheckCircle size={14} className="inline mr-1" />{practiceExam.passScore}% Pass</span>
                        </div>
                        <button
                            onClick={() => handleButtonClick(practiceExam, true)}
                            className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-transform transform hover:scale-105"
                        >
                            <PlayCircle size={18} />
                            Start Practice
                        </button>
                    </div>
                )}
                
                {certExam && (
                    <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-amber-500">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-3"><Award />{certExam.name}</h3>
                        <div className="flex justify-between text-sm text-slate-600 my-4 p-3 bg-slate-50 rounded-md">
                            <span><HelpCircle size={14} className="inline mr-1" />{certExam.numberOfQuestions} Qs</span>
                            <span><Clock size={14} className="inline mr-1" />{certExam.durationMinutes} Mins</span>
                            <span><CheckCircle size={14} className="inline mr-1" />{certExam.passScore}% Pass</span>
                        </div>
                        
                        {!canTakeCert && certExam.price > 0 && (
                            <div className="text-center mb-4">
                                {certExam.regularPrice && certExam.regularPrice > certExam.price ? (
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-lg line-through text-slate-500">${certExam.regularPrice.toFixed(2)}</span>
                                        <span className="text-3xl font-bold text-slate-800">${certExam.price.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-3xl font-bold text-slate-800">${certExam.price.toFixed(2)}</span>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => handleButtonClick(certExam, canTakeCert)}
                            className={`w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 ${
                                canTakeCert ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                        >
                            {canTakeCert ? <PlayCircle size={18} /> : <ShoppingCart size={18} />}
                            {canTakeCert ? 'Start Exam' : 'Add to Cart'}
                        </button>
                    </div>
                )}

                {certExam && !canTakeCert && bundlePriceData && bundleAddToCartUrl && (
                    <div className="bg-white p-6 rounded-xl shadow-md border-2 border-purple-500 relative">
                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full">Best Value</div>
                        <h3 className="font-bold text-xl text-purple-600 flex items-center gap-3"><ShoppingBag /> Exam Bundle</h3>
                        <div className="text-center my-4">
                            {bundlePriceData.regularPrice && bundlePriceData.regularPrice > bundlePriceData.price ? (
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-lg line-through text-slate-500">${bundlePriceData.regularPrice.toFixed(2)}</span>
                                    <span className="text-3xl font-bold text-slate-800">${bundlePriceData.price.toFixed(2)}</span>
                                </div>
                            ) : (
                                <span className="text-3xl font-bold text-slate-800">${bundlePriceData.price.toFixed(2)}</span>
                            )}
                        </div>
                        <ul className="space-y-2 text-slate-600 text-sm mb-4">
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> One Certification Exam</li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 1-Month Unlimited Practice</li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 1-Month Unlimited AI Feedback</li>
                        </ul>
                        <a
                            href={bundleAddToCartUrl}
                            className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-transform transform hover:scale-105"
                        >
                            <ShoppingCart size={18} />
                            Add Bundle to Cart
                        </a>
                    </div>
                )}
            </aside>
        </div>
    );
};

export default ExamProgram;