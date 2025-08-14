import React from 'react';

interface BookCoverProps {
  title: string;
  className?: string;
}

const BookCover: React.FC<BookCoverProps> = ({ title, className }) => {
  // Simple hashing function to get a color from the title
  const getHashOfString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = hash & hash;
    return hash;
  };

  const colors = [
    'bg-red-100 text-red-800 border-red-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-orange-100 text-orange-800 border-orange-200',
  ];

  const colorIndex = Math.abs(getHashOfString(title)) % colors.length;
  const colorClasses = colors[colorIndex];

  const titleWords = title.split(' ');
  const acronym = titleWords.map(word => word[0]).join('').substring(0, 4).toUpperCase();

  return (
    <div className={`flex flex-col items-center justify-center p-2 text-center font-sans border ${colorClasses} ${className}`}>
      <div className="flex-grow flex items-center justify-center">
        <span className="text-3xl font-black tracking-tighter">{acronym}</span>
      </div>
      <span className="text-xs mt-1 leading-tight font-semibold self-stretch">{title}</span>
    </div>
  );
};

export default BookCover;