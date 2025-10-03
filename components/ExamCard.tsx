import React, { FC } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import type { Exam, Organization } from '../types.ts';
import { Award, BookOpen, CheckCircle, Clock, HelpCircle, PlayCircle, ShoppingCart } from 'lucide-react';

export interface ExamCardProps {
    exam: Exam;
    programId: string;
    isPractice: boolean;
    isPurchased: boolean;
    gradientClass: string;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
    hideDetailsLink?: boolean;
}

const ExamCard: FC<ExamCardProps> = ({ exam, programId, isPractice, isPurchased, gradientClass, activeOrg, examPrices, hideDetailsLink = false }) => {
    const navigate = useNavigate();
    const { isSubscribed } = useAuth();
    const canTake = isPractice || isPurchased || isSubscribed;
    const buttonText = isPractice ? 'Start Practice' : canTake ? 'Start Exam' : 'Add to Cart';

    const handleButtonClick = () => {
        if (canTake) {
            navigate(`/test/${exam.id}`);
        } else if (exam.productSku && examPrices && activeOrg) {
            const product = examPrices[exam.productSku];
            if (product && product.productId) {
                const addToCartUrl = `https://www.${activeOrg.website}/cart/?add-to-cart=${product.productId}`;
                window.location.href = addToCartUrl;
            } else {
                 toast.error("This exam cannot be added to the cart at this moment.");
            }
        } else {
            toast.error("This exam is not available for purchase at the moment.");
        }
    };

    const Icon = isPractice ? BookOpen : Award;

    return (
        <div className={`rounded-xl shadow-lg overflow-hidden flex flex-col text-white relative ${gradientClass}`}>
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-full">
                            <Icon size={20} />
                        </div>
                        <span className="font-bold text-sm uppercase tracking-wider">{isPractice ? "Practice Exam" : "Certification Exam"}</span>
                    </div>
                    {isPractice && (
                        <span className="bg-green-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full shadow-md">
                            Free
                        </span>
                    )}
                </div>
                
                <h3 className="text-lg font-bold mb-2 leading-tight flex-grow">{exam.name}</h3>

                <div className="flex justify-between text-sm text-white/80 my-4 p-3 bg-black/10 rounded-md">
                    <span><HelpCircle size={14} className="inline mr-1" />{exam.numberOfQuestions} Qs</span>
                    <span><Clock size={14} className="inline mr-1" />{exam.durationMinutes} Mins</span>
                    <span><CheckCircle size={14} className="inline mr-1" />{exam.passScore}% Pass</span>
                </div>
                
                {!canTake && exam.price > 0 && (
                    <div className="text-center mb-4">
                        {exam.regularPrice && exam.regularPrice > exam.price ? (
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-xl line-through text-white/70">${exam.regularPrice.toFixed(2)}</span>
                                <span className="text-4xl font-extrabold text-white">${exam.price.toFixed(2)}</span>
                            </div>
                        ) : (
                            <span className="text-4xl font-extrabold text-white">${exam.price.toFixed(2)}</span>
                        )}
                    </div>
                )}

                <div className="mt-auto space-y-2">
                    <button
                        onClick={handleButtonClick}
                        className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 ${
                            canTake
                                ? 'bg-white text-slate-800 hover:bg-slate-200'
                                : 'bg-yellow-400 hover:bg-yellow-500 text-slate-800'
                        }`}
                    >
                        {isPractice ? <PlayCircle size={18} /> : (canTake ? <PlayCircle size={18} /> : <ShoppingCart size={18} />)}
                        {buttonText}
                    </button>
                    {!hideDetailsLink && (
                        <Link
                            to={`/program/${programId}`}
                            className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all"
                        >
                            View Program Details
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamCard;