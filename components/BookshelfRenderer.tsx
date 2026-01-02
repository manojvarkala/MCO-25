
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
    
    const countryToAmazonKey: Record<string, keyof RecommendedBook['affiliateLinks']> = {
        'us': 'com', 'in': 'in', 'ae': 'ae', 'gb': 'com', 'ca': 'com', 'au': 'com',
    };
    const domainNames: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.ae' };

    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    let finalDomainName: string | null = null;

    if (userGeoCountryCode && countryToAmazonKey[userGeoCountryCode.toLowerCase()]) {
        const preferredKey = countryToAmazonKey[userGeoCountryCode.toLowerCase()];
        if (links[preferredKey] && links[preferredKey].trim() !== '') {
            finalKey = preferredKey;
            finalDomainName = domainNames[preferredKey];
        }
    }

    if (!finalKey) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let preferredKeyFromTimezone: keyof RecommendedBook['affiliateLinks'] = 'com';
        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) preferredKeyFromTimezone = 'in';
        else if (gccTimezones.some(tz => timeZone === tz)) preferredKeyFromTimezone = 'ae';

        if (links[preferredKeyFromTimezone] && links[preferredKeyFromTimezone].trim() !== '') {
            finalKey = preferredKeyFromTimezone;
            finalDomainName = domainNames[preferredKeyFromTimezone];
        }
    }

    if (!finalKey) {
        for (const key of ['com', 'in', 'ae'] as const) {
            if (links[key] && links[key].trim() !== '') {
                finalKey = key;
                finalDomainName = domainNames[key];
                break;
            }
        }
    }

    if (finalKey && finalDomainName) {
        return { url: links[finalKey], domainName: finalDomainName, key: finalKey };
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
        return html;
    }
};

const BookshelfRenderer: FC<BookshelfRendererProps> = ({ books, type }) => {
    const { userGeoCountryCode } = useAppContext();

    if (!books || books.length === 0) {
        return <p className="text-center text-slate-500 py-10">No books found.</p>;
    }

    const renderBookCard = (book: RecommendedBook) => {
        const primaryLinkInfo = getGeoAffiliateLink(book, userGeoCountryCode);
        const allStores = [
            { key: 'com' as const, name: 'Amazon.com', url: book.affiliateLinks?.com },
            { key: 'in' as const, name: 'Amazon.in', url: book.affiliateLinks?.in },
            { key: 'ae' as const, name: 'Amazon.ae', url: book.affiliateLinks?.ae }
        ].filter(store => store.url && store.url.trim() !== '');

        const desc = (book.description || '').split(' ').slice(0, 20).join(' ') + '...';
        
        if (type === 'sidebar') {
            return (
                <div key={book.id} className="mco-book-card-sidebar">
                    <div className="mco-book-card-sidebar__cover">
                        <BookCover book={book} className="w-full h-full" />
                    </div>
                    <div className="mco-book-card-sidebar__content">
                        <h4 className="mco-book-card-sidebar__title">{decodeHtmlEntities(book.title)}</h4>
                        <a href={primaryLinkInfo?.url || '#'} target="_blank" rel="noopener noreferrer" className="mco-book-card-sidebar__button">
                            <BookUp size={14} /> {primaryLinkInfo?.domainName || 'Buy'}
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <div key={book.id} className="mco-book-card">
                <div className="mco-book-cover">
                    <BookCover book={book} className="w-full h-full" />
                </div>
                <div className="mco-book-card__body">
                    <h4 className="mco-book-card__title">{decodeHtmlEntities(book.title)}</h4>
                    <p className="mco-book-card__desc">{decodeHtmlEntities(desc)}</p>
                </div>
                <div className="mco-book-card__footer">
                    <div className="mco-store-buttons">
                        {allStores.map(store => {
                            const isPrimary = store.key === (primaryLinkInfo?.key || 'com');
                            return (
                                <a 
                                    key={store.key} 
                                    href={store.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={isPrimary ? 'mco-book-btn mco-book-btn--primary' : 'mco-book-btn mco-book-btn--secondary'}
                                >
                                    <ShoppingCart size={16} /> Buy on {store.name}
                                </a>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return <div className={type === 'showcase' ? 'mco-book-grid' : 'space-y-4'}>{books.map(renderBookCard)}</div>;
};

export default BookshelfRenderer;
