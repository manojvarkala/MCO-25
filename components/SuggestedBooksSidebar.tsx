import React, { FC, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { RecommendedBook } from '../types.ts';
import { BookOpen } from 'lucide-react';
import BookshelfRenderer from './BookshelfRenderer.tsx';

const SuggestedBooksSidebar: FC = () => {
    const { suggestedBooks } = useAppContext();
    
    const randomBooks = useMemo(() => {
        if (!suggestedBooks || suggestedBooks.length === 0) {
            return [];
        }
        return [...suggestedBooks].sort(() => 0.5 - Math.random()).slice(0, 5);
    }, [suggestedBooks]);

    if (randomBooks.length === 0) {
        return null;
    }

    return (
        <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))]">
            <h3 className="mco-study-hall-sidebar__title">
                <BookOpen size={20} className="text-[rgb(var(--color-primary-rgb))]" /> 
                Study Hall
            </h3>
            <div className="space-y-6">
                <BookshelfRenderer books={randomBooks} type="sidebar" />
            </div>
             <p className="text-[10px] text-[rgb(var(--color-text-muted-rgb))] mt-6 text-center font-bold uppercase leading-relaxed tracking-wider opacity-60">
                Using our affiliate links doesn't cost you extra and helps support our platform. Thank you!
            </p>
        </div>
    );
};

export default SuggestedBooksSidebar;