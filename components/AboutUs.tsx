

import React, { FC } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Users, Target, BookOpen, Award } from 'lucide-react';

const AboutUs: FC = () => {
    const { activeOrg } = useAppContext();

    if (!activeOrg) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
            </div>
        );
    }

    const websiteUrl = `https://www.${activeOrg.website}`;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <div className="text-center mb-8">
                <Users className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">About Our Examination Platform</h1>
            </div>
            
            <div className="prose max-w-none text-slate-700 space-y-6">
                <p className="text-lg">
                    Welcome to the <strong>{activeOrg.name}</strong> examination portal, a state-of-art platform designed to empower professionals and students on their path to certification and mastery. Our mission is to provide a comprehensive, intuitive, and reliable testing environment that supports your learning and career goals.
                </p>

                <div>
                    <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-3"><Target /> Our Purpose</h2>
                    <p>
                        We built this platform to bridge the gap between studying and certification. We understand that success in high-stakes exams requires more than just knowledge—it demands practice, confidence, and familiarity with the testing format. This portal is engineered to deliver exactly that, offering a suite of tools to help you prepare effectively and perform your best when it matters most.
                    </p>
                </div>
                
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-3"><BookOpen /> What We Offer</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Realistic Exam Simulations:</strong> Our practice and certification tests are designed to mirror the format, timing, and difficulty of the official exams, ensuring you're fully prepared.</li>
                        <li><strong>AI-Powered Insights:</strong> Go beyond simple scores. Our integrated AI feedback provides detailed analysis of your performance, highlighting areas for improvement and generating personalized study guides.</li>
                        <li><strong>Seamless Integration:</strong> This portal works in harmony with our main website, <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-600">{activeOrg.website}</a>. Your purchases, account details, and progress are securely synced for a unified experience.</li>
                        <li><strong>Official Recognition:</strong> Upon successfully passing a certification exam, you'll receive a verifiable certificate to showcase your achievement and enhance your professional credentials.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-3"><Award /> Our Commitment</h2>
                    <p>
                        We are dedicated to your success. The <strong>{activeOrg.name}</strong> team is continuously working to improve the platform, update content, and introduce new features that support your educational journey. Thank you for choosing us as your partner in professional development.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
