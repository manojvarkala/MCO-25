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
        if (!certExam?.productSku || !examPrices || !activeOrg) return null;
        
        // A common convention for bundles is to append '-1' to the certification SKU.
        const bundleSku = `${certExam.productSku}-1`;
        const priceData = examPrices[bundleSku];

        if (!priceData) return null;

        const website = `https://www.${activeOrg.website}`;
        // The productSlug for a bundle might not be directly on the certExam object, so we build a generic link.
        const bundleUrl = priceData.productId 
            ? `${website}/cart/?add-to-cart=${priceData.productId}`
            : `${website}/product/${certExam.productSlug}/`; // Fallback to main product page

        return {
            price: priceData.price,
            regularPrice: priceData.regularPrice,
            url: bundleUrl,
        };
    }, [certExam, examPrices, activeOrg]);

    if (!bundleData) {
        return null; // Don't render if there's no corresponding bundle product
    }

    return (
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl shadow-lg p-6 flex flex-col">
            <h3 className="text-xl font-bold flex items-center gap-2"><ShoppingBag size={20} /> Exam Bundle</h3>
            <p className="text-sm text-orange-100 mt-2 mb-4 flex-grow">The complete package for your certification.</p>

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
                Purchase Bundle
            </a>
        </div>
    );
};

export default ExamBundleCard;
