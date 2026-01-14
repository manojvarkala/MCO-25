import React, { FC } from 'react';
import BookCover from './BookCover.tsx'; 
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';

interface BookshelfRendererProps {
    books: RecommendedBook[];
    type: 'showcase' | 'sidebar' | 'single';
}

const getGeoAffiliateLink = (book: RecommendedBook, userGeoCountryCode: string | null): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } | null => {
    if (!book.affiliateLinks) return null;
    const links = book.affiliateLinks;
    const map: Record<string, keyof RecommendedBook['affiliateLinks']> = { 
        'us': 'com', 'gb': 'com', 'ca': 'com', 'au': 'com',
        'in': 'in', 
        'ae': 'ae', 'sa': 'ae', 'qa': 'ae', 'kw': 'ae', 'om': 'ae'
    };
    const domains: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.ae' };
    
    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    if (userGeoCountryCode && map[userGeoCountryCode.toLowerCase()]) {
        const preferred = map[userGeoCountryCode.toLowerCase()];
        if (links[preferred]) finalKey = preferred;
    }
    if (!finalKey) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Asia/Kolkata')) finalKey = 'in';
        else if (['Asia/Dubai', 'Asia/Riyadh', 'Muscat'].some(t => tz.includes(t))) finalKey = 'ae';
        else finalKey = 'com';
    }
    if (!finalKey || !links[finalKey]) {
        finalKey = links['com'] ? 'com' : (links['in'] ? 'in' : 'ae');
    }
    return (finalKey && links[finalKey]) ? { url: links[finalKey], domainName: domains[finalKey] || 'Amazon', key: finalKey } : null;
};

const BookshelfRenderer: FC<BookshelfRendererProps> = ({ books, type }) => {
    const { userGeoCountryCode } = useAppContext();
    if (!books || books.length === 0) return <p className="text-center text-slate-500 py-10 italic">No study materials listed.</p>;

    if (type === 'sidebar') {
        return (
            <div className="flex flex-col gap-4">
                {books.map(book => {
                    const primary = getGeoAffiliateLink(book, userGeoCountryCode);
                    return (
                        <div key={book.id} className="bg-[rgb(var(--color-card-rgb))] border border-[rgb(var(--color-border-rgb))] p-3 rounded-xl flex gap-4 hover:shadow-md transition-shadow group">
                            <div className="w-16 h-20 flex-shrink-0">
                                <BookCover book={book} className="w-full h-full rounded shadow-sm" />
                            </div>
                            <div className="flex flex-col justify-center overflow-hidden">
                                <a 
                                    href={primary?.url || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="font-bold text-sm text-[rgb(var(--color-text-strong-rgb))] line-clamp-2 hover:text-[rgb(var(--color-primary-rgb))] transition-colors"
                                >
                                    {book.title}
                                </a>
                                <a 
                                    href={primary?.url || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="mt-1 inline-flex items-center gap-1 text-[10px] bg-[rgb(var(--color-accent-rgb))] text-amber-900 font-black px-2 py-1 rounded uppercase tracking-tighter self-start hover:bg-yellow-400 transition-colors"
                                >
                                    <ShoppingCart size={10} /> {primary?.domainName || 'Amazon'}
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="mco-book-grid">
            {books.map(book => {
                const primary = getGeoAffiliateLink(book, userGeoCountryCode);
                const keys: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
                const sortedStores = primary ? [primary.key, ...keys.filter(k => k !== primary.key)] : keys;
                const storeData = {
                    com: { name: 'Amazon.com' },
                    in: { name: 'Amazon.in' },
                    ae: { name: 'Amazon.ae' }
                };

                return (
                    <div key={book.id} className="mco-book-card group flex flex-col h-full">
                        <div className="mco-book-cover relative h-64 overflow-hidden bg-slate-100">
                            <BookCover book={book} className="w-full h-full" />
                            <a 
                                href={primary?.url || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                                <ExternalLink size={32} className="text-white" />
                            </a>
                        </div>
                        <div className="p-6 flex flex-col flex-grow">
                            <a 
                                href={primary?.url || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-extrabold text-lg text-[rgb(var(--color-text-strong-rgb))] line-clamp-2 hover:text-[rgb(var(--color-primary-rgb))] transition-colors"
                            >
                                {book.title}
                            </a>
                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))] line-clamp-3 mt-3 leading-relaxed flex-grow">{book.description}</p>
                            
                            <div className="mt-6 flex flex-col gap-2">
                                {sortedStores.map(key => {
                                    const url = book.affiliateLinks?.[key];
                                    if (!url) return null;
                                    const isPrimary = key === primary?.key;
                                    return (
                                        <a 
                                            key={key} 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className={`mco-book-btn ${isPrimary ? 'mco-book-btn--primary' : 'mco-book-btn--secondary'}`}
                                        >
                                            <ShoppingCart size={18}/> Buy on {storeData[key].name}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
export default BookshelfRenderer;
