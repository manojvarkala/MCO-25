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
            <div className="space-y-4">
                {suggestedBooks.map(book => {
                    const { url, domainName } = getGeoAffiliateLink(book);
                    return (
                        <div key={book.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-4">
                             <BookCover title={book.title} className="w-20 h-24 rounded-md shadow-sm flex-shrink-0" />
                            <div className="flex-grow">
                                <p className="font-semibold text-sm text-slate-700 leading-tight">{book.title}</p>
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 font-semibold"
                                >
                                    <BookUp size={14} />
                                    Buy on {domainName}
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