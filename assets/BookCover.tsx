import React, { FC } from 'react';
import type { RecommendedBook } from '../types.ts';

interface BookCoverProps {
  book: RecommendedBook;
  className?: string;
}

const BookCover: FC<BookCoverProps> = ({ book, className }) => {
  // FIX: Explicitly check if thumbnailUrl is a string before using it in an img src to resolve a type error.
  // If a custom thumbnail URL is provided, use it.
  if (typeof book.thumbnailUrl === 'string' && book.thumbnailUrl) {
    return (
      <div className={`relative ${className} bg-slate-100`}>
        <img src={book.thumbnailUrl} alt={book.title} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback to procedural generation if no thumbnail is available.
  const getHashOfString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = hash & hash;
    return hash;
  };

  const bgColors = [
    'from-red-200 to-red-300', 'from-yellow-200 to-yellow-300', 'from-green-200 to-green-300',
    'from-blue-200 to-blue-300', 'from-indigo-200 to-indigo-300', 'from-purple-200 to-purple-300',
    'from-pink-200 to-pink-300', 'from-teal-200 to-teal-300', 'from-orange-200 to-orange-300',
  ];
  const textColors = [
    'text-red-800', 'text-yellow-800', 'text-green-800', 'text-blue-800', 'text-indigo-800',
    'text-purple-800', 'text-pink-800', 'text-teal-800', 'text-orange-800',
  ];
  const accentColors = [
    'bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-indigo-400',
    'bg-purple-400', 'bg-pink-400', 'bg-teal-400', 'bg-orange-400',
  ];

  const colorIndex = Math.abs(getHashOfString(book.title)) % bgColors.length;
  const bgColorClass = bgColors[colorIndex];
  const textColorClass = textColors[colorIndex];
  const accentColorClass = accentColors[colorIndex];
  const titleWords = book.title.split(' ');

  return (
    <div className={`relative flex flex-col items-center justify-between p-4 text-center font-sans bg-gradient-to-br ${bgColorClass} ${className} overflow-hidden`}>
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-50 ${accentColorClass}`}></div>
      <div className={`absolute -top-12 -left-8 w-24 h-24 rounded-full opacity-50 ${accentColorClass}`}></div>
      <div/>
      <div className="z-10">
        <h4 className={`font-bold text-lg leading-tight ${textColorClass}`}>{titleWords.slice(0, 4).join(" ")}</h4>
        {titleWords.length > 4 && <p className={`text-sm ${textColorClass} opacity-80`}>{titleWords.slice(4).join(" ")}</p>}
      </div>
      <div className={`w-1/3 h-1 rounded-full ${accentColorClass} z-10`}></div>
    </div>
  );
};

export default BookCover;