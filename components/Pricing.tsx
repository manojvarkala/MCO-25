import * as React from 'react';
import { Check, Star, ShoppingBag } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

const Pricing: React.FC = () => {
    const { activeOrg } = useAppContext();
    const { examPrices } = useAuth();
    
    const monthlySubUrl = 'https://www.coding-online.net/product/monthly-subscription/';
    const yearlySubUrl = 'https://www.coding-online.net/product/yearly-subscription/';
    const browseExamsUrl = 'https://www.coding-online.net/exam-programs/';

    const cpcExam = activeOrg?.exams.find(e => e.productSku === 'exam-cpc-cert');
    const singleExamPrice = cpcExam?.price;
    const singleExamRegularPrice = cpcExam?.regularPrice;

    const bundleSku = 'exam-cpc-cert-1'; // Use the specific bundle SKU as representative
    const bundlePriceData = examPrices?.[bundleSku];
    const bundlePrice = bundlePriceData?.price;
    const bundleRegularPrice = bundlePriceData?.regularPrice;

    const monthlyPriceData = examPrices?.['sub-monthly'];
    const yearlyPriceData = examPrices?.['sub-yearly'];

    const monthlyPrice = monthlyPriceData?.price ?? 19.99;
    const monthlyRegularPrice = monthlyPriceData?.regularPrice;

    const yearlyPrice = yearlyPriceData?.price ?? 149.99;
    const yearlyRegularPrice = yearlyPriceData?.regularPrice;

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Find the Perfect Plan for Your Career</h2>
                <p className="mt-4 text-lg text-slate-500">Whether you're preparing for a single exam or mastering your craft, we have an option for you.</p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* Monthly Card */}
                <div className="bg-gradient-to-br from-cyan-400 to-sky-600 text-white rounded-2xl shadow-lg p-8 flex flex-col">
                    <h3 className="text-2xl font-bold">Monthly Subscription</h3>
                    <p className="mt-4 text-sky-100 flex-grow">Perfect for focused, short-term preparation.</p>
                    <div className="mt-6">
                        {monthlyRegularPrice && monthlyRegularPrice > monthlyPrice ? (
                            <>
                                <span className="text-2xl line-through opacity-70">${monthlyRegularPrice.toFixed(2)}</span>
                                <span className="text-5xl font-extrabold ml-2">${monthlyPrice.toFixed(2)}</span>
                            </>
                        ) : (
                            <span className="text-5xl font-extrabold">${monthlyPrice.toFixed(2)}</span>
                        )}
                        <span className="text-base font-medium text-sky-100">/month</span>
                    </div>
                    <ul className="mt-6 space-y-4 text-sky-50">
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-300" /><span className="ml-3">Unlimited Access to ALL Practice Exams</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-300" /><span className="ml-3">Unlimited AI-Powered Feedback & Study Guides</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-300" /><span className="ml-3">Performance Stats & History Tracking</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-300" /><span className="ml-3">Cancel Anytime</span></li>
                    </ul>
                    <a href={monthlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-white border border-transparent rounded-md py-3 text-base font-semibold text-cyan-700 text-center hover:bg-cyan-50">Subscribe Now</a>
                </div>

                {/* Yearly Card (Highlighted) */}
                <div className="relative bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xl p-8 flex flex-col scale-105">
                    <div className="absolute top-0 py-1.5 px-4 bg-yellow-400 text-yellow-900 rounded-full text-xs font-semibold uppercase tracking-wide transform -translate-y-1/2">
                        <Star className="inline-block h-4 w-4 mr-1"/> Best Value
                    </div>
                    <h3 className="text-2xl font-bold">Yearly Subscription</h3>
                    <p className="mt-4 text-purple-100 flex-grow">For continuous learning and preparing for multiple certifications.</p>
                     <div className="mt-6">
                        {yearlyRegularPrice && yearlyRegularPrice > yearlyPrice ? (
                             <>
                                <span className="text-2xl line-through opacity-70">${yearlyRegularPrice.toFixed(2)}</span>
                                <span className="text-5xl font-extrabold ml-2">${yearlyPrice.toFixed(2)}</span>
                            </>
                        ) : (
                            <span className="text-5xl font-extrabold">${yearlyPrice.toFixed(2)}</span>
                        )}
                        <span className="text-base font-medium text-purple-200">/year</span>
                    </div>
                     <p className="mt-1 text-sm text-yellow-300 font-semibold">Saves over 35%!</p>
                    <ul className="mt-6 space-y-4 text-purple-50">
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3">Unlimited Access to ALL Practice Exams</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3">Unlimited AI-Powered Feedback & Study Guides</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3">Performance Stats & History Tracking</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3">Billed Annually</span></li>
                    </ul>
                    <a href={yearlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-white border border-transparent rounded-md py-3 text-base font-semibold text-purple-700 text-center hover:bg-purple-100">Subscribe & Save</a>
                </div>

                {/* Pay-Per-Exam Card */}
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-lg p-8 flex flex-col">
                    <h3 className="text-2xl font-bold">Pay-Per-Exam Options</h3>
                    <p className="mt-4 text-orange-100 flex-grow">Choose how you get certified. Buy an exam on its own or bundle it with our premium study tools for the best value.</p>
                    
                    <div className="mt-6 space-y-6">
                        {/* Single Exam Option */}
                        <div className="bg-white/20 p-4 rounded-lg">
                            <h4 className="font-semibold text-white">Single Exam</h4>
                             <div className="mt-2">
                                {singleExamPrice && singleExamRegularPrice && singleExamRegularPrice > singleExamPrice ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl line-through text-white/70">${singleExamRegularPrice.toFixed(2)}</span>
                                        <span className="text-4xl font-extrabold text-white">${singleExamPrice.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-4xl font-extrabold text-white">
                                        {singleExamPrice ? `$${singleExamPrice.toFixed(2)}` : '$49.99'}
                                    </span>
                                )}
                            </div>
                            <ul className="mt-4 space-y-2 text-sm text-orange-50">
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-300" /><span className="ml-2">One Certification Exam (3 attempts)</span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-300" /><span className="ml-2">Downloadable Certificate upon Passing</span></li>
                            </ul>
                        </div>
                        {/* Exam Bundle Option */}
                        <div className="bg-white/20 p-4 rounded-lg border border-white/30">
                             <h4 className="font-semibold text-white flex items-center gap-2"><ShoppingBag size={16}/> Exam Bundle</h4>
                             <div className="mt-2">
                                {bundlePrice && bundleRegularPrice && bundleRegularPrice > bundlePrice ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl line-through text-white/70">${bundleRegularPrice.toFixed(2)}</span>
                                        <span className="text-4xl font-extrabold text-white">${bundlePrice.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-4xl font-extrabold text-white">
                                        {bundlePrice ? `$${bundlePrice.toFixed(2)}` : '$59.99'}
                                    </span>
                                )}
                            </div>
                            <ul className="mt-4 space-y-2 text-sm text-orange-50">
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-300" /><span className="ml-2"><strong>Includes Single Exam features, PLUS:</strong></span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-300" /><span className="ml-2">1-Month of Unlimited Practice Exams</span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-300" /><span className="ml-2">1-Month of Unlimited AI-Powered Feedback</span></li>
                            </ul>
                        </div>
                    </div>
                    
                    <a href={browseExamsUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-white border border-transparent rounded-md py-3 text-base font-semibold text-orange-700 text-center hover:bg-orange-50">Browse Exams & Bundles</a>
                </div>
            </div>
        </div>
    );
};

export default Pricing;