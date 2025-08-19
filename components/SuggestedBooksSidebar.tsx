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

    // Use a memo to shuffle only once on initial render or when books change.
    const randomBooks = React.useMemo(() => {
        if (!suggestedBooks || suggestedBooks.length === 0) {
            return [];
        }
        const shuffled = [...suggestedBooks].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }, [suggestedBooks]);

    if (randomBooks.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <BookOpen className="mr-3 text-cyan-500" /> Suggested Study Guides
            </h3>
            <div className="space-y-4">
                {randomBooks.map(book => {
                    const { url, domainName } = getGeoAffiliateLink(book);
                    return (
                        <div key={book.id} className="flex items-center gap-4">
                             <BookCover title={book.title} className="w-16 h-20 rounded-md shadow-sm flex-shrink-0" />
                            <div className="flex-grow">
                                <p className="font-semibold text-sm text-slate-700 leading-tight">{book.title}</p>
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 font-semibold"
                                >
                                    <BookUp size={14} />
                                    Buy on {domainName}
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SuggestedBooksSidebar;