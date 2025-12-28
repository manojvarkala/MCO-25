
import React, { FC } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, BookOpenCheck } from 'lucide-react';
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

const BookCard: FC<{ book: RecommendedBook }> = ({ book }) => {
    const primaryLinkInfo = getGeoAffiliateLink(book);
    const allStores = [
        { key: 'com' as const, name: 'Amazon.com', url: book.affiliateLinks?.com },
        { key: 'in' as const, name: 'Amazon.in', url: book.affiliateLinks?.in },
        { key: 'ae' as const, name: 'Amazon.ae', url: book.affiliateLinks?.ae }
    ].filter(store => store.url && store.url.trim() !== '');

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] rounded-xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300 border border-[rgb(var(--color-border-rgb))]">
            <BookCover book={book} className="w-full h-56" />
            <div className="p-6 flex flex-col flex-grow">
                {book.permalink ? (
                    <a href={book.permalink} target="_blank" rel="noopener noreferrer" className="group">
                        <h3 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-2 leading-tight group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">{decodeHtmlEntities(book.title)}</h3>
                    </a>
                ) : (
                    <h3 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] mb-2 leading-tight">{decodeHtmlEntities(book.title)}</h3>
                )}
                
                <div className="flex-grow">
                    <p className="text-[rgb(var(--color-text-default-rgb))] text-base mb-4">
                        {decodeHtmlEntities(book.description)}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-[rgb(var(--color-border-rgb))]">
                    {allStores.length > 0 ? (
                        <div className="space-y-2">
                             <p className="text-xs font-semibold text-[rgb(var(--color-text-muted-rgb))]">Available on:</p>
                             {allStores.map(store => {
                                 const isPrimary = store.key === primaryLinkInfo?.key;
                                 return (
                                     <a 
                                         key={store.key}
                                         href={store.url}
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className={`w-full text-center font-bold py-2 px-4 rounded-lg text-base flex items-center justify-center gap-2 transition-all transform ${
                                             isPrimary 
                                                 ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-800 hover:scale-105'
                                                 : 'bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-default-rgb))]'
                                         }`}
                                     >
                                         <ShoppingCart size={16} /> Buy on {store.name}
                                     </a>
                                 )
                             })}
                        </div>
                    ) : (
                        <p className="text-sm text-center text-[rgb(var(--color-text-muted-rgb))]">Purchase links currently unavailable.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const BookStore: FC = () => {
    const { suggestedBooks, isInitializing } = useAppContext();

    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
                <p className="mt-4 text-[rgb(var(--color-text-muted-rgb))]">Loading Books...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="text-center mb-12">
                     <BookOpenCheck className="mx-auto h-12 w-12 text-[rgb(var(--color-primary-rgb))]" />
                     <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] mt-4">Recommended Study Materials</h1>
                    <p className="mt-4 text-lg text-[rgb(var(--color-text-default-rgb))] max-w-3xl mx-auto">
                        Enhance your learning with our curated list of essential books for medical coding professionals. Each book has been selected to help you succeed in your exams and career.
                    </p>
                    <p className="text-xs text-[rgb(var(--color-text-muted-rgb))] mt-4">
                        As an Amazon Associate, we earn from qualifying purchases. Using our links doesn't cost you extra and helps support our platform to keep creating great content for you. Please note that book availability may vary by region.
                    </p>
                </div>

                {suggestedBooks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {suggestedBooks.map((book) => (
                            <BookCard key={book.id} book={book} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-[rgb(var(--color-text-muted-rgb))]">No books are currently recommended.</p>
                )}
            </div>
        </div>
    );
};

export default BookStore;