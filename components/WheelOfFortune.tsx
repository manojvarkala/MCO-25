import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import { Gift, X, Info } from 'lucide-react';

interface WheelOfFortuneProps {
    isOpen: boolean;
    onClose: () => void;
}

const allPossibleSegments = [
    { label: "Annual Subscription", prizeId: "SUB_YEARLY", color: "bg-yellow-500", textColor: "text-gray-900" },
    { label: "Better Luck Next Time", prizeId: "NEXT_TIME", color: "bg-gray-800", textColor: "text-yellow-400" },
    { label: "Free CPC Exam", prizeId: "EXAM_CPC", color: "bg-yellow-500", textColor: "text-gray-900" },
    { label: "Monthly Subscription", prizeId: "SUB_MONTHLY", color: "bg-yellow-500", textColor: "text-gray-900" },
    { label: "Better Luck Next Time", prizeId: "NEXT_TIME", color: "bg-gray-800", textColor: "text-yellow-400" },
    { label: "Free CCA Exam", prizeId: "EXAM_CCA", color: "bg-yellow-500", textColor: "text-gray-900" },
    { label: "Weekly Subscription", prizeId: "SUB_WEEKLY", color: "bg-yellow-500", textColor: "text-gray-900" },
    { label: "Better Luck Next Time", prizeId: "NEXT_TIME", color: "bg-gray-800", textColor: "text-yellow-400" },
];

const shuffleArray = <T,>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ isOpen, onClose }) => {
    const { token, loginWithToken, setHasSpunWheel } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [displaySegments, setDisplaySegments] = useState(allPossibleSegments);
    const [spinsLeft, setSpinsLeft] = useState(1);

    useEffect(() => {
        // Ensure high-value prize is always visible by shuffling a list that contains it
        const segmentsToShuffle = [...allPossibleSegments];
        setDisplaySegments(shuffleArray(segmentsToShuffle));
    }, []);

    const handleSpin = async () => {
        if (!token || isSpinning) return;
        setIsSpinning(true);
        setSpinsLeft(0);

        try {
            const result = await googleSheetsService.spinWheel(token);
            const { prizeId, prizeLabel, newToken } = result;

            const targetIndex = displaySegments.findIndex(s => s.prizeId === prizeId && s.label === prizeLabel);
            const fallbackIndex = targetIndex !== -1 ? targetIndex : displaySegments.findIndex(s => s.prizeId === 'NEXT_TIME');
            
            const degreesPerSegment = 360 / displaySegments.length;
            const randomOffset = (Math.random() * 0.8 - 0.4) * degreesPerSegment;
            const targetRotation = 360 - (fallbackIndex * degreesPerSegment + degreesPerSegment / 2) + randomOffset;
            
            const fullSpins = 6 * 360;
            setRotation(rotation + fullSpins + targetRotation);
            
            setTimeout(() => {
                if (prizeId !== 'NEXT_TIME') {
                    toast.success(`Congratulations! You won: ${prizeLabel}. Your prize has been activated.`, { duration: 4000 });
                    if (newToken) {
                       loginWithToken(newToken);
                    }
                } else {
                    toast.error("Better luck next time!");
                }
                setHasSpunWheel(true);
                setTimeout(onClose, 1500);
            }, 7000);

        } catch (error: any) {
            toast.error(error.message || "An error occurred.");
            setIsSpinning(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-black rounded-2xl shadow-xl p-6 w-full max-w-sm text-white text-center relative animate-fade-in-up border border-yellow-800/50">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition">
                    <X size={24} />
                </button>

                <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
                    Spin & Win
                    <div className="group relative">
                        <Info size={16} className="text-gray-400 cursor-pointer"/>
                        <div className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Win free exams or subscriptions! This is a one-time opportunity.
                        </div>
                    </div>
                </h2>
                
                <div className="relative w-72 h-72 mx-auto my-8">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                        <svg width="30" height="40" viewBox="0 0 38 51" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 50.5C19 50.5 37.5 32.8856 37.5 19C37.5 5.11442 29.3856 0.5 19 0.5C8.61442 0.5 0.5 5.11442 0.5 19C0.5 32.8856 19 50.5 19 50.5Z" fill="url(#paint0_linear_1_2)" stroke="#E5E7EB" />
                            <defs><linearGradient id="paint0_linear_1_2" x1="19" y1="0.5" x2="19" y2="50.5" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#D1D5DB"/></linearGradient></defs>
                        </svg>
                    </div>
                    <div 
                        className="w-full h-full rounded-full border-[12px] border-zinc-900 bg-black transition-transform duration-[7000ms] ease-out-cubic"
                        style={{ transform: `rotate(${rotation}deg)` }}
                    >
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                            {displaySegments.map((segment, index) => {
                                const angle = 360 / displaySegments.length;
                                const isGold = segment.prizeId !== 'NEXT_TIME';
                                return (
                                    <div key={index} className="absolute w-1/2 h-1/2 origin-bottom-right" style={{ transform: `rotate(${index * angle}deg)` }}>
                                        <div 
                                            className={`w-full h-full ${isGold ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-black'}`}
                                            style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                                        >
                                            <div className="absolute w-full h-full flex items-center justify-center" style={{transform: `rotate(${angle / 2 - 90}deg) translateY(-50%)`}}>
                                                 <span className={`text-xs font-bold ${isGold ? 'text-black' : 'text-yellow-400'}`}>
                                                    {segment.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black border-2 border-zinc-700"></div>
                     </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="bg-zinc-800 h-20 w-12 rounded-t-lg -mb-1 flex items-end justify-center p-1">
                        <button 
                            onClick={handleSpin}
                            disabled={isSpinning || spinsLeft === 0}
                            className="w-8 h-8 rounded-full bg-amber-500 disabled:bg-zinc-600 ring-2 ring-amber-300 disabled:ring-zinc-500"
                        ></button>
                    </div>
                     <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                        <div className="bg-black text-white font-semibold py-2 px-6 rounded-md border border-amber-600">
                            Spins left : {spinsLeft}
                        </div>
                     </div>
                </div>

            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
                .ease-out-cubic {
                    transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
                }
            `}</style>
        </div>
    );
};

export default WheelOfFortune;