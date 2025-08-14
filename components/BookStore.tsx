import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, BookOpenCheck } from 'lucide-react';
import BookCover from './BookCover.tsx';

const BookCard: React.FC<{ book: RecommendedBook }> = ({ book }) => {
    const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let domainKey: keyof RecommendedBook['affiliateLinks'] = 'com';
        let domainName = 'Amazon.com';

        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            domainKey = 'in';
            domainName = 'Amazon.in';
        } 
        else if (gccTimezones.some(tz => timeZone === tz)) {
            domainKey = 'ae';
            domainName = 'Amazon.ae';
        }
        
        const url = book.affiliateLinks[domainKey];
        if (!url) {
            return { url: book.affiliateLinks.com, domainName: 'Amazon.com', key: 'com' };
        }
        return { url, domainName, key: domainKey };
    };

    const primaryLink = getGeoAffiliateLink(book);
    const allStores = [
        { key: 'com' as const, name: '.com', url: book.affiliateLinks.com },
        { key: 'in' as const, name: '.in', url: book.affiliateLinks.in },
        { key: 'ae' as const, name: '.ae', url: book.affiliateLinks.ae }
    ];
    const secondaryStores = allStores.filter(store => store.key !== primaryLink.key);

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300 border border-slate-100">
            <BookCover title={book.title} className="w-full h-56" />
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{book.title}</h3>
                <p className="text-slate-600 text-sm mb-4 flex-grow">{book.description}</p>
                <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">
                    <a 
                        href={primaryLink.url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full text-center bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-bold py-3 px-4 rounded-lg text-base flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                    >
                        <ShoppingCart size={18} /> Buy on {primaryLink.domainName}
                    </a>
                    <div className="text-center pt-2">
                         <span className="text-xs text-slate-400">Other stores: </span>
                        {secondaryStores.map((store, index) => (
                             <React.Fragment key={store.key}>
                                <a 
                                    href={store.url}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-cyan-600 hover:underline font-semibold"
                                >
                                   {store.name}
                                </a>
                                {index < secondaryStores.length - 1 && <span className="text-xs text-slate-400 mx-1">|</span>}
                             </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BookStore: React.FC = () => {
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
                    As an Amazon Associate, we earn from qualifying purchases. This does not add any extra cost for you.
                </p>
            </div>

            {suggestedBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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