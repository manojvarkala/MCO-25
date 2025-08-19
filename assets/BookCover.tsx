import * as React from 'react';

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

  const bgColors = [
    'from-red-50 to-red-100',
    'from-yellow-50 to-yellow-100',
    'from-green-50 to-green-100',
    'from-blue-50 to-blue-100',
    'from-indigo-50 to-indigo-100',
    'from-purple-50 to-purple-100',
    'from-pink-50 to-pink-100',
    'from-teal-50 to-teal-100',
    'from-orange-50 to-orange-100',
  ];

  const textColors = [
    'text-red-900',
    'text-yellow-900',
    'text-green-900',
    'text-blue-900',
    'text-indigo-900',
    'text-purple-900',
    'text-pink-900',
    'text-teal-900',
    'text-orange-900',
  ]
  
  const accentColors = [
      'bg-red-300', 'bg-yellow-300', 'bg-green-300', 'bg-blue-300', 'bg-indigo-300', 'bg-purple-300', 'bg-pink-300', 'bg-teal-300', 'bg-orange-300'
  ]

  const colorIndex = Math.abs(getHashOfString(title)) % bgColors.length;
  const bgColorClass = bgColors[colorIndex];
  const textColorClass = textColors[colorIndex];
  const accentColorClass = accentColors[colorIndex];

  const titleWords = title.split(' ');
  
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