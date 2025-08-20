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
            <div className="space-y-6">
                {suggestedBooks.map(book => {
                    const { url, domainName } = getGeoAffiliateLink(book);
                    return (
                        <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200 transform hover:-translate-y-1 transition-transform duration-200">
                            <BookCover title={book.title} className="w-full h-32" />
                            <div className="p-4">
                                <h4 className="font-bold text-slate-800 text-sm mb-3 leading-tight">{book.title}</h4>
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 text-sm text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-3 py-2 transition-colors"
                                >
                                    <BookUp size={16} />
                                    <span>Buy on {domainName}</span>
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
             <p className="text-xs text-slate-400 mt-6 text-center">
                Using our affiliate links doesn't cost you extra and helps support our platform. Note: Book availability may vary by region. Thank you!
            </p>
        </div>
    );
};

export default SuggestedBooksSidebar;