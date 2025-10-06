import React, { FC, useMemo } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import type { Exam, Organization } from '../types.ts';

interface ExamBundleCardProps {
    certExam: Exam;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
}

const ExamBundleCard: FC<ExamBundleCardProps> = ({ certExam, activeOrg, examPrices }) => {
    const bundleData = useMemo(() => {
        if (!activeOrg || !examPrices || !certExam?.productSku) {
            return null;
        }

        const website = `https://www.${activeOrg.website}`;
        const specificBundleSku = `${certExam.productSku}-1`;
        const priceData = examPrices[specificBundleSku];

        if (!priceData) {
            // If the specific bundle for this exam doesn't exist, don't render the card.
            return null;
        }

        const bundleUrl = priceData.productId
            ? `${website}/cart/?add-to-cart=${priceData.productId}`
            : `${website}/product/${certExam.productSlug}/`; // Fallback to product page just in case

        return {
            title: 'Exam Bundle',
            buttonText: 'Purchase Bundle',
            price: priceData.price,
            regularPrice: priceData.regularPrice,
            url: bundleUrl,
            description: 'The complete package for your certification.'
        };
    }, [certExam, examPrices, activeOrg]);

    if (!bundleData) {
        return null; // Return null to prevent rendering if no specific bundle is found
    }

    return (
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl shadow-lg p-6 flex flex-col">
            <h3 className="text-xl font-bold flex items-center gap-2"><ShoppingBag size={20} /> {bundleData.title}</h3>
            <p className="text-sm text-orange-100 mt-2 mb-4 flex-grow">
                {bundleData.description}
            </p>

            <div className="my-4 text-center">
                {bundleData.regularPrice && bundleData.regularPrice > bundleData.price ? (
                    <div className="flex items-baseline justify-center gap-2">
                        <span className="text-2xl line-through text-white/70">${bundleData.regularPrice.toFixed(2)}</span>
                        <span className="text-4xl font-extrabold text-white">${bundleData.price.toFixed(2)}</span>
                    </div>
                ) : (
                    <span className="text-4xl font-extrabold text-white">${bundleData.price.toFixed(2)}</span>
                )}
            </div>

            <ul className="space-y-2 text-sm text-orange-50 mb-6 text-left">
                <li className="flex items-center gap-2"><Check size={16} className="text-green-300 flex-shrink-0" /> One Certification Exam</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-green-300 flex-shrink-0" /> 1-Month Unlimited Practice</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-green-300 flex-shrink-0" /> 1-Month Unlimited AI Feedback</li>
            </ul>

            <a 
                href={bundleData.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-auto block w-full bg-white text-orange-600 font-bold py-3 text-center rounded-lg hover:bg-orange-50 transition"
            >
                {bundleData.buttonText}
            </a>
        </div>
    );
};

export default ExamBundleCard;