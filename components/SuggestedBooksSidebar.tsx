
import React, { FC, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { RecommendedBook } from '../types.ts';
import { BookUp, BookOpen } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';

// Unified geo-affiliate link logic
const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } | null => {
    if (!book.affiliateLinks) {
        return null;
    }
    const links = book.affiliateLinks;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    let preferredKey: keyof RecommendedBook['affiliateLinks'] = 'com';
    let preferredDomainName = 'Amazon.com';
    
    const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
    if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
        preferredKey = 'in';
        preferredDomainName = 'Amazon.in';
    } else if (gccTimezones.some(tz => timeZone === tz)) {
        preferredKey = 'ae';
        preferredDomainName = 'Amazon.ae';
    }

    // Try preferred geo link first
    if (links[preferredKey] && links[preferredKey].trim() !== '') {
        return { url: links[preferredKey], domainName: preferredDomainName, key: preferredKey };
    }

    // Fallback in a defined priority order
    const fallbackPriority: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
    for (const key of fallbackPriority) {
        if (key === preferredKey) continue; // Already tried
        if (links[key] && links[key].trim() !== '') {
            let domainName = 'Amazon.com';
            if (key === 'in') domainName = 'Amazon.in';
            if (key === 'ae') domainName = 'Amazon.ae';
            return { url: links[key], domainName, key };
        }
    }
    return null;
};

const decodeHtmlEntities = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        return textarea.value;
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return html;
    }
};

const SuggestedBooksSidebar: FC = () => {
    const { suggestedBooks } = useAppContext();
    
    // Memoize the random selection so it doesn't change on every render
    const randomBooks = useMemo(() => {
        if (!suggestedBooks || suggestedBooks.length === 0) {
            return [];
        }
        // Shuffle the array and take the first 5
        return [...suggestedBooks].sort(() => 0.5 - Math.random()).slice(0, 5);
    }, [suggestedBooks]);


    if (randomBooks.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <BookOpen className="mr-3 text-cyan-500" /> Study Hall
            </h3>
            <div className="space-y-6">
                {randomBooks.map(book => {
                    const linkData = getGeoAffiliateLink(book);
                    if (!linkData) return null; // Don't render if no valid URL
                    const { url, domainName } = linkData;
                    return (
                        <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200 transform hover:-translate-y-1 transition-transform duration-200">
                            <BookCover book={book} className="w-full h-32" />
                            <div className="p-4">
                                {book.permalink ? (
                                    <a href={book.permalink} target="_blank" rel="noopener noreferrer" className="group">
                                        <h4 className="font-bold text-slate-800 text-sm mb-3 leading-tight group-hover:text-cyan-600 transition-colors">{decodeHtmlEntities(book.title)}</h4>
                                    </a>
                                ) : (
                                    <h4 className="font-bold text-slate-800 text-sm mb-3 leading-tight">{decodeHtmlEntities(book.title)}</h4>
                                )}
                                
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