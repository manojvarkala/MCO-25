

import React, { FC, useMemo } from 'react';
import { BookCover } from './BookCover.tsx';
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, BookUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';

interface BookshelfRendererProps {
    books: RecommendedBook[];
    type: 'showcase' | 'sidebar' | 'single';
}

// Updated getGeoAffiliateLink to prioritize IP-based geolocation
const getGeoAffiliateLink = (book: RecommendedBook, userGeoCountryCode: string | null): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } | null => {
    if (!book.affiliateLinks) {
        return null;
    }
    const links = book.affiliateLinks;
    
    // Map country codes to Amazon keys
    const countryToAmazonKey: Record<string, keyof RecommendedBook['affiliateLinks']> = {
        'us': 'com', // United States
        'in': 'in',  // India
        'ae': 'ae',  // United Arab Emirates
        'gb': 'com', // United Kingdom (often uses .com for international links)
        'ca': 'com', // Canada
        'au': 'com', // Australia
        // Add more mappings as needed
    };
    const domainNames: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.in' }; // Default to .in for AE
    if (links['ae'] && links['ae'].trim() !== '') {
        domainNames['ae'] = 'Amazon.ae';
    }


    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    let finalDomainName: string | null = null;

    // 1. Prioritize IP-based country code if available and valid
    if (userGeoCountryCode && countryToAmazonKey[userGeoCountryCode.toLowerCase()]) {
        const preferredKey = countryToAmazonKey[userGeoCountryCode.toLowerCase()];
        if (links[preferredKey] && links[preferredKey].trim() !== '') {
            finalKey = preferredKey;
            finalDomainName = domainNames[preferredKey] || `Amazon.${preferredKey}`;
        }
    }

    // 2. Fallback to timezone-based inference if IP-based didn't yield a valid link
    if (!finalKey) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let preferredKeyFromTimezone: keyof RecommendedBook['affiliateLinks'] = 'com';
        
        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            preferredKeyFromTimezone = 'in';
        } else if (gccTimezones.some(tz => timeZone === tz)) {
            preferredKeyFromTimezone = 'ae';
        }

        if (links[preferredKeyFromTimezone] && links[preferredKeyFromTimezone].trim() !== '') {
            finalKey = preferredKeyFromTimezone;
            finalDomainName = domainNames[preferredKeyFromTimezone] || `Amazon.${preferredKeyFromTimezone}`;
        }
    }

    // 3. Final fallback: Use a default priority order if no specific match yet
    if (!finalKey) {
        const fallbackPriority: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
        for (const key of fallbackPriority) {
            if (links[key] && links[key].trim() !== '') {
                finalKey = key;
                finalDomainName = domainNames[key] || `Amazon.${key}`;
                break;
            }
        }
    }

    if (finalKey && finalDomainName) {
        // Store the FINAL chosen key in localStorage for WordPress shortcodes to read via cookie
        try {
            localStorage.setItem('mco_preferred_geo_key', finalKey);
            localStorage.setItem('mco_user_geo_country_code', userGeoCountryCode || 'UNKNOWN'); // Also persist IP-based for debug
        } catch(e) {
            console.error("Failed to set geo preference in localStorage", e);
        }
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
        console.error("Could not decode HTML entities", e);
        return html;
    }
};

const BookshelfRenderer: FC<BookshelfRendererProps> = ({ books, type }) => {
    const { userGeoCountryCode } = useAppContext(); // Get IP-based geo country code

    if (!books || books.length === 0) {
        return <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No books found.</p>;
    }

    if (type === 'single') {
        const book = books[0];
        if (!book) return <p>Book data missing.</p>;
        const primaryLinkInfo = getGeoAffiliateLink(book, userGeoCountryCode); // Pass userGeoCountryCode
        const allStores = [
            { key: 'com' as const, name: 'Amazon.com', url: book.affiliateLinks?.com },
            { key: 'in' as const, name: 'Amazon.in', url: book.affiliateLinks?.in },
            { key: 'ae' as const, name: 'Amazon.ae', url: book.affiliateLinks?.ae }
        ].filter(store => store.url && store.url.trim() !== '');

        return (
            <div className="mco-single-book-view">
                <div className="mco-single-book-view__cover">
                    <BookCover book={book} className="w-full h-full"/>
                </div>
                <div className="mco-single-book-view__details">
                    <h1 className="mco-single-book-view__title">{decodeHtmlEntities(book.title)}</h1>
                    <div className="mco-single-book-view__description" dangerouslySetInnerHTML={{ __html: book.description }} />
                    <div className="mco-single-book-view__buttons">
                        {allStores.length > 0 ? (
                            allStores.map(store => {
                                const isPrimary = store.key === primaryLinkInfo?.key;
                                // Use consistent button classes defined in CSS
                                const buttonClass = isPrimary ? 'mco-book-btn mco-book-btn--primary' : 'mco-book-btn mco-book-btn--secondary';
                                return (
                                    <a 
                                        key={store.key}
                                        href={store.url}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={buttonClass}
                                    >
                                        <BookUp size={16} /> Buy on {store.name}
                                    </a>
                                )
                            })
                        ) : (
                            <span className="mco-book-btn mco-book-btn--disabled">Soon</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const renderBookCard = (book: RecommendedBook) => {
        const primaryLinkInfo = getGeoAffiliateLink(book, userGeoCountryCode); // Pass userGeoCountryCode
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
                        <div className="mco-store-buttons-sidebar">
                            {allStores.length > 0 ? (
                                allStores.map(store => {
                                    const isPrimary = store.key === primaryLinkInfo?.key;
                                    const buttonClass = isPrimary ? 'mco-book-card-sidebar__button mco-book-card-sidebar__button--primary' : 'mco-book-card-sidebar__button mco-book-card-sidebar__button--secondary';
                                    return (
                                        <a key={store.key} href={store.url} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                                            <BookUp size={14} /> {store.name}
                                        </a>
                                    )
                                })
                            ) : (
                                <span className="mco-book-card-sidebar__button mco-book-card-sidebar__button--secondary" style={{ opacity: 0.5 }}>Soon</span>
                            )}
                        </div>
                    </div>
                </div>
            );
        } else {
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
                            {allStores.length > 0 ? (
                                allStores.map(store => {
                                    const isPrimary = store.key === primaryLinkInfo?.key;
                                    const buttonClass = isPrimary ? 'mco-book-btn mco-book-btn--primary' : 'mco-book-btn mco-book-btn--secondary';
                                    return (
                                        <a key={store.key} href={store.url} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                                            <ShoppingCart size={16} /> Buy on {store.name}
                                        </a>
                                    )
                                })
                            ) : (
                                <span className="mco-book-btn">Soon</span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return <div className="mco-book-grid">{books.map(renderBookCard)}</div>;
};

export default BookshelfRenderer;