





import React, { FC, useEffect } from 'react';
// FIX: Corrected import statement for react-router-dom to resolve module export errors.
import { useNavigate } from "react-router-dom";
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { LogIn, UserPlus, CheckCircle, Sparkles, Award } from 'lucide-react';
import LogoSpinner from './LogoSpinner.tsx';

const LandingPage: FC = () => {
    // Fix: Use useNavigate for v6 compatibility.
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeOrg, isInitializing } = useAppContext();
    
    useEffect(() => {
        if (user) {
            // Fix: Use navigate for v6 compatibility.
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const mainSiteBaseUrl = activeOrg ? `https://www.${activeOrg.website}` : '';
    const loginUrl = `${mainSiteBaseUrl}/exam-login/`;
    const registerUrl = `${mainSiteBaseUrl}/wp-login.php?action=register`;

    if (isInitializing || !activeOrg || user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
                <p className="mt-4 text-slate-500">Loading Application...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-[75vh] flex flex-col lg:flex-row items-center justify-center gap-12 p-4">
            {/* Left Side: Feature Highlights */}
            <div className="lg:w-1/2 max-w-lg text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
                    Welcome to the <br/>
                    <span className="text-cyan-600">{activeOrg.name}</span><br/>
                    Examination Portal
                </h1>
                <p className="text-lg text-slate-600 mb-8">
                    Your central hub for practice tests, certification exams, and AI-powered study guides.
                </p>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                        <span className="font-semibold text-slate-700">Unlimited Practice Exams</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <Sparkles className="h-6 w-6 text-amber-500" />
                        <span className="font-semibold text-slate-700">AI-Powered Feedback & Study Guides</span>
                    </div>
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <Award className="h-6 w-6 text-blue-500" />
                        <span className="font-semibold text-slate-700">Official Certificates of Completion</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Box */}
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-slate-200">
                {activeOrg.logo && <img src={activeOrg.logo} alt={`${activeOrg.name} Logo`} className="h-20 w-20 mx-auto mb-4 object-contain" />}
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Get Started</h2>
                <p className="text-slate-500 text-center mb-6">Log in or create an account to access your dashboard and begin your journey.</p>
                
                <div className="space-y-4">
                    <a
                        href={loginUrl}
                        className="w-full flex items-center justify-center bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-cyan-700 transition-transform transform hover:scale-105"
                    >
                        <LogIn size={20} className="mr-2"/>
                        Login to Your Account
                    </a>
                    <a
                        href={registerUrl}
                        className="w-full flex items-center justify-center bg-slate-100 text-slate-700 font-bold py-3 px-8 rounded-lg text-lg hover:bg-slate-200 transition"
                    >
                        <UserPlus size={20} className="mr-2"/>
                        Create an Account
                    </a>
                </div>
                <p className="text-xs text-slate-400 text-center mt-6">
                    All accounts are managed through our main site, {activeOrg.website}, for your security and convenience.
                </p>
            </div>
        </div>
    );
};

export default LandingPage;