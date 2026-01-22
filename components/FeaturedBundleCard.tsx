import React, { FC, useMemo, useState } from 'react';
import { ShoppingBag, Check, ShoppingCart, Gift, ArrowRight, Zap } from 'lucide-react';
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

const decodeHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        return html;
    }
};

const FeaturedBundleCard: FC<FeaturedBundleCardProps> = ({ bundle, activeOrg }) => {
    const { user, token } = useAuth();
    const { examPrices } = useAppContext();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const bundledItems = useMemo(() => {
        // CASE 1: True WooCommerce Bundle
        if (bundle.bundledSkus && Array.isArray(bundle.bundledSkus) && bundle.bundledSkus.length > 0 && examPrices) {
            return bundle.bundledSkus.map(sku => {
                const product = examPrices[sku];
                if (!product) return null;
                
                let name = product.name;
                if (product.name && product.name.includes('Certification Exam')) name = 'Certification Exam';
                else if (product.name && product.name.includes('Subscription')) name = 'Premium Access';
                
                return {
                    sku,
                    name: decodeHtml(name || sku),
                    type: product.type
                };
            }).filter(Boolean);
        }

        // CASE 2: Simple Product marketed as Bundle (Addon Pattern)
        if (bundle.sku && bundle.sku.includes('-1mo-addon')) {
            return [
                { sku: 'time', name: '30-Day Premium Access', type: 'subscription' },
                { sku: 'ai', name: 'Unlimited AI Feedback', type: 'simple' },
                { sku: 'practice', name: 'Unlimited Practice Tests', type: 'simple' }
            ];
        }

        return [];
    }, [bundle, examPrices]);

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
    const savings = (regPrice > salePrice && regPrice > 0) ? Math.round(((regPrice - salePrice) / regPrice) * 100) : 0;

    return (
        <div className="relative overflow-hidden rounded-2xl shadow-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white group hover:shadow-2xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-amber-300/20 rounded-full blur-2xl"></div>
            
            {savings > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm z-20">
                    SAVE {savings}%
                </div>
            )}

            <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shadow-inner">
                        {bundle.sku.includes('addon') ? <Zap size={24} className="fill-amber-600" /> : <ShoppingBag size={24} />}
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="font-black text-slate-900 leading-tight truncate">{decodeHtml(bundle.name)}</h3>
                        <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">Value Package</p>
                    </div>
                </div>

                <div className="flex-grow">
                    <div className="space-y-2.5 mb-6">
                        {bundledItems.map((item, idx) => (
                            <div key={item?.sku || idx} className="flex items-start gap-3 text-xs text-slate-700">
                                <div className="mt-0.5 p-0.5 bg-emerald-100 text-emerald-600 rounded-full flex-shrink-0">
                                    <Check size={10} strokeWidth={4} />
                                </div>
                                <span className="font-bold">{item?.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-amber-100 pt-4 mt-2">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Bundle Investment</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">${salePrice.toFixed(2)}</span>
                                {regPrice > salePrice && (
                                    <span className="text-sm text-slate-400 line-through font-bold">${regPrice.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePurchase}
                        disabled={isRedirecting}
                        className="w-full group relative flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden shadow-lg"
                    >
                        <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12"></div>
                        
                        {isRedirecting ? (
                            <Spinner size="sm" />
                        ) : (
                            <>
                                <ShoppingCart size={18} />
                                <span className="uppercase text-xs tracking-widest">Unlock Access</span>
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