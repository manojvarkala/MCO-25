import React, { FC } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { BookOpenCheck } from 'lucide-react';
import BookshelfRenderer from './BookshelfRenderer.tsx';

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
        <div className="max-w-7xl mx-auto w-full">
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="text-center mb-12">
                     <BookOpenCheck className="mx-auto h-12 w-12 text-[rgb(var(--color-primary-rgb))]" />
                     <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] mt-4">Recommended Study Materials</h1>
                    <p className="mt-4 text-lg text-[rgb(var(--color-text-default-rgb))] max-w-3xl mx-auto">
                        Enhance your learning with our curated list of essential books for medical coding professionals. Each book has been selected to help you succeed in your exams and career.
                    </p>
                </div>

                {suggestedBooks.length > 0 ? (
                    <div className="w-full">
                        <BookshelfRenderer books={suggestedBooks} type="showcase" />
                    </div>
                ) : (
                    <p className="text-center text-[rgb(var(--color-text-muted-rgb))] py-12">No books are currently recommended.</p>
                )}
            </div>
        </div>
    );
};

export default BookStore;