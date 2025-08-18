import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import { Gift, X, Info } from 'lucide-react';

interface WheelOfFortuneProps {
    isOpen: boolean;
    onClose: () => void;
}

const allPossibleSegments = [
    { label: "Annual Subscription", prizeId: "SUB_YEARLY" },
    { label: "Weekly Subscription", prizeId: "SUB_WEEKLY" },
    { label: "Free CPC Exam", prizeId: "EXAM_CPC" },
    { label: "Monthly Subscription", prizeId: "SUB_MONTHLY" },
    { label: "Better Luck Next Time", prizeId: "NEXT_TIME" },
    { label: "Free CCA Exam", prizeId: "EXAM_CCA" },
    { label: "Weekly Subscription", prizeId: "SUB_WEEKLY" },
    { label: "Monthly Subscription", prizeId: "SUB_MONTHLY" },
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
    const { user, token, loginWithToken, spinsAvailable } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [displaySegments, setDisplaySegments] = useState(allPossibleSegments);
    const [conicGradient, setConicGradient] = useState('');
    
    // State for the slide-to-spin interaction
    const [dragY, setDragY] = useState(0);
    const dragYRef = useRef(0);
    const sliderHandleRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);


    useEffect(() => {
        const segmentsToShuffle = [...allPossibleSegments];
        const shuffled = shuffleArray(segmentsToShuffle);
        setDisplaySegments(shuffled);

        const gradientString = shuffled.map((_, index) => {
            const isGold = index % 2 === 0;
            const color = isGold ? '#ca8a04' : '#171717';
            const startAngle = (360 / shuffled.length) * index;
            const endAngle = (360 / shuffled.length) * (index + 1);
            return `${color} ${startAngle}deg ${endAngle}deg`;
        }).join(', ');
        setConicGradient(gradientString);
    }, []);

    const handleSpin = async () => {
        if (!token || isSpinning) return;
        setIsSpinning(true);
        
        const toastId = toast.loading('Spinning the wheel...');

        try {
            const result = await googleSheetsService.spinWheel(token);
            const { prizeId, prizeLabel, newToken } = result;

            // Update auth state immediately with the new token from the server
            if (newToken) {
                await loginWithToken(newToken);
            }
            
            const matchingIndices: number[] = [];
            displaySegments.forEach((segment, index) => {
                if (segment.prizeId === prizeId) {
                    matchingIndices.push(index);
                }
            });
    
            let targetIndex: number;
            if (matchingIndices.length > 0) {
                targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
            } else {
                console.warn(`Prize ID ${prizeId} not found on wheel. Landing on a fallback.`);
                const fallbackIndices: number[] = [];
                displaySegments.forEach((s, i) => { if (s.prizeId === 'NEXT_TIME') fallbackIndices.push(i); });
                targetIndex = fallbackIndices.length > 0 ? fallbackIndices[Math.floor(Math.random() * fallbackIndices.length)] : 0;
            }

            const degreesPerSegment = 360 / displaySegments.length;
            const randomOffset = (Math.random() * 0.8 - 0.4) * degreesPerSegment;
            const targetRotation = 360 - (targetIndex * degreesPerSegment + degreesPerSegment / 2) + randomOffset;
            
            const fullSpins = 6 * 360;
            setRotation(rotation + fullSpins + targetRotation);
            
            setTimeout(() => {
                toast.dismiss(toastId);
                if (prizeId !== 'NEXT_TIME') {
                    toast.success(`Congratulations! You won: ${prizeLabel}. Your prize has been activated.`, { duration: 4000 });
                } else {
                    toast.error("Better luck next time!");
                }
                
                if (user && !user.isAdmin) {
                    setTimeout(onClose, 1500);
                } else {
                    setIsSpinning(false); // Re-enable for admins
                }
            }, 7000);

        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.message || "An error occurred.");
            setIsSpinning(false);
            if(user && !user.isAdmin) {
               onClose();
            }
        }
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        if (isSpinning || (spinsAvailable === 0 && !user?.isAdmin)) return;
        
        isDraggingRef.current = true;
        startYRef.current = clientY;
        
        if (sliderHandleRef.current) {
            sliderHandleRef.current.style.transition = 'none';
        }

        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);
        
        if (e.cancelable) e.preventDefault();
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - startYRef.current;
        const newDragY = Math.max(-60, Math.min(0, deltaY));
        setDragY(newDragY);
        dragYRef.current = newDragY;
    };

    const handleDragEnd = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        
        if (dragYRef.current <= -55) { // Threshold met
            handleSpin();
        }
        
        if (sliderHandleRef.current) {
            sliderHandleRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        }
        setDragY(0);
        dragYRef.current = 0;

        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true">
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
                        className="w-full h-full rounded-full border-[12px] border-zinc-900 transition-transform duration-[7000ms] ease-out-cubic relative"
                        style={{ 
                            transform: `rotate(${rotation}deg)`,
                            background: `conic-gradient(${conicGradient})`
                        }}
                    >
                        {displaySegments.map((segment, index) => {
                            const angle = 360 / displaySegments.length;
                            const rotationAngle = index * angle;
                            const textRotationAngle = rotationAngle + angle / 2 - 90; // Adjust for radial text
                            const isGold = index % 2 === 0;

                            return (
                                <React.Fragment key={index}>
                                    <div
                                        className="absolute w-full h-full"
                                        style={{ transform: `rotate(${rotationAngle}deg)` }}
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-px w-px h-1/2 bg-amber-800/75"></div>
                                    </div>
                                    <div
                                        className="absolute w-full h-full"
                                        style={{ transform: `rotate(${textRotationAngle}deg)` }}
                                    >
                                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 pt-6 w-32 h-32 text-center text-xs font-bold ${isGold ? 'text-black' : 'text-amber-300'}`}>
                                            <span style={{ transformOrigin: 'center', writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                                                {segment.label}
                                            </span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black border-2 border-zinc-700"></div>
                     </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="bg-zinc-800 h-24 w-16 rounded-full -mb-2 flex items-end justify-center p-2 relative select-none touch-none">
                        <div
                            ref={sliderHandleRef}
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            className={`w-12 h-12 rounded-full ring-4 ring-amber-300/50 flex items-center justify-center cursor-grab active:cursor-grabbing ${isSpinning || (spinsAvailable === 0 && !user?.isAdmin) ? 'bg-zinc-600' : 'bg-amber-500'}`}
                            style={{ transform: `translateY(${dragY}px)` }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m18 15-6-6-6 6"/></svg>
                        </div>
                        <div className="absolute top-4 text-xs text-zinc-400 pointer-events-none transform -rotate-90 origin-center tracking-widest">
                            SPIN
                        </div>
                    </div>
                     <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                        <div className="bg-black text-white font-semibold py-2 px-6 rounded-md border border-amber-600">
                            Spins left : {user?.isAdmin ? '∞' : spinsAvailable}
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