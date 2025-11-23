import React, { FC, useMemo } from 'react';
import { Check, Star, ShoppingBag, BookOpen, Award, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { ProductVariation } from '../types.ts';

const Pricing: FC = () => {
    const { activeOrg, examPrices, subscriptionsEnabled, bundlesEnabled } = useAppContext();

    const mainSiteBaseUrl = useMemo(() => {
        return activeOrg ? `https://${activeOrg.website}` : '';
    }, [activeOrg]);
    
    const monthlySubUrl = `${mainSiteBaseUrl}/product/monthly-subscription/`;
    const yearlySubUrl = `${mainSiteBaseUrl}/product/yearly-subscription/`;

    const monthlyPriceData = examPrices?.['sub-monthly'];
    const yearlyPriceData = examPrices?.['sub-yearly'];

    const monthlyPrice = monthlyPriceData?.price ?? 19.99;
    const monthlyRegularPrice = monthlyPriceData?.regularPrice;

    const yearlyPrice = yearlyPriceData?.price ?? 149.99;
    const yearlyRegularPrice = yearlyPriceData?.regularPrice;
    
    // Filter Single Exams
    const singleExams = useMemo(() => {
        return (activeOrg?.exams || [])
            .filter(e => !e.isPractice && e.price > 0 && e.productSku)
            .map(e => ({
                ...e,
                buyUrl: `${mainSiteBaseUrl}/cart/?add-to-cart=${e.productSku}` // Fallback if ID lookup fails
            }));
    }, [activeOrg, mainSiteBaseUrl]);

    // Filter Bundles
    const bundles = useMemo(() => {
        if (!bundlesEnabled || !examPrices) return [];
        return Object.values(examPrices)
            .filter((p: any) => p.isBundle && p.bundledSkus && p.bundledSkus.length > 0)
            .map((p: any) => ({
                ...p,
                buyUrl: p.productId ? `${mainSiteBaseUrl}/cart/?add-to-cart=${p.productId}` : '#'
            }));
    }, [examPrices, bundlesEnabled, mainSiteBaseUrl]);

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-16">
            
            {/* Header */}
            <div className="text-center">
                <h2 className="text-4xl font-extrabold text-slate-900 sm:text-5xl font-display">Plans & Pricing</h2>
                <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">
                    Choose the plan that fits your career goals. From single certifications to unlimited learning access.
                </p>
            </div>

            {/* 1. Subscriptions Section - CONDITIONAL RENDER */}
            {subscriptionsEnabled && (
                <div className="relative">
                    <div className="text-center mb-8">
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</span>
                        <h3 className="text-2xl font-bold text-slate-800 mt-2">Unlimited Access Subscriptions</h3>
                        <p className="text-slate-500">Get access to ALL practice exams and AI tools.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Monthly Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 flex flex-col hover:shadow-xl transition-shadow relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-cyan-500"></div>
                            <h3 className="text-2xl font-bold text-slate-900">Monthly</h3>
                            <p className="mt-2 text-slate-500 text-sm flex-grow">Flexible, cancel anytime.</p>
                            <div className="mt-6 mb-6">
                                {monthlyRegularPrice && monthlyRegularPrice > monthlyPrice ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg line-through text-slate-400">${monthlyRegularPrice.toFixed(2)}</span>
                                        <span className="text-5xl font-extrabold text-slate-900">${monthlyPrice.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-5xl font-extrabold text-slate-900">${monthlyPrice.toFixed(2)}</span>
                                )}
                                <span className="text-slate-500">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center text-slate-700"><Check size={20} className="text-green-500 mr-3" /> Unlimited Practice Exams</li>
                                <li className="flex items-center text-slate-700"><Check size={20} className="text-green-500 mr-3" /> Unlimited AI Study Guides</li>
                                <li className="flex items-center text-slate-700"><Check size={20} className="text-green-500 mr-3" /> Cancel Anytime</li>
                            </ul>
                            <a href={monthlySubUrl} className="block w-full bg-slate-100 text-slate-800 font-bold py-4 rounded-xl text-center hover:bg-slate-200 transition">
                                Choose Monthly
                            </a>
                        </div>

                        {/* Yearly Card */}
                        <div className="bg-slate-900 rounded-2xl shadow-xl p-8 flex flex-col transform md:scale-105 relative overflow-hidden text-white">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                                BEST VALUE
                            </div>
                            <h3 className="text-2xl font-bold text-white">Yearly</h3>
                            <p className="mt-2 text-slate-400 text-sm flex-grow">Commit to your career & save big.</p>
                            <div className="mt-6 mb-6">
                                {yearlyRegularPrice && yearlyRegularPrice > yearlyPrice ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg line-through text-slate-500">${yearlyRegularPrice.toFixed(2)}</span>
                                        <span className="text-5xl font-extrabold text-white">${yearlyPrice.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-5xl font-extrabold text-white">${yearlyPrice.toFixed(2)}</span>
                                )}
                                <span className="text-slate-400">/year</span>
                            </div>
                             <p className="text-yellow-400 text-sm font-bold mb-4">Save over 35% compared to monthly!</p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center text-slate-300"><Check size={20} className="text-yellow-400 mr-3" /> All Monthly Features</li>
                                <li className="flex items-center text-slate-300"><Check size={20} className="text-yellow-400 mr-3" /> Access to ALL Programs</li>
                                <li className="flex items-center text-slate-300"><Check size={20} className="text-yellow-400 mr-3" /> Priority Support</li>
                            </ul>
                            <a href={yearlySubUrl} className="block w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-xl text-center hover:from-cyan-400 hover:to-blue-500 transition shadow-lg">
                                Choose Yearly
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Bundles Section - CONDITIONAL RENDER */}
            {bundlesEnabled && bundles.length > 0 && (
                <div className="border-t border-slate-200 pt-16">
                    <div className="text-center mb-8">
                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Great Deals</span>
                        <h3 className="text-2xl font-bold text-slate-800 mt-2">Exam Bundles</h3>
                        <p className="text-slate-500">Get the certification exam PLUS study access for one low price.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {bundles.map((bundle: any) => {
                            // Fix: Ensure prices are numbers. The backend sends 'price', not 'salePrice' for raw objects.
                            const salePrice = Number(bundle.price || 0);
                            const regularPrice = Number(bundle.regularPrice || 0);
                            
                            return (
                                <div key={bundle.sku} className="bg-white rounded-xl shadow-md border border-purple-100 p-6 hover:shadow-lg transition-shadow flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                            <ShoppingBag size={24} />
                                        </div>
                                        <h4 className="font-bold text-lg leading-tight">{bundle.name}</h4>
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-4">
                                        <span className="text-2xl font-bold text-slate-800">${salePrice.toFixed(2)}</span>
                                        {regularPrice > salePrice && (
                                            <span className="text-sm line-through text-slate-400">${regularPrice.toFixed(2)}</span>
                                        )}
                                    </div>
                                    <ul className="space-y-2 mb-6 text-sm text-slate-600 flex-grow">
                                        <li className="flex items-center"><Award size={16} className="text-purple-500 mr-2"/> Certification Exam Attempt</li>
                                        <li className="flex items-center"><Zap size={16} className="text-purple-500 mr-2"/> 1-Month Premium Access</li>
                                    </ul>
                                    <a href={bundle.buyUrl} className="w-full block text-center bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition">
                                        Purchase Bundle
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. Single Exams Section */}
            {singleExams.length > 0 && (
                <div className="border-t border-slate-200 pt-16">
                    <div className="text-center mb-8">
                         <span className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">A La Carte</span>
                        <h3 className="text-2xl font-bold text-slate-800 mt-2">Individual Certification Exams</h3>
                        <p className="text-slate-500">Purchase single exam attempts. Includes 3 retakes and a certificate.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {singleExams.map(exam => {
                            // Attempt to find regular price from main price object if available
                            const priceData = examPrices ? examPrices[exam.productSku] : null;
                            const regPrice = priceData?.regularPrice || exam.regularPrice;

                            return (
                                <div key={exam.id} className="bg-white rounded-lg border border-slate-200 p-5 hover:border-cyan-500 transition-colors flex flex-col">
                                    <div className="flex items-start justify-between mb-2">
                                        <Award className="text-cyan-600" size={24} />
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-2 leading-tight">{exam.name}</h4>
                                    <div className="mt-auto pt-4">
                                        <div className="flex items-baseline gap-2 mb-3">
                                            <span className="text-xl font-bold text-slate-800">${exam.price.toFixed(2)}</span>
                                            {regPrice > exam.price && (
                                                <span className="text-xs line-through text-slate-400">${regPrice.toFixed(2)}</span>
                                            )}
                                        </div>
                                        <a href={exam.buyUrl} className="block w-full text-center border-2 border-slate-200 text-slate-700 font-bold py-2 rounded-lg hover:border-cyan-500 hover:text-cyan-600 transition">
                                            Add to Cart
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
};

export default Pricing;