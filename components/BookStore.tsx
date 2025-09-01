import React, { FC } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, BookOpenCheck } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';

const BookCard: FC<{ book: RecommendedBook }> = ({ book }) => {
    const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let preferredKey: keyof RecommendedBook['affiliateLinks'] = 'com';
        let preferredDomain = 'Amazon.com';

        // Determine preferred locale
        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            preferredKey = 'in';
            preferredDomain = 'Amazon.in';
        } else if (gccTimezones.some(tz => timeZone === tz)) {
            preferredKey = 'ae';
            preferredDomain = 'Amazon.ae';
        }
        
        // Check if the preferred URL exists and is valid
        const preferredUrl = book.affiliateLinks[preferredKey];
        if (preferredUrl && preferredUrl.trim() !== '') {
            return { url: preferredUrl, domainName: preferredDomain, key: preferredKey };
        }
        
        // Fallback to .com if preferred is not available or is an empty string
        if (book.affiliateLinks.com && book.affiliateLinks.com.trim() !== '') {
            return { url: book.affiliateLinks.com, domainName: 'Amazon.com', key: 'com' };
        }

        // If both fail, find the first available link to set as primary
        const fallbackOrder: (keyof RecommendedBook['affiliateLinks'])[] = ['in', 'ae'];
        for (const key of fallbackOrder) {
             if (book.affiliateLinks[key] && book.affiliateLinks[key].trim() !== '') {
                const domain = key === 'in' ? 'Amazon.in' : 'Amazon.ae';
                return { url: book.affiliateLinks[key], domainName: domain, key };
             }
        }
        
        return { url: book.affiliateLinks.com || '', domainName: 'Amazon.com', key: 'com' };
    };

    const primaryLink = getGeoAffiliateLink(book);
    const allStores = [
        { key: 'com' as const, name: 'Amazon.com', url: book.affiliateLinks.com },
        { key: 'in' as const, name: 'Amazon.in', url: book.affiliateLinks.in },
        { key: 'ae' as const, name: 'Amazon.ae', url: book.affiliateLinks.ae }
    ];
    const secondaryStores = allStores.filter(store => store.key !== primaryLink.key && store.url && store.url.trim() !== '');

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300 border border-slate-100">
            <BookCover book={book} className="w-full h-48" />
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{book.title}</h3>
                <p className="text-slate-600 text-sm mb-4 flex-grow">{book.description}</p>
                <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">
                    {primaryLink.url && (
                        <a 
                            href={primaryLink.url}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full text-center bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-bold py-3 px-4 rounded-lg text-base flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                        >
                            <ShoppingCart size={18} /> Buy on {primaryLink.domainName}
                        </a>
                    )}
                    {secondaryStores.map((store) => (
                         <a 
                            key={store.key}
                            href={store.url}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
                        >
                           Buy on {store.name}
                        </a>
                    ))}
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
                <p className="mt-4 text-slate-500">Loading Books...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
                 <BookOpenCheck className="mx-auto h-12 w-12 text-cyan-500" />
                 <h1 className="text-4xl font-extrabold text-slate-900 mt-4">Recommended Study Materials</h1>
                <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
                    Enhance your learning with our curated list of essential books for medical coding professionals. Each book has been selected to help you succeed in your exams and career.
                </p>
                <p className="text-xs text-slate-400 mt-4">
                    As an Amazon Associate, we earn from qualifying purchases. Using our links doesn't cost you anything extra and helps support our platform to keep creating great content for you. Please note that book availability may vary by region.
                </p>
            </div>

            {suggestedBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {suggestedBooks.map(book => (
                        <BookCard key={book.id} book={book} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-500">No books are currently recommended.</p>
            )}
        </div>
    );
};

export default BookStore;