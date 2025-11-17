import React, { FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exam, Organization } from '../types';
import { ShoppingCart, Package, Plus, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ExamBundleCardProps {
    certExam: Exam;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
    type: 'practice' | 'subscription';
}

const ExamBundleCard: FC<ExamBundleCardProps> = ({ certExam, activeOrg, examPrices, type }) => {
    const navigate = useNavigate();
    const { isSubscribed } = useAuth();

    const { bundle, examPrice, subPrice } = useMemo(() => {
        if (!examPrices) return { bundle: null, examPrice: null, subPrice: null };

        const bundleSku = type === 'subscription' 
            ? `${certExam.productSku}-1mo-addon` 
            : `${certExam.productSku}-1`;

        const examPriceData = examPrices[certExam.productSku];
        const subPriceData = examPrices['sub-monthly'];

        return {
            bundle: examPrices[bundleSku],
            examPrice: examPriceData,
            subPrice: subPriceData,
        };
    }, [examPrices, certExam, type]);

    if (!bundle || isSubscribed) {
        return null;
    }

    const price = bundle.price;
    const regularPrice = bundle.regularPrice;
    
    const checkoutUrl = bundle.productId
        ? `https://${activeOrg.website}/cart/?add-to-cart=${bundle.productId}`
        : `https://${activeOrg.website}/product/${bundle.slug || certExam.productSlug}/`;

    return (
        <div className="relative flex flex-col p-6 rounded-xl text-white shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-yellow-400">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-sm font-bold uppercase px-4 py-1 rounded-full flex items-center gap-1.5">
                <Star size={14} className="fill-current"/> Best Value
            </div>
            
            <h3 className="text-xl font-bold text-center mt-4">{bundle.name || `${certExam.name} Bundle`}</h3>
            
            <div className="mt-6 text-center">
                {regularPrice && regularPrice > price ? (
                    <>
                        <span className="text-2xl line-through opacity-70">${regularPrice.toFixed(2)}</span>
                        <span className="text-5xl font-extrabold ml-2">${price.toFixed(2)}</span>
                    </>
                ) : (
                    <span className="text-5xl font-extrabold">${price.toFixed(2)}</span>
                )}
            </div>

            <div className="flex-grow mt-6 pt-6 border-t border-white/20">
                <h4 className="font-semibold text-center mb-4">What's Included:</h4>
                <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="flex items-center text-sm bg-white/10 px-3 py-1 rounded-full">
                        <Package size={14} className="mr-2" />
                        <span>{certExam.name}</span>
                        {examPrice && <span className="ml-2 opacity-70 text-xs">(${examPrice.price.toFixed(2)})</span>}
                    </div>
                    <Plus size={16} className="text-white/50" />
                    <div className="flex items-center text-sm bg-white/10 px-3 py-1 rounded-full">
                        {type === 'subscription' ? (
                            <>
                                <Star size={14} className="mr-2 text-yellow-300" />
                                <span>1-Month Premium Subscription</span>
                                {subPrice && <span className="ml-2 opacity-70 text-xs">(${subPrice.price.toFixed(2)})</span>}
                            </>
                        ) : (
                             <>
                                <Package size={14} className="mr-2" />
                                <span>Practice Exam</span>
                             </>
                        )}
                    </div>
                </div>
            </div>

            <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-8 flex items-center justify-center gap-2 bg-yellow-400 text-slate-800 font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 transition-transform transform hover:scale-105"
            >
                <ShoppingCart size={18} /> Buy Bundle
            </a>
        </div>
    );
};
export default ExamBundleCard;