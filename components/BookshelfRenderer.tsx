
import React, { FC, useMemo } from 'react';
import BookCover from './BookCover.tsx'; 
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, BookUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';

interface BookshelfRendererProps {
    books: RecommendedBook[];
    type: 'showcase' | 'sidebar' | 'single';
}

const getGeoAffiliateLink = (book: RecommendedBook, userGeoCountryCode: string | null): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } | null => {
    if (!book.affiliateLinks) return null;
    const links = book.affiliateLinks;
    
    // Industrial mapping
    const map: Record<string, keyof RecommendedBook['affiliateLinks']> = { 
        'us': 'com', 'gb': 'com', 'ca': 'com', 'au': 'com',
        'in': 'in', 
        'ae': 'ae', 'sa': 'ae', 'qa': 'ae'
    };
    const domains: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.ae' };
    
    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    
    // 1. IP Based lookup
    if (userGeoCountryCode && map[userGeoCountryCode.toLowerCase()]) {
        const preferred = map[userGeoCountryCode.toLowerCase()];
        if (links[preferred]) finalKey = preferred;
    }
    
    // 2. Fallback to Timezone
    if (!finalKey) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Asia/Kolkata')) finalKey = 'in';
        else if (['Asia/Dubai', 'Asia/Riyadh', 'Asia/Muscat'].some(t => tz.includes(t))) finalKey = 'ae';
        else finalKey = 'com';
    }
    
    // 3. Absolute fallback
    if (!finalKey || !links[finalKey]) {
        finalKey = links['com'] ? 'com' : (links['in'] ? 'in' : 'ae');
    }

    if (finalKey && links[finalKey]) {
        return { url: links[finalKey], domainName: domains[finalKey] || 'Amazon', key: finalKey };
    }
    return null;
};

const BookshelfRenderer: FC<BookshelfRendererProps> = ({ books, type }) => {
    const { userGeoCountryCode } = useAppContext();
    if (!books || books.length === 0) return <p className="text-center text-slate-500 py-10 italic">No study materials listed.</p>;

    return (
        <div className={type === 'showcase' ? 'mco-book-grid' : 'space-y-4'}>
            {books.map(book => {
                const primary = getGeoAffiliateLink(book, userGeoCountryCode);
                
                // Define store order: Primary first, then others
                const keys: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
                const sortedStores = primary 
                    ? [primary.key, ...keys.filter(k => k !== primary.key)]
                    : keys;

                const storeData = {
                    com: { name: 'Amazon.com', icon: <ShoppingCart size={16}/> },
                    in: { name: 'Amazon.in', icon: <ShoppingCart size={16}/> },
                    ae: { name: 'Amazon.ae', icon: <ShoppingCart size={16}/> }
                };

                if (type === 'sidebar') {
                    return (
                        <div key={book.id} className="mco-book-card-sidebar">
                            <div className="mco-book-card-sidebar__cover"><BookCover book={book} className="w-full h-full" /></div>
                            <div className="mco-book-card-sidebar__content">
                                <h4 className="mco-book-card-sidebar__title">{book.title}</h4>
                                <a href={primary?.url || '#'} target="_blank" rel="noopener noreferrer" className="mco-book-card-sidebar__button">
                                    <BookUp size={14} /> Buy
                                </a>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={book.id} className="mco-book-card">
                        <div className="mco-book-cover"><BookCover book={book} className="w-full h-full" /></div>
                        <div className="mco-book-card__body">
                            <h4 className="mco-book-card__title">{book.title}</h4>
                            <p className="mco-book-card__desc line-clamp-3 leading-relaxed">{book.description}</p>
                        </div>
                        <div className="mco-book-card__footer">
                            <div className="mco-store-buttons">
                                {sortedStores.map(key => {
                                    const url = book.affiliateLinks?.[key];
                                    if (!url || url.trim() === '') return null;
                                    
                                    const isPrimary = key === primary?.key;
                                    const data = storeData[key];
                                    
                                    return (
                                        <a 
                                            key={key} 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className={isPrimary ? 'mco-book-btn mco-book-btn--primary' : 'mco-book-btn mco-book-btn--secondary'}
                                        >
                                            {data.icon} Buy on {data.name}
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
