import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { BookOpen, ShoppingCart } from 'lucide-react';
import type { RecommendedBook } from '../types.ts';
import BookCover from '../assets/BookCover.tsx';

const SuggestedBooksSidebar: React.FC = () => {
    const { suggestedBooks, isInitializing } = useAppContext();

    const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string } => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let domainKey: keyof RecommendedBook['affiliateLinks'] = 'com';
        let domainName = 'Amazon.com';

        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            domainKey = 'in';
            domainName = 'Amazon.in';
        } 
        else if (gccTimezones.some(tz => timeZone === tz)) {
            domainKey = 'ae';
            domainName = 'Amazon.ae';
        }
        
        const url = book.affiliateLinks[domainKey];
        if (!url) {
            return { url: book.affiliateLinks.com, domainName: 'Amazon.com' };
        }
        return { url, domainName };
    };

    if (isInitializing) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <BookOpen className="mr-3 text-cyan-500" /> Study Hall
                </h3>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                         <div key={i} className="flex gap-4 animate-pulse">
                            <div className="w-16 h-20 bg-slate-200 rounded"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                <div className="h-3 bg-slate-200 rounded w-full"></div>
                                 <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (suggestedBooks.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <BookOpen className="mr-3 text-cyan-500" /> Study Hall
            </h3>
            <p className="text-sm text-slate-500 mb-6">Explore these recommended books to deepen your knowledge and prepare for your exams.</p>
            <div className="space-y-6">
                {suggestedBooks.slice(0, 5).map(book => {
                     const { url, domainName } = getGeoAffiliateLink(book);
                     return (
                        <div key={book.id} className="flex items-start gap-4">
                            <BookCover title={book.title} className="w-20 h-24 rounded shadow-sm flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <h4 className="font-bold text-slate-700 leading-tight">{book.title}</h4>
                                <p className="text-xs text-slate-500 mt-1 mb-2">{book.description.substring(0, 75)}...</p>
                                <a 
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 inline-flex items-center gap-1"
                                >
                                   <ShoppingCart size={12}/> Buy on {domainName}
                                </a>
                            </div>
                        </div>
                     )
                })}
            </div>
             <p className="text-xs text-slate-400 mt-4 text-center">
                As an Amazon Associate, we earn from qualifying purchases.
            </p>
        </div>
    );
};

export default SuggestedBooksSidebar;