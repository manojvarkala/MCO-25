
import React, { FC } from 'react';
// FIX: Changed import of BookCover from default to named import to align with the module's export type.
import { BookCover } from './BookCover.tsx';
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, BookUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx'; // Import useAppContext for activeOrg

interface BookshelfRendererProps {
    books: RecommendedBook[];
    type: 'showcase' | 'sidebar' | 'single';
}

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

const BookshelfRenderer: FC<BookshelfRendererProps> = ({ books, type }) => {
    if (!books || books.length === 0) {
        return <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No books found.</p>;
    }

    if (type === 'single') {
        const book = books[0];
        if (!book) return <p>Book data missing.</p>;
        const primaryLinkInfo = getGeoAffiliateLink(book);
        const allStores = [
            { key: 'com' as const, name: 'Amazon.com', url: book.affiliateLinks?.com },
            { key: 'in' as const, name: 'Amazon.in', url: book.affiliateLinks?.in },
            { key: 'ae' as const, name: 'Amazon.ae', url: book.affiliateLinks?.ae }
        ].filter(store => store.url && store.url.trim() !== '');

        return (
            <div className="mco-single-book-card">
                <div className="mco-single-book-card__cover">
                    <BookCover book={book} className="w-full h-full"/>
                </div>
                <div className="mco-single-book-card__details">
                    <h1 style={{ position: 'relative', zIndex: 2 }}>{decodeHtmlEntities(book.title)}</h1>
                    <div className="mco-single-book-card__description" dangerouslySetInnerHTML={{ __html: book.description }} />
                    <div className="mco-single-book-card__buttons">
                        {allStores.length > 0 ? (
                            allStores.map(store => {
                                const isPrimary = store.key === primaryLinkInfo?.key;
                                const buttonClass = isPrimary ? 'mco-book-btn mco-book-btn--primary' : 'mco-book-btn mco-book-btn--secondary';
                                return (
                                    <a 
                                        key={store.key}
                                        href={store.url}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`mco-book-btn ${buttonClass}`}
                                    >
                                        <BookUp size={16} /> Buy on {store.name}
                                    </a>
                                )
                            })
                        ) : (
                            <span className="mco-book-btn" style={{ cursor: 'default', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1' }}>Links Coming Soon</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render multiple books for showcase or sidebar
    const renderBookCard = (book: RecommendedBook) => {
        const primaryLinkInfo = getGeoAffiliateLink(book);
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
                        {book.permalink ? (
                            <a href={book.permalink} target="_blank" rel="noopener noreferrer" className="group">
                                <h4 className="mco-book-card-sidebar__title group-hover:text-cyan-600 transition-colors">{decodeHtmlEntities(book.title)}</h4>
                            </a>
                        ) : (
                            <h4 className="mco-book-card-sidebar__title">{decodeHtmlEntities(book.title)}</h4>
                        )}
                        <div className="mco-store-buttons-sidebar">
                            {allStores.length > 0 ? (
                                allStores.map(store => {
                                    const isPrimary = store.key === primaryLinkInfo?.key;
                                    const buttonClass = isPrimary ? 'mco-book-card-sidebar__button mco-book-card-sidebar__button--primary' : 'mco-book-card-sidebar__button mco-book-card-sidebar__button--secondary';
                                    return (
                                        <a 
                                            key={store.key}
                                            href={store.url}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={buttonClass}
                                        >
                                            <BookUp size={14} /> Buy on {store.name}
                                        </a>
                                    )
                                })
                            ) : (
                                <span className="mco-book-card-sidebar__button" style={{ cursor: 'default', background: '#e2e8f0', color: '#64748b', border: '1px solid #cbd5e1' }}>Coming Soon</span>
                            )}
                        </div>
                    </div>
                </div>
            );
        } else { // 'showcase' type
            return (
                <div key={book.id} className="mco-book-card">
                    <div className="mco-book-cover mco-book-cover--showcase">
                        <BookCover book={book} className="w-full h-full" />
                    </div>
                    <div className="mco-book-card__body">
                        {book.permalink ? (
                            <a href={book.permalink} style={{ textDecoration: 'none' }}>
                                <h4 className="mco-book-card__title">{decodeHtmlEntities(book.title)}</h4>
                            </a>
                        ) : (
                            <h4 className="mco-book-card__title">{decodeHtmlEntities(book.title)}</h4>
                        )}
                        <p className="mco-book-card__desc">{decodeHtmlEntities(desc)}</p>
                    </div>
                    <div className="mco-book-card__footer">
                        <div className="mco-store-buttons">
                            {allStores.length > 0 ? (
                                allStores.map(store => {
                                    const isPrimary = store.key === primaryLinkInfo?.key;
                                    const buttonClass = isPrimary ? 'mco-book-btn mco-book-btn--primary' : 'mco-book-btn mco-book-btn--secondary';
                                    return (
                                        <a 
                                            key={store.key}
                                            href={store.url}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={buttonClass}
                                        >
                                            <ShoppingCart size={16} /> Buy on {store.name}
                                        </a>
                                    )
                                })
                            ) : (
                                <span className="mco-book-btn" style={{ cursor: 'default', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1' }}>Links Coming Soon</span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <>
            {books.map(renderBookCard)}
        </>
    );
};

export default BookshelfRenderer;