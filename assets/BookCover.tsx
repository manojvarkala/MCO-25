import React, { FC } from 'react';
import type { RecommendedBook } from '../types.ts';
import { useAppContext } from '../context/AppContext.tsx';

interface BookCoverProps {
  book: RecommendedBook;
  className?: string;
}

const getHashOfString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = hash & hash;
  return hash;
};

const AnnapoornaProceduralCover: FC<BookCoverProps> = ({ book, className }) => {
    const colorIndex = Math.abs(getHashOfString(book.title)) % 6;
    const bgColors = ['bg-cyan-700', 'bg-sky-700', 'bg-indigo-700', 'bg-purple-700', 'bg-rose-700', 'bg-emerald-700'];
    const accentColors = ['bg-cyan-400', 'bg-sky-400', 'bg-indigo-400', 'bg-purple-400', 'bg-rose-400', 'bg-emerald-400'];
    
    const bgColorClass = bgColors[colorIndex];
    const accentColorClass = accentColors[colorIndex];

    return (
        <div className={`relative flex items-stretch ${className} ${bgColorClass} overflow-hidden`}>
            <div className={`w-2 flex-shrink-0 ${accentColorClass}`}></div>
            <div className="p-4 flex flex-col justify-center text-white">
                <span className="text-xs uppercase tracking-widest opacity-70">Study Material</span>
                <h4 className="font-bold text-lg leading-tight mt-1">{book.title}</h4>
            </div>
            <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.03]" style={{mixBlendMode: 'overlay'}}>
                <defs>
                    <pattern id="annapoorna-pattern" patternUnits="userSpaceOnUse" width="40" height="40">
                        <path d="M-10 10l20 -20 M0 40l40 -40 M30 50l20 -20" stroke="white" strokeWidth="1.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#annapoorna-pattern)" />
            </svg>
        </div>
    );
};

const McoProceduralCover: FC<BookCoverProps> = ({ book, className }) => {
    const colorIndex = Math.abs(getHashOfString(book.title)) % 4;
    const bgColors = ['bg-slate-100', 'bg-cyan-50', 'bg-teal-50', 'bg-sky-100'];
    const textColors = ['text-slate-800', 'text-cyan-800', 'text-teal-800', 'text-sky-800'];
    const largeTextColors = ['text-slate-200', 'text-cyan-100', 'text-teal-100', 'text-sky-200'];

    const bgColorClass = bgColors[colorIndex];
    const textColorClass = textColors[colorIndex];
    const largeTextColorClass = largeTextColors[colorIndex];
    const titleWords = book.title.split(' ');
    const firstWord = titleWords[0].toUpperCase();

    return (
        <div className={`relative overflow-hidden flex flex-col justify-center items-start text-left p-4 ${className} ${bgColorClass}`}>
            <div className={`absolute -bottom-2 -right-1 text-8xl lg:text-9xl font-black ${largeTextColorClass} select-none leading-none z-0`}>
                {firstWord}
            </div>
            <div className="relative z-10">
                <h4 className={`font-extrabold text-xl lg:text-2xl leading-tight ${textColorClass}`}>{book.title}</h4>
            </div>
        </div>
    );
};

const BookCover: FC<BookCoverProps> = ({ book, className }) => {
  const { activeOrg } = useAppContext();

  // If a custom thumbnail URL is provided, use it.
  if (typeof book.thumbnailUrl === 'string' && book.thumbnailUrl) {
    return (
      <div className={`relative ${className} bg-slate-100`}>
        <img src={book.thumbnailUrl} alt={book.title} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback to procedural generation based on tenant ID.
  if (activeOrg && activeOrg.id === 'org-medical-coding-online') {
      return <McoProceduralCover book={book} className={className} />;
  }

  // Default to Annapoorna style for all other tenants.
  return <AnnapoornaProceduralCover book={book} className={className} />;
};

export default BookCover;