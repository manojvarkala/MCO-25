

import React from 'react';
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

    const bundleSku = 'exam-cpc-cert-1mo-addon';
    const bundlePriceData = examPrices?.[bundleSku];
    const bundlePrice = bundlePriceData?.price;
    const bundleRegularPrice = bundlePriceData?.regularPrice;


    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Find the Perfect Plan for Your Career</h2>
                <p className="mt-4 text-lg text-slate-500">Whether you're preparing for a single exam or mastering your craft, we have an option for you.</p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* Monthly Card */}
                <div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl shadow-lg p-8 flex flex-col">
                    <h3 className="text-xl font-semibold text-blue-900">Monthly Subscription</h3>
                    <p className="mt-4 text-blue-700 flex-grow">Perfect for focused, short-term preparation.</p>
                    <div className="mt-6">
                        <span className="text-4xl font-extrabold text-blue-800">$19.99</span>
                        <span className="text-base font-medium text-blue-600">/month</span>
                    </div>
                    <ul className="mt-6 space-y-4">
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-blue-800">Unlimited Access to ALL Practice Exams</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-blue-800">Unlimited AI-Powered Feedback & Study Guides</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-blue-800">Performance Stats & History Tracking</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-blue-800">Cancel Anytime</span></li>
                    </ul>
                    <a href={monthlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-blue-600 border border-transparent rounded-md py-3 text-base font-semibold text-white text-center hover:bg-blue-700">Subscribe Now</a>
                </div>

                {/* Yearly Card (Highlighted) */}
                <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl shadow-xl p-8 flex flex-col">
                    <div className="absolute top-0 py-1.5 px-4 bg-yellow-400 text-yellow-900 rounded-full text-xs font-semibold uppercase tracking-wide transform -translate-y-1/2">
                        <Star className="inline-block h-4 w-4 mr-1"/> Best Value
                    </div>
                    <h3 className="text-xl font-semibold">Yearly Subscription</h3>
                    <p className="mt-4 text-purple-100 flex-grow">For continuous learning and preparing for multiple certifications.</p>
                    <div className="mt-6">
                        <span className="text-4xl font-extrabold">$149.99</span>
                        <span className="text-base font-medium text-purple-200">/year</span>
                    </div>
                     <p className="mt-1 text-sm text-yellow-300 font-semibold">Saves over 35%!</p>
                    <ul className="mt-6 space-y-4">
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3 text-purple-100">Unlimited Access to ALL Practice Exams</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3 text-purple-100">Unlimited AI-Powered Feedback & Study Guides</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3 text-purple-100">Performance Stats & History Tracking</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-yellow-300" /><span className="ml-3 text-purple-100">Billed Annually</span></li>
                    </ul>
                    <a href={yearlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-white border border-transparent rounded-md py-3 text-base font-semibold text-purple-700 text-center hover:bg-purple-100">Subscribe & Save</a>
                </div>

                {/* Pay-Per-Exam Card */}
                <div className="bg-gradient-to-br from-yellow-100 to-orange-200 rounded-2xl shadow-lg p-8 flex flex-col">
                    <h3 className="text-xl font-semibold text-orange-900">Pay-Per-Exam Options</h3>
                    <p className="mt-4 text-orange-700 flex-grow">Choose how you get certified. Buy an exam on its own or bundle it with our premium study tools for the best value.</p>
                    
                    <div className="mt-6 space-y-6">
                        {/* Single Exam Option */}
                        <div>
                            <h4 className="font-semibold text-orange-800">Single Exam</h4>
                             <div className="mt-2">
                                {singleExamPrice && singleExamRegularPrice && singleExamRegularPrice > singleExamPrice ? (
                                    <div>
                                        <span className="text-lg text-slate-600 line-through mr-2">${singleExamRegularPrice.toFixed(2)}</span>
                                        <span className="text-3xl font-extrabold text-green-600">${singleExamPrice.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-3xl font-extrabold text-orange-800">
                                        {singleExamPrice ? `$${singleExamPrice.toFixed(2)}` : '$49.99'}
                                    </span>
                                )}
                            </div>
                            <ul className="mt-4 space-y-2 text-sm">
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-orange-800">One Certification Exam (3 attempts)</span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-orange-800">Downloadable Certificate upon Passing</span></li>
                            </ul>
                        </div>
                        {/* Exam Bundle Option */}
                        <div className="bg-white/60 p-4 rounded-lg border border-orange-300">
                             <h4 className="font-semibold text-orange-800 flex items-center gap-2"><ShoppingBag size={16} className="text-orange-600"/> Exam Bundle</h4>
                             <div className="mt-2">
                                {bundlePrice && bundleRegularPrice && bundleRegularPrice > bundlePrice ? (
                                    <div>
                                        <span className="text-lg text-slate-600 line-through mr-2">${bundleRegularPrice.toFixed(2)}</span>
                                        <span className="text-3xl font-extrabold text-green-600">${bundlePrice.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <span className="text-3xl font-extrabold text-orange-800">
                                        {bundlePrice ? `$${bundlePrice.toFixed(2)}` : '$59.99'}
                                    </span>
                                )}
                            </div>
                            <ul className="mt-4 space-y-2 text-sm">
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-orange-800"><strong>Includes Single Exam features, PLUS:</strong></span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-orange-800">1-Month of Unlimited Practice Exams</span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-orange-800">1-Month of Unlimited AI-Powered Feedback</span></li>
                            </ul>
                        </div>
                    </div>
                    
                    <a href={browseExamsUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-orange-500 border border-transparent rounded-md py-3 text-base font-semibold text-white text-center hover:bg-orange-600">Browse Exams & Bundles</a>
                </div>
            </div>
        </div>
    );
};

export default Pricing;