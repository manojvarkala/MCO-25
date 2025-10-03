import React, { FC, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import type { RecommendedBook } from '../types.ts';
import { BookOpen } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';
import Spinner from './Spinner.tsx';
import ExamCard from './ExamCard.tsx';

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
    const { paidExamIds } = useAuth();
    
    const practiceGradients = ['bg-gradient-to-br from-sky-500 to-cyan-500', 'bg-gradient-to-br from-emerald-500 to-green-500'];
    const certGradients = ['bg-gradient-to-br from-indigo-500 to-purple-600', 'bg-gradient-to-br from-rose-500 to-pink-600'];

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


    if (isInitializing) {
        return <div className="text-center py-10"><Spinner size="lg" /></div>;
    }

    if (!programData || !activeOrg) {
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
    const fullDescription = certExam?.description || practiceExam?.description || category.description;

    return (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h1 className="text-3xl font-extrabold text-slate-900">{category.name}</h1>
                <div className="mt-4 text-lg text-slate-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: fullDescription }} />
            </div>

            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Available Exams</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {practiceExam && (
                        <ExamCard 
                            exam={practiceExam} 
                            programId={category.id} 
                            isPractice={true} 
                            isPurchased={false} 
                            gradientClass={practiceGradients[0]} 
                            activeOrg={activeOrg} 
                            examPrices={examPrices} 
                        />
                    )}
                    {certExam && (
                        <ExamCard 
                            exam={certExam} 
                            programId={category.id} 
                            isPractice={false} 
                            isPurchased={paidExamIds.includes(certExam.productSku)} 
                            gradientClass={certGradients[0]} 
                            activeOrg={activeOrg} 
                            examPrices={examPrices}
                        />
                    )}
                </div>
            </div>

            {recommendedBooksForProgram.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BookOpen className="mr-3 text-cyan-500" /> Recommended Study Material</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommendedBooksForProgram.map(book => {
                            const linkData = getGeoAffiliateLink(book);
                            if (!linkData) return null;
                            return (
                                <div key={book.id} className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 w-full flex-shrink-0">
                                    <BookCover book={book} className="w-full h-32"/>
                                    <div className="p-3">
                                        <h4 className="font-bold text-slate-800 text-xs mb-2 leading-tight">{book.title}</h4>
                                        <a href={linkData.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center text-xs text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-2 py-1.5 transition-colors">
                                            Buy on {linkData.domainName}
                                        </a>
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
