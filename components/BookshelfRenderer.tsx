
import React, { FC } from 'react';
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
    const countryToAmazonKey: Record<string, keyof RecommendedBook['affiliateLinks']> = { 'us': 'com', 'in': 'in', 'ae': 'ae', 'gb': 'com', 'ca': 'com', 'au': 'com' };
    const domainNames: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.ae' };
    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    if (userGeoCountryCode && countryToAmazonKey[userGeoCountryCode.toLowerCase()]) {
        const preferredKey = countryToAmazonKey[userGeoCountryCode.toLowerCase()];
        if (links[preferredKey]) finalKey = preferredKey;
    }
    if (!finalKey) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Asia/Kolkata')) finalKey = 'in';
        else if (['Asia/Dubai', 'Asia/Riyadh'].includes(tz)) finalKey = 'ae';
        else finalKey = 'com';
    }
    if (finalKey && links[finalKey]) return { url: links[finalKey], domainName: domainNames[finalKey] || 'Amazon', key: finalKey };
    return null;
};

const BookshelfRenderer: FC<BookshelfRendererProps> = ({ books, type }) => {
    const { userGeoCountryCode } = useAppContext();
    if (!books || books.length === 0) return <p className="text-center text-slate-500 py-10 italic">No study materials listed.</p>;

    return (
        <div className={type === 'showcase' ? 'mco-book-grid' : 'space-y-4'}>
            {books.map(book => {
                const primary = getGeoAffiliateLink(book, userGeoCountryCode);
                const allStores = [
                    { key: 'com' as const, name: 'Amazon.com', url: book.affiliateLinks?.com },
                    { key: 'in' as const, name: 'Amazon.in', url: book.affiliateLinks?.in },
                    { key: 'ae' as const, name: 'Amazon.ae', url: book.affiliateLinks?.ae }
                ].filter(s => s.url && s.url.trim() !== '');

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
                            <p className="mco-book-card__desc">{book.description}</p>
                        </div>
                        <div className="mco-book-card__footer">
                            <div className="mco-store-buttons">
                                {allStores.map(store => {
                                    const isPrimary = store.key === (primary?.key || 'com');
                                    return (
                                        <a key={store.key} href={store.url} target="_blank" rel="noopener noreferrer" className={isPrimary ? 'mco-book-btn mco-book-btn--primary' : 'mco-book-btn mco-book-btn--secondary'}>
                                            <ShoppingCart size={16} /> Buy on {store.name}
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