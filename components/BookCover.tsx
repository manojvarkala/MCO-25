
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
    <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '1.5rem',
        boxSizing: 'border-box',
        backgroundColor: color.bg,
        color: color.text,
        overflow: 'hidden'
    }}>
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            opacity: 0.2,
            backgroundColor: color.pattern
        }}>
             <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                <defs>
                    <pattern id="annapoorna-pattern-a" patternUnits="userSpaceOnUse" width="20" height="20">
                        <circle cx="10" cy="10" r="1" fill="white" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#annapoorna-pattern-a)" />
            </svg>
        </div>
        <div style={{ position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, display: 'block', marginBottom: '0.5rem', color: 'inherit' }}>Study Material</span>
            <h4 style={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1.2, margin: 0, color: 'inherit' }}>{book.title}</h4>
        </div>
    </div>
);

const AnnapoornaStyleB: FC<{ book: RecommendedBook; color: { bg: string; shape: string; text: string; } }> = ({ book, color }) => (
    <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        textAlign: 'left',
        padding: '1.5rem',
        // FIX: Correct CSS property value from 'border-sizing' to 'border-box'.
        boxSizing: 'border-box',
        backgroundColor: color.bg,
        color: color.text,
        overflow: 'hidden'
    }}>
        <div style={{
            position: 'absolute',
            right: '-20%',
            top: '-20%',
            width: '70%',
            height: '70%',
            borderRadius: '50%',
            opacity: 0.5,
            mixBlendMode: 'multiply',
            backgroundColor: color.shape
        }}></div>
        <div style={{ position: 'relative', zIndex: 10 }}>
            <h4 style={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.1, margin: '0 0 0.5rem 0', color: 'inherit' }}>{book.title}</h4>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, color: 'inherit' }}>Official Guide</span>
        </div>
    </div>
);

const AnnapoornaProceduralCover: FC<Omit<BookCoverProps, 'className'>> = ({ book }) => {
    const hash = getHashOfString(book.title);
    const styleIndex = Math.abs(hash) % 2;
    const colorIndex = Math.floor(Math.abs(hash) / 2) % 5;

    const colorsA = [
        { bg: '#4338ca', pattern: '#3730a3', text: '#ffffff' }, // Indigo
        { bg: '#0f766e', pattern: '#115e59', text: '#ffffff' }, // Teal
        { bg: '#334155', pattern: '#1e293b', text: '#ffffff' }, // Slate
        { bg: '#1e40af', pattern: '#1e3a8a', text: '#ffffff' }, // Blue
        { bg: '#374151', pattern: '#1f2937', text: '#ffffff' }, // Gray
    ];
    
    const colorsB = [
        { bg: '#dbeafe', shape: '#93c5fd', text: '#1e3a8a' }, // Blue
        { bg: '#d1fae5', shape: '#6ee7b7', text: '#064e3b' }, // Emerald
        { bg: '#ffe4e6', shape: '#fda4af', text: '#881337' }, // Rose
        { bg: '#ede9fe', shape: '#c4b5fd', text: '#4c1d95' }, // Violet
        { bg: '#f1f5f9', shape: '#cbd5e1', text: '#0f172a' }, // Slate
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
         <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            textAlign: 'left',
            padding: '1.5rem',
            boxSizing: 'border-box',
            backgroundColor: color.bg,
            color: color.text,
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                bottom: '-0.5rem',
                right: '-0.5rem',
                fontSize: '5rem',
                fontWeight: 900,
                lineHeight: 1,
                zIndex: 0,
                opacity: 0.15,
                userSelect: 'none',
                color: color.bgWord
            }}>
                {bgWord}
            </div>
            <div style={{ position: 'relative', zIndex: 10 }}>
                <h4 style={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.2, margin: 0, color: 'inherit', textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{book.title}</h4>
            </div>
        </div>
    );
};

const MCOStyleB: FC<{ book: RecommendedBook; color: { bg: string; text: string; accent: string; } }> = ({ book, color }) => {
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.5rem',
            boxSizing: 'border-box',
            backgroundColor: color.bg,
            color: color.text,
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: '1.5rem',
                left: 0,
                width: '6px',
                height: '25%',
                backgroundColor: color.accent
            }}></div>
            <div>
                 <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, display: 'block', color: 'inherit' }}>Reference Material</span>
                <h4 style={{ fontWeight: 800, fontSize: '1.4rem', lineHeight: 1.2, margin: '0.5rem 0 0 0', color: 'inherit' }}>{book.title}</h4>
            </div>
            <div style={{
                alignSelf: 'flex-end',
                fontSize: '2.5rem',
                fontWeight: 900,
                opacity: 0.1,
                userSelect: 'none',
                color: 'inherit'
            }}>
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
        { bg: '#334155', text: '#f1f5f9', bgWord: '#475569' }, // Gray
        { bg: '#0891b2', text: '#cffafe', bgWord: '#0e7490' }, // Cyan
        { bg: '#115e59', text: '#ccfbf1', bgWord: '#065f46' }, // Emerald
        { bg: '#0369a1', text: '#e0f2fe', bgWord: '#075985' }, // Sky
    ];
    const colorsB = [
        { bg: '#1e293b', text: '#ffffff', accent: '#38bdf8' }, // Slate with Sky accent
        { bg: '#44403c', text: '#ffffff', accent: 'rgb(250, 204, 21)' }, // Stone with Yellow accent (rgb(250, 204, 21)
        { bg: '#0c4a6e', text: '#ffffff', accent: '#fb7185' }, // Blue with Rose accent
        { bg: '#065f46', text: '#ffffff', accent: '#a3e635' }, // Emerald with Lime accent
    ];

    if (styleIndex === 0) {
        return <MCOStyleA book={book} color={colorsA[colorIndex]} />;
    }
    return <MCOStyleB book={book} color={colorsB[colorIndex]} />;
};


// --- Main BookCover Component ---
const BookCover: FC<BookCoverProps> = ({ book, className }) => {
  const { activeOrg } = useAppContext();

  // If thumbnailUrl is provided, render it.
  if (typeof book.thumbnailUrl === 'string' && book.thumbnailUrl) {
    return (
      <div className={`relative ${className}`} style={{ backgroundColor: '#f1f5f9' }}>
        <img 
          src={book.thumbnailUrl} 
          alt={book.title} 
          className="w-full h-full object-cover" 
          crossOrigin={book.thumbnailUrl.startsWith('data:image') ? undefined : "anonymous"} // Only add crossOrigin for external URLs
        />
      </div>
    );
  }
  
  // Otherwise, render a procedural cover based on the tenant.
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
