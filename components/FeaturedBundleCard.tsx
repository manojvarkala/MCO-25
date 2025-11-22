
import React, { FC, useMemo, useState } from 'react';
import { ShoppingBag, Check, ShoppingCart, Gift, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { ProductVariation, Organization } from '../types.ts';
import Spinner from './Spinner.tsx';

interface FeaturedBundleCardProps {
    bundle: ProductVariation;
    activeOrg: Organization;
}

const FeaturedBundleCard: FC<FeaturedBundleCardProps> = ({ bundle, activeOrg }) => {
    const { user, token } = useAuth();
    const { examPrices } = useAppContext();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const bundledItems = useMemo(() => {
        if (!bundle.bundledSkus || !examPrices) return [];
        
        return bundle.bundledSkus.map(sku => {
            const product = examPrices[sku];
            if (!product) return null;
            
            // Determine a friendly name
            let name = product.name;
            if (product.name.includes('Certification Exam')) name = 'Certification Exam';
            else if (product.name.includes('Subscription')) name = product.name; // Keep full name like "Monthly Subscription"
            
            return {
                sku,
                name: name || sku,
                type: product.type
            };
        }).filter(Boolean);
    }, [bundle.bundledSkus, examPrices]);

    const handlePurchase = async () => {
        if (!user || !token) {
            toast.error("Please log in to make a purchase.");
            const loginUrl = `https://www.${activeOrg.website}/exam-login/`;
            window.location.href = loginUrl;
            return;
        }
        setIsRedirecting(true);
        try {
            const { checkoutUrl } = await googleSheetsService.createCheckoutSession(token, bundle.sku);
            window.location.href = checkoutUrl;
        } catch (error: any) {
            toast.error(`Could not prepare checkout: ${error.message}`);
            setIsRedirecting(false);
        }
    };

    const salePrice = parseFloat(bundle.salePrice || '0');
    const regPrice = parseFloat(bundle.regularPrice || '0');
    const savings = regPrice > salePrice ? Math.round(((regPrice - salePrice) / regPrice) * 100) : 0;

    return (
        <div className="relative overflow-hidden rounded-2xl shadow-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white group hover:shadow-2xl transition-shadow duration-300">
            {/* Decorative background blob */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-amber-300/20 rounded-full blur-2xl"></div>
            
            {savings > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    SAVE {savings}%
                </div>
            )}

            <div className="p-6 flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shadow-inner">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 leading-tight">{bundle.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">Comprehensive Package</p>
                    </div>
                </div>

                <div className="flex-grow">
                    <div className="space-y-3 mb-6">
                        {bundledItems.length > 0 ? (
                            bundledItems.map((item, idx) => (
                                <div key={item?.sku || idx} className="flex items-start gap-3 text-sm text-slate-700">
                                    <div className="mt-0.5 p-0.5 bg-green-100 text-green-600 rounded-full">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                    <span className="font-medium">{item?.name}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic">Includes multiple premium items.</p>
                        )}
                         {/* Add a bonus line if it's a bundle to make it look attractive */}
                         <div className="flex items-start gap-3 text-sm text-slate-700">
                            <div className="mt-0.5 p-0.5 bg-purple-100 text-purple-600 rounded-full">
                                <Gift size={12} strokeWidth={3} />
                            </div>
                            <span className="font-medium text-purple-700">Instant Activation</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-amber-100 pt-4 mt-2">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Bundle Price</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-900">${salePrice.toFixed(2)}</span>
                                {regPrice > salePrice && (
                                    <span className="text-sm text-slate-400 line-through decoration-slate-400">${regPrice.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePurchase}
                        disabled={isRedirecting}
                        className="w-full group relative flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                        {/* Subtle shine effect on hover */}
                        <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-500 skew-x-12"></div>
                        
                        {isRedirecting ? (
                            <Spinner size="sm" />
                        ) : (
                            <>
                                <ShoppingCart size={18} />
                                <span>Get This Bundle</span>
                                <ArrowRight size={16} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeaturedBundleCard;
