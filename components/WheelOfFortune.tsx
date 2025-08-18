import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import { Gift, X, Info } from 'lucide-react';

interface WheelOfFortuneProps {
    isOpen: boolean;
    onClose: () => void;
}

const segments = [
    { label: "Free CPC Exam", prizeId: "exam-cpc-cert" },
    { label: "Next Time", prizeId: "NEXT_TIME" },
    { label: "Free CCA Exam", prizeId: "exam-cca-cert" },
    { label: "Next Time", prizeId: "NEXT_TIME" },
    { label: "Free Billing Exam", prizeId: "exam-billing-cert" },
    { label: "Next Time", prizeId: "NEXT_TIME" },
    { label: "Free CCS Exam", prizeId: "exam-ccs-cert" },
    { label: "Next Time", prizeId: "NEXT_TIME" },
];

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ isOpen, onClose }) => {
    const { token, loginWithToken } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const handleSpin = async () => {
        if (!token || isSpinning) return;
        setIsSpinning(true);

        try {
            const result = await googleSheetsService.spinWheel(token);
            const { prizeId, prizeLabel } = result;

            const prizeIndex = segments.findIndex(s => s.prizeId === prizeId);
            const targetIndex = prizeIndex !== -1 ? prizeIndex : segments.findIndex(s => s.prizeId === 'NEXT_TIME');
            
            const degreesPerSegment = 360 / segments.length;
            const randomOffset = Math.random() * degreesPerSegment * 0.8 - degreesPerSegment * 0.4;
            const targetRotation = (targetIndex * degreesPerSegment) + randomOffset;
            const fullSpins = 5 * 360;

            setRotation(rotation + fullSpins + targetRotation);
            
            setTimeout(() => {
                setIsSpinning(false);
                if (prizeId !== 'NEXT_TIME') {
                    toast.success(`Congratulations! You won: ${prizeLabel}. Your new exam is now available on your dashboard. Refreshing your session...`);
                    // Re-login with a new token to get updated purchases
                    if (token) loginWithToken(token);
                } else {
                    toast.error("Better luck next time!");
                }
                setTimeout(onClose, 1000); // Close modal after showing toast
            }, 6000); // Must match the CSS transition duration

        } catch (error: any) {
            toast.error(error.message || "An error occurred. Please try again.");
            setIsSpinning(false);
            onClose(); // Close on error
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-[#1a1a1a] rounded-2xl shadow-xl p-6 w-full max-w-md text-white text-center relative animate-fade-in-up">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition">
                    <X size={24} />
                </button>

                <h2 className="text-3xl font-bold text-yellow-400 flex items-center justify-center gap-2">
                    <Gift /> Spin & Win
                    <div className="group relative">
                        <Info size={16} className="text-gray-400 cursor-pointer"/>
                        <div className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Win a free certification exam! This is a one-time opportunity for new users.
                        </div>
                    </div>
                </h2>
                <p className="text-gray-300 mt-2 mb-6">Spin the wheel for a chance to win a free exam!</p>
                
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto mb-6">
                    {/* Arrow */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                        <div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-white"></div>
                    </div>
                    {/* Wheel */}
                    <div 
                        className="w-full h-full rounded-full border-8 border-gray-700 bg-gray-800 transition-transform duration-[6000ms] ease-out"
                        style={{ transform: `rotate(${rotation}deg)` }}
                    >
                        {segments.map((segment, index) => {
                            const rotationAngle = (360 / segments.length) * index;
                            const isPrize = segment.prizeId !== 'NEXT_TIME';
                            return (
                                <div 
                                    key={index} 
                                    className="absolute w-1/2 h-1/2 origin-bottom-right"
                                    style={{ transform: `rotate(${rotationAngle}deg)` }}
                                >
                                    <div 
                                        className={`w-full h-full ${isPrize ? 'bg-yellow-500' : 'bg-gray-600'}`}
                                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 0)' }}
                                    >
                                        <div 
                                            className="absolute w-full h-full flex items-center justify-center"
                                            style={{ transform: 'rotate(-45deg) translate(25%, 25%)' }}
                                        >
                                            <span className={`text-xs sm:text-sm font-bold ${isPrize ? 'text-gray-900' : 'text-yellow-400'} transform -rotate-90 origin-center`}>
                                                {segment.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 bg-gray-700 rounded-full border-4 border-gray-600"></div>
                </div>

                <button 
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105"
                >
                    {isSpinning ? 'Spinning...' : 'SPIN'}
                </button>
                <p className="text-xs text-gray-500 mt-2">One spin per user.</p>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default WheelOfFortune;
