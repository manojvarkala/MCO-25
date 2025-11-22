import React, { FC } from 'react';
import type { RecommendedBook } from '../types.ts';
import { useAppContext } from '../context/AppContext.tsx';

interface BookCoverProps {
  book: RecommendedBook;
  className?: string;
}

const getHashOfString = (str: string) => {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = hash & hash;
  return hash;
};

// --- Annapoorna (Default) Tenant Procedural Covers ---

const AnnapoornaStyleA: FC<{ book: RecommendedBook; color: { bg: string; pattern: string; text: string; } }> = ({ book, color }) => (
    <div className={`relative w-full h-full overflow-hidden flex items-center justify-center text-center p-4 ${color.text}`}>
        <div className={`absolute top-0 left-0 w-full h-full ${color.bg}`}></div>
        <div className={`absolute top-0 left-0 w-full h-full ${color.pattern}`} style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
             <svg width="100%" height="100%" className="absolute inset-0 opacity-10">
                <defs>
                    <pattern id="annapoorna-pattern-a" patternUnits="userSpaceOnUse" width="20" height="20">
                        <circle cx="10" cy="10" r="1" fill="white" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#annapoorna-pattern-a)" />
            </svg>
        </div>
        <div className="relative z-10">
            <span className="text-xs uppercase tracking-widest opacity-70">Study Material</span>
            <h4 className="font-bold text-lg leading-tight mt-1">{book.title}</h4>
        </div>
    </div>
);

const AnnapoornaStyleB: FC<{ book: RecommendedBook; color: { bg: string; shape: string; text: string; } }> = ({ book, color }) => (
    <div className={`relative w-full h-full overflow-hidden flex flex-col justify-end text-left p-4 ${color.text} ${color.bg}`}>
        <div className={`absolute -right-1/4 -top-1/4 w-3/4 h-3/4 rounded-full ${color.shape} opacity-50`} style={{ mixBlendMode: 'multiply' }}></div>
        <div className="relative z-10">
            <h4 className="font-bold text-2xl leading-tight">{book.title}</h4>
            <span className="text-xs uppercase tracking-widest opacity-70">Official Guide</span>
        </div>
    </div>
);

const AnnapoornaProceduralCover: FC<Omit<BookCoverProps, 'className'>> = ({ book }) => {
    const hash = getHashOfString(book.title);
    const styleIndex = Math.abs(hash) % 2;
    const colorIndex = Math.floor(Math.abs(hash) / 2) % 5;

    const colorsA = [
        { bg: 'bg-indigo-700', pattern: 'bg-indigo-800', text: 'text-white' },
        { bg: 'bg-teal-700', pattern: 'bg-teal-800', text: 'text-white' },
        { bg: 'bg-slate-700', pattern: 'bg-slate-800', text: 'text-white' },
        { bg: 'bg-blue-800', pattern: 'bg-blue-900', text: 'text-white' },
        { bg: 'bg-gray-700', pattern: 'bg-gray-800', text: 'text-white' },
    ];
    
    const colorsB = [
        { bg: 'bg-blue-100', shape: 'bg-blue-300', text: 'text-blue-900' },
        { bg: 'bg-emerald-100', shape: 'bg-emerald-300', text: 'text-emerald-900' },
        { bg: 'bg-rose-100', shape: 'bg-rose-300', text: 'text-rose-900' },
        { bg: 'bg-violet-100', shape: 'bg-violet-300', text: 'text-violet-900' },
        { bg: 'bg-slate-100', shape: 'bg-slate-300', text: 'text-slate-900' },
    ];
    
    if (styleIndex === 0) {
        return <AnnapoornaStyleA book={book} color={colorsA[colorIndex]} />;
    }
    return <AnnapoornaStyleB book={book} color={colorsB[colorIndex]} />;
};


// --- MCO Tenant Procedural Covers ---

const MCOStyleA: FC<{ book: RecommendedBook; color: { bg: string; text: string; bgWord: string; } }> = ({ book, color }) => {
    const titleWords = book.title.split(' ');
    const bgWord = (titleWords.find(w => w.length > 4) || titleWords[0] || '').toUpperCase();
    return (
         <div className={`relative overflow-hidden flex flex-col justify-center items-start text-left p-4 w-full h-full ${color.bg} ${color.text}`}>
            <div className={`absolute -bottom-4 -right-2 text-9xl font-black ${color.bgWord} select-none leading-none z-0`}>
                {bgWord}
            </div>
            <div className="relative z-10">
                <h4 className="font-extrabold text-2xl leading-tight">{book.title}</h4>
            </div>
        </div>
    );
};

const MCOStyleB: FC<{ book: RecommendedBook; color: { bg: string; text: string; accent: string; } }> = ({ book, color }) => {
    return (
        <div className={`relative w-full h-full flex flex-col justify-between p-4 ${color.bg} ${color.text}`}>
            <div className={`absolute top-4 left-0 w-1 h-1/4 ${color.accent}`}></div>
            <div>
                 <span className="text-xs uppercase tracking-widest opacity-70">Reference Material</span>
                <h4 className="font-bold text-lg leading-tight mt-1">{book.title}</h4>
            </div>
            <div className={`self-end text-5xl font-black opacity-10 select-none`}>
                MCO
            </div>
        </div>
    );
};

const McoProceduralCover: FC<Omit<BookCoverProps, 'className'>> = ({ book }) => {
    const hash = getHashOfString(book.title);
    const styleIndex = Math.abs(hash) % 2;
    const colorIndex = Math.floor(Math.abs(hash) / 2) % 4;
    
    const colorsA = [
        { bg: 'bg-gray-800', text: 'text-gray-100', bgWord: 'text-gray-700' },
        { bg: 'bg-blue-900', text: 'text-blue-100', bgWord: 'text-blue-800' },
        { bg: 'bg-green-900', text: 'text-green-100', bgWord: 'text-green-800' },
        { bg: 'bg-indigo-900', text: 'text-indigo-100', bgWord: 'text-indigo-800' },
    ];
    const colorsB = [
        { bg: 'bg-gray-900', text: 'text-white', accent: 'bg-amber-500' },
        { bg: 'bg-slate-800', text: 'text-white', accent: 'bg-sky-500' },
        { bg: 'bg-zinc-800', text: 'text-white', accent: 'bg-lime-500' },
        { bg: 'bg-stone-800', text: 'text-white', accent: 'bg-rose-500' },
    ];

    if (styleIndex === 0) {
        return <MCOStyleA book={book} color={colorsA[colorIndex]} />;
    }
    return <MCOStyleB book={book} color={colorsB[colorIndex]} />;
};


// --- Main BookCover Component ---
const BookCover: FC<BookCoverProps> = ({ book, className }) => {
  const { activeOrg } = useAppContext();

  if (typeof book.thumbnailUrl === 'string' && book.thumbnailUrl) {
    return (
      <div className={`relative ${className} bg-slate-100`}>
        <img src={book.thumbnailUrl} alt={book.title} className="w-full h-full object-cover" />
      </div>
    );
  }
  
  const ProceduralCover = (activeOrg && activeOrg.id === 'org-medical-coding-online') 
    ? <McoProceduralCover book={book} />
    : <AnnapoornaProceduralCover book={book} />;

  return (
    <div className={className}>
      {ProceduralCover}
    </div>
  );
};

export default BookCover;