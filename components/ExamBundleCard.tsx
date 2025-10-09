import React, { FC, useMemo } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import type { Exam, Organization } from '../types.ts';

interface ExamBundleCardProps {
    certExam: Exam;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
    type: 'practice' | 'subscription';
}

const ExamBundleCard: FC<ExamBundleCardProps> = ({ certExam, activeOrg, examPrices, type }) => {
    const bundleData = useMemo(() => {
        if (!activeOrg || !examPrices || !certExam?.productSku) {
            return null;
        }

        const website = `https://www.${activeOrg.website}`;

        const isPracticeBundle = type === 'practice';
        
        const specificBundleSku = isPracticeBundle 
            ? `${certExam.productSku}-1`
            : `${certExam.productSku}-1mo-addon`;
            
        const priceData = examPrices[specificBundleSku];

        if (!priceData) {
            return null;
        }

        const bundleUrl = priceData.productId
            ? `${website}/cart/?add-to-cart=${priceData.productId}`
            : `${website}/product/${certExam.productSlug}/`;

        const title = isPracticeBundle ? 'Exam Bundle' : 'Exam + Subscription';
        const description = isPracticeBundle 
            ? 'The complete package for your certification.'
            : 'Get the certification exam plus one month of full subscription benefits.';
        const gradientClass = isPracticeBundle
            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
            : 'bg-gradient-to-br from-teal-400 to-cyan-500';
        const buttonClass = isPracticeBundle 
            ? 'text-orange-600 hover:bg-orange-50'
            : 'text-cyan-600 hover:bg-cyan-50';
            
        const features = isPracticeBundle
            ? [
                'One Certification Exam',
                '1-Month Unlimited Practice',
                '1-Month Unlimited AI Feedback'
              ]
            : [
                'One Certification Exam',
                '1-Month Full Subscription',
                'Incl. Unlimited Practice & AI Feedback'
              ];

        return {
            title,
            buttonText: 'Purchase Bundle',
            price: priceData.price,
            regularPrice: priceData.regularPrice,
            url: bundleUrl,
            description,
            gradientClass,
            buttonClass,
            features,
        };
    }, [certExam, examPrices, activeOrg, type]);

    if (!bundleData) {
        return null;
    }

    return (
        <div className={`${bundleData.gradientClass} text-white rounded-xl shadow-lg p-6 flex flex-col`}>
            <h3 className="text-xl font-bold flex items-center gap-2"><ShoppingBag size={20} /> {bundleData.title}</h3>
            <p className="text-sm text-white/80 mt-2 mb-4 flex-grow">
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

            <ul className="space-y-2 text-sm text-white/90 mb-6 text-left">
                {bundleData.features.map((feature, index) => (
                    <li key={index} className={`flex items-start gap-2 ${feature.startsWith('Incl.') ? 'pl-6 text-xs text-white/80' : ''}`}>
                       {!feature.startsWith('Incl.') && <Check size={16} className="text-green-300 flex-shrink-0 mt-0.5" />}
                       <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <a 
                href={bundleData.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`mt-auto block w-full bg-white font-bold py-3 text-center rounded-lg transition ${bundleData.buttonClass}`}
            >
                {bundleData.buttonText}
            </a>
        </div>
    );
};

export default ExamBundleCard;