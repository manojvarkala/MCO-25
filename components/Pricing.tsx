import React from 'react';
import { Check, Star, ShoppingBag } from 'lucide-react';

const Pricing: React.FC = () => {
    // These URLs will eventually point to the WooCommerce subscription/product pages
    const monthlySubUrl = 'https://www.coding-online.net/product/monthly-subscription/';
    const yearlySubUrl = 'https://www.coding-online.net/product/yearly-subscription/';
    const browseExamsUrl = 'https://www.coding-online.net/exam-programs/';

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Find the Perfect Plan for Your Career</h2>
                <p className="mt-4 text-lg text-slate-500">Whether you're preparing for a single exam or mastering your craft, we have an option for you.</p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* Monthly Card */}
                <div className="border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col">
                    <h3 className="text-xl font-semibold text-slate-900">Monthly Subscription</h3>
                    <p className="mt-4 text-slate-500 flex-grow">Perfect for focused, short-term preparation.</p>
                    <div className="mt-6">
                        <span className="text-4xl font-extrabold text-slate-900">$19.99</span>
                        <span className="text-base font-medium text-slate-500">/month</span>
                    </div>
                    <ul className="mt-6 space-y-4">
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Unlimited Access to ALL Practice Exams</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Unlimited AI-Powered Feedback & Study Guides</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Performance Stats & History Tracking</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Cancel Anytime</span></li>
                    </ul>
                    <a href={monthlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-cyan-600 border border-transparent rounded-md py-3 text-base font-semibold text-white text-center hover:bg-cyan-700">Subscribe Now</a>
                </div>

                {/* Yearly Card (Highlighted) */}
                <div className="relative border-2 border-cyan-500 rounded-2xl shadow-xl p-8 flex flex-col">
                    <div className="absolute top-0 py-1.5 px-4 bg-cyan-500 rounded-full text-xs font-semibold uppercase tracking-wide text-white transform -translate-y-1/2">
                        <Star className="inline-block h-4 w-4 mr-1"/> Best Value
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Yearly Subscription</h3>
                    <p className="mt-4 text-slate-500 flex-grow">For continuous learning and preparing for multiple certifications.</p>
                    <div className="mt-6">
                        <span className="text-4xl font-extrabold text-slate-900">$149.99</span>
                        <span className="text-base font-medium text-slate-500">/year</span>
                    </div>
                     <p className="mt-1 text-sm text-green-600 font-semibold">Saves over 35%!</p>
                    <ul className="mt-6 space-y-4">
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Unlimited Access to ALL Practice Exams</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Unlimited AI-Powered Feedback & Study Guides</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Performance Stats & History Tracking</span></li>
                        <li className="flex items-start"><Check className="flex-shrink-0 h-6 w-6 text-green-500" /><span className="ml-3 text-slate-500">Billed Annually</span></li>
                    </ul>
                    <a href={yearlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-cyan-500 border border-transparent rounded-md py-3 text-base font-semibold text-white text-center hover:bg-cyan-600">Subscribe & Save</a>
                </div>

                {/* Pay-Per-Exam Card */}
                <div className="border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col">
                    <h3 className="text-xl font-semibold text-slate-900">Pay-Per-Exam Options</h3>
                    <p className="mt-4 text-slate-500 flex-grow">Choose how you get certified. Buy an exam on its own or bundle it with our premium study tools for the best value.</p>
                    
                    <div className="mt-6 space-y-6">
                        {/* Single Exam Option */}
                        <div>
                            <h4 className="font-semibold text-slate-700">Single Exam</h4>
                             <div className="mt-2">
                                <span className="text-2xl font-extrabold text-slate-900">$49.99</span>
                            </div>
                            <ul className="mt-4 space-y-2 text-sm">
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-slate-500">One Certification Exam (3 attempts)</span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-slate-500">Downloadable Certificate upon Passing</span></li>
                            </ul>
                        </div>
                                                 {/* Exam Bundle Option */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <h4 className="font-semibold text-slate-700 flex items-center gap-2"><ShoppingBag size={16} className="text-cyan-600"/> Exam Bundle</h4>
                             <div className="mt-2">
                                <span className="text-2xl font-extrabold text-slate-900">$59.99</span>
                                <span className="text-base font-medium text-slate-500"> /bundle</span>
                            </div>
                            <ul className="mt-4 space-y-2 text-sm">
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-slate-500"><strong>Includes Single Exam features, PLUS:</strong></span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-slate-500">1-Month of Unlimited Practice Exams</span></li>
                                <li className="flex items-start"><Check className="flex-shrink-0 h-5 w-5 text-green-500" /><span className="ml-2 text-slate-500">1-Month of Unlimited AI-Powered Feedback</span></li>
                            </ul>
                        </div>
                    </div>
                    
                    <a href={browseExamsUrl} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-slate-100 border border-slate-300 rounded-md py-3 text-base font-semibold text-slate-700 text-center hover:bg-slate-200">Browse Exams & Bundles</a>
                </div>
            </div>
        </div>
    );
};

export default Pricing;