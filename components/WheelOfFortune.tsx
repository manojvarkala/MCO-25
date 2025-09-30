import React from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import { Gift, X, Info } from 'lucide-react';
import type { TokenPayload } from '../types.ts';

interface WheelOfFortuneProps {
    isOpen: boolean;
    onClose: () => void;
}

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
    const { activeOrg } = useAppContext();
    const [isSpinning, setIsSpinning] = React.useState(false);
    const [rotation, setRotation] = React.useState(0);
    const [prizeResult, setPrizeResult] = React.useState<{ prizeId: string; prizeLabel: string; } | null>(null);
    const [displaySegments, setDisplaySegments] = React.useState<{ label: string; prizeId: string }[]>([]);
    const [conicGradient, setConicGradient] = React.useState('');
    
    const [dragY, setDragY] = React.useState(0);
    const dragYRef = React.useRef(0);
    const sliderHandleRef = React.useRef<HTMLDivElement>(null);
    const isDraggingRef = React.useRef(false);
    const startYRef = React.useRef(0);

    React.useEffect(() => {
        const genericPrizes = [
            { label: "Annual Subscription", prizeId: "SUB_YEARLY" },
            { label: "Monthly Subscription", prizeId: "SUB_MONTHLY" },
            { label: "Better Luck Next Time", prizeId: "NEXT_TIME" },
            { label: "Weekly Subscription", prizeId: "SUB_WEEKLY" },
        ];
    
        if (!activeOrg) {
            setDisplaySegments(shuffleArray(genericPrizes));
            return;
        }
    
        const examPrizes = activeOrg.exams
            .filter(exam => !exam.isPractice && exam.price > 0)
            .slice(0, 4) // Take up to 4 exams to keep the wheel balanced
            .map(exam => ({
                label: `Free ${exam.name}`,
                prizeId: exam.productSku
            }));
    
        const combinedPrizes = [...genericPrizes, ...examPrizes];
        
        const finalSegments = [];
        let i = 0;
        while (finalSegments.length < 8) {
            finalSegments.push(combinedPrizes[i % combinedPrizes.length]);
            i++;
        }
    
        const shuffled = shuffleArray(finalSegments);
        setDisplaySegments(shuffled);

        const gradientString = shuffled.map((_, index) => {
            const isGold = index % 2 === 0;
            const color = isGold ? '#f59e0b' : '#27272a'; // amber-500, zinc-800
            const startAngle = (360 / shuffled.length) * index;
            const endAngle = (360 / shuffled.length) * (index + 1);
            return `${color} ${startAngle}deg ${endAngle}deg`;
        }).join(', ');
        setConicGradient(gradientString);
    }, [activeOrg]);

     React.useEffect(() => {
        if (prizeResult) {
            if (prizeResult.prizeId !== 'NEXT_TIME') {
                toast.success(`Congratulations! You won: ${prizeResult.prizeLabel}. Your prize has been activated.`, { duration: 5000 });
            } else {
                toast.error("Better luck next time!");
            }

            const canSpinAgain = user?.isAdmin || spinsAvailable > 1; // Check if more than 1 spin remains AFTER the current one
            if (!canSpinAgain) {
                setTimeout(onClose, 3000);
            }
        }
    }, [prizeResult, onClose]);

    const handleSpin = async () => {
        if (!token || isSpinning) return;

        setIsSpinning(true);
        setPrizeResult(null);
        
        const toastId = toast.loading('Spinning the wheel...');

        try {
            const result = await googleSheetsService.spinWheel(token);
            const { prizeId, prizeLabel, newToken } = result;

            if (newToken) {
                // False flag refreshes the entire auth context, including the new spin count
                await loginWithToken(newToken, false);
            }
            
            const prizeIndex = displaySegments.findIndex(segment => segment.prizeId === prizeId);
            const segmentAngle = 360 / displaySegments.length;
            const targetAngle = 360 - (prizeIndex * segmentAngle) - (segmentAngle / 2);

            const randomExtraSpins = Math.floor(Math.random() * 2) * 360;
            const fullSpins = 6 * 360;
            setRotation(rotation + fullSpins + randomExtraSpins + targetAngle);
            
            setTimeout(() => {
                toast.dismiss(toastId);
                setPrizeResult({ prizeId, prizeLabel });
                setIsSpinning(false);
            }, 7000); // Match CSS transition duration

        } catch (error: any) {
            toast.dismiss(toastId);
            setIsSpinning(false);
            toast.error(error.message || "An error occurred.");
            if(user && !user.isAdmin) {
               onClose();
            }
        }
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        if (isSpinning || prizeResult || (spinsAvailable === 0 && !user?.isAdmin)) return;
        
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
    
    const PrizeResultDisplay = () => {
        if (!prizeResult) return null;

        const isWin = prizeResult.prizeId !== 'NEXT_TIME';
        const buttonText = (spinsAvailable > 0 || !!user?.isAdmin) ? 'Spin Again' : 'Close';

        return (
            <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center animate-fade-in z-30 p-4">
                <Gift size={48} className="text-yellow-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-200 mb-2">{isWin ? "You won..." : "Sorry..."}</h3>
                <p className="text-4xl font-extrabold text-white mb-8 text-center">{prizeResult.prizeLabel}</p>
                <button 
                    onClick={() => {
                        if (spinsAvailable > 0 || !!user?.isAdmin) {
                            setPrizeResult(null);
                            setIsSpinning(false);
                        } else {
                            onClose();
                        }
                    }} 
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg transition"
                >
                    {buttonText}
                </button>
            </div>
        );
    };

    const canSpin = !isSpinning && !prizeResult && (spinsAvailable > 0 || !!user?.isAdmin);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true">
            <div className="bg-black rounded-2xl shadow-xl p-6 w-full max-w-sm text-white text-center relative animate-fade-in-up border border-yellow-800/50 overflow-hidden">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition z-40">
                    <X size={24} />
                </button>
                
                <PrizeResultDisplay />

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
                    <div className="w-full h-full rounded-full p-2 border-4 border-amber-500/30 bg-zinc-800 shadow-inner">
                        <div 
                            className="w-full h-full rounded-full border-[10px] border-zinc-950 transition-transform duration-[7000ms] ease-out-cubic relative shadow-[inset_0_8px_15px_rgba(0,0,0,0.6)]"
                            style={{ 
                                transform: `rotate(${rotation}deg)`,
                                background: `conic-gradient(${conicGradient})`
                            }}
                        >
                            {displaySegments.map((segment, index) => {
                                const angle = 360 / displaySegments.length;
                                const rotationAngle = index * angle;
                                const textRotationAngle = rotationAngle + angle / 2;
                                const isGold = index % 2 === 0;

                                return (
                                    <React.Fragment key={index}>
                                        <div
                                            className="absolute w-full h-full"
                                            style={{ transform: `rotate(${rotationAngle}deg)` }}
                                        >
                                            <div className="absolute top-0 left-1/2 -translate-x-px w-px h-1/2 bg-amber-200/20"></div>
                                        </div>
                                        <div
                                            className="absolute w-full h-full"
                                            style={{ transform: `rotate(${textRotationAngle}deg)` }}
                                        >
                                             <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-1/2 pt-4 flex items-start justify-center text-center text-xs font-bold ${isGold ? 'text-zinc-900' : 'text-amber-400'}`}>
                                                <span className="inline-block transform rotate-90 origin-center" style={{ width: '100px' }}>
                                                    {segment.label}
                                                </span>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.3), rgba(255,255,255,0) 70%)' }}></div>
                        </div>
                    </div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center shadow-lg">
                        <div className="w-12 h-12 rounded-full bg-black border-2 border-zinc-700 shadow-inner"></div>
                     </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="bg-zinc-800 h-24 w-16 rounded-full -mb-2 flex items-end justify-center p-2 relative select-none touch-none">
                        <div
                            ref={sliderHandleRef}
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            className={`w-12 h-12 rounded-full ring-4 ring-amber-300/50 flex items-center justify-center transition-colors ${canSpin ? 'cursor-grab bg-amber-500 hover:bg-amber-600' : 'cursor-not-allowed bg-zinc-600'}`}
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
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-in-out forwards;
                }
            `}</style>
        </div>
    );
};

export default WheelOfFortune;