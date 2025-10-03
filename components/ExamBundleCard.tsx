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
        // We must have an active org to build URLs
        if (!activeOrg) return null;
        
        const website = `https://www.${activeOrg.website}`;

        // First, try to find bundle data from the config if available
        if (examPrices && certExam?.productSku) {
            // 1. Look for a specific bundle for the current exam (e.g., exam-cpc-cert-1)
            const specificBundleSku = `${certExam.productSku}-1`;
            const specificPriceData = examPrices[specificBundleSku];

            if (specificPriceData) {
                const bundleUrl = specificPriceData.productId
                    ? `${website}/cart/?add-to-cart=${specificPriceData.productId}`
                    : `${website}/product/${certExam.productSlug}/`; // Fallback to main product page
                
                return {
                    title: 'Exam Bundle',
                    buttonText: 'Purchase Bundle',
                    price: specificPriceData.price,
                    regularPrice: specificPriceData.regularPrice,
                    url: bundleUrl,
                    description: 'The complete package for your certification.'
                };
            }

            // 2. If not found, look for a representative fallback bundle (e.g., the main CPC bundle)
            const fallbackBundleSku = 'exam-cpc-cert-1';
            const fallbackPriceData = examPrices[fallbackBundleSku];

            if (fallbackPriceData) {
                // The URL for a generic offer should go to the main programs/store page
                const bundleUrl = `${website}/exam-programs/`;
                
                return {
                    title: 'Featured Bundle',
                    buttonText: 'Browse All Bundles',
                    price: fallbackPriceData.price,
                    regularPrice: fallbackPriceData.regularPrice,
                    url: bundleUrl,
                    description: 'Get the best value with a complete package.'
                };
            }
        }

        // 3. If no bundle data is found in the config, provide a hardcoded generic offer to ensure the card always shows.
        return {
            title: 'Exam Bundle Offer',
            buttonText: 'Browse All Bundles',
            price: 59.99, // A sensible default price
            regularPrice: 79.99, // A sensible default regular price
            url: `${website}/exam-programs/`,
            description: 'Get the best value with a complete package including practice access.'
        };

    }, [certExam, examPrices, activeOrg]);

    if (!bundleData) {
        // This will only be null for a brief moment while activeOrg is loading
        return null;
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