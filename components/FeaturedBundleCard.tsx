import React, { FC, useMemo } from 'react';
import { ShoppingCart, Package, Star } from 'lucide-react';
import type { ProductVariation, Organization } from '../types.ts';
import { useAppContext } from '../context/AppContext.tsx';

interface FeaturedBundleCardProps {
    bundle: ProductVariation;
    activeOrg: Organization;
}

const FeaturedBundleCard: FC<FeaturedBundleCardProps> = ({ bundle, activeOrg }) => {
    const { examPrices } = useAppContext();

    const includedItems = useMemo(() => {
        if (!bundle.bundledSkus || !examPrices) return [];
        return bundle.bundledSkus.map(sku => {
            const product = examPrices[sku];
            return product ? product.name : sku;
        });
    }, [bundle.bundledSkus, examPrices]);

    if (!bundle) return null;

    const price = parseFloat(bundle.salePrice);
    const regularPrice = parseFloat(bundle.regularPrice);
    const checkoutUrl = bundle.id 
        ? `https://${activeOrg.website}/cart/?add-to-cart=${bundle.id}` 
        : `https://${activeOrg.website}`;

    return (
        <div className="relative flex flex-col p-6 rounded-xl text-white shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-yellow-400">
            {regularPrice > price && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-sm font-bold uppercase px-4 py-1 rounded-full flex items-center gap-1.5">
                    <Star size={14} className="fill-current"/> Best Value
                </div>
            )}
            
            <h3 className="text-xl font-bold text-center mt-4">{bundle.name}</h3>
            
            <div className="mt-6 text-center">
                {regularPrice > price ? (
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
                <ul className="space-y-2 text-center">
                    {includedItems.map((item, index) => (
                        <li key={index} className="flex items-center justify-center text-sm bg-white/10 px-3 py-1 rounded-full">
                            <Package size={14} className="mr-2" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
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

export default FeaturedBundleCard;