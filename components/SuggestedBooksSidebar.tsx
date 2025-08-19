import * as React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { RecommendedBook } from '../types.ts';
import { BookUp, BookOpen } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';

const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string } => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let domainKey: keyof RecommendedBook['affiliateLinks'] = 'com';
    let domainName = 'Amazon.com';

    const gccTimezones = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat'];
    if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
        domainKey = 'in'; domainName = 'Amazon.in';
    } else if (gccTimezones.some(tz => timeZone === tz)) {
        domainKey = 'ae'; domainName = 'Amazon.ae';
    }
    
    const url = book.affiliateLinks[domainKey];
    return !url || url.trim() === '' ? { url: book.affiliateLinks.com, domainName: 'Amazon.com' } : { url, domainName };
};


const SuggestedBooksSidebar: React.FC = () => {
    const { suggestedBooks } = useAppContext();

    if (!suggestedBooks || suggestedBooks.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <BookOpen className="mr-3 text-cyan-500" /> Study Hall
            </h3>
            <div className="grid grid-cols-2 gap-4">
                {suggestedBooks.map(book => {
                    const { url } = getGeoAffiliateLink(book);
                    return (
                        <div key={book.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col items-center text-center">
                            <BookCover title={book.title} className="w-20 h-24 rounded-md shadow-sm mb-2" />
                            <div className="flex-grow flex flex-col justify-between w-full">
                                <p className="font-semibold text-xs text-slate-700 leading-tight flex-grow mb-2">{book.title}</p>
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-auto w-full inline-flex items-center justify-center gap-1 text-xs text-white bg-cyan-600 hover:bg-cyan-700 font-semibold rounded-full px-2 py-1 transition-colors"
                                >
                                    <BookUp size={14} />
                                    <span>Buy</span>
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
             <p className="text-xs text-slate-400 mt-4 text-center">
                Using our affiliate links doesn't cost you extra and helps support our platform. Thank you!
            </p>
        </div>
    );
};

export default SuggestedBooksSidebar;