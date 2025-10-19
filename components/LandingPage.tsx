import React, { FC, useEffect, useRef } from 'react';
// FIX: Corrected react-router-dom import to resolve module export errors.
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { LogIn, UserPlus, FileText, Award, Sparkles } from 'lucide-react';
import LogoSpinner from './LogoSpinner.tsx';

const LandingPage: FC = () => {
    // Fix: Use useNavigate for v6 compatibility.
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeOrg } = useAppContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
        if (user) {
            // Fix: Use navigate for v6 compatibility.
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (videoRef.current) {
            // Mute is essential for autoplay in modern browsers.
            videoRef.current.muted = true;
            // Attempt to play the video programmatically.
            videoRef.current.play().catch(error => {
                console.warn("Video autoplay was prevented by the browser:", error);
                // The user will have to manually click play via the controls.
            });
        }
    }, [activeOrg?.introVideoUrl]);

    // FIX: Re-instated a local loading guard. This provides a crucial safety net to prevent
    // the component from crashing if it ever renders before the global configuration is loaded,
    // which was the direct cause of the white screen issue.
    if (!activeOrg) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
                <p className="mt-4 text-slate-500">Loading Portal...</p>
            </div>
        );
    }
    
    const mainSiteBaseUrl = `https://${activeOrg.website}`;
    const loginUrl = `${mainSiteBaseUrl}/exam-login/`;
    const registerUrl = `${mainSiteBaseUrl}/wp-login.php?action=register`;
    
    const hasIntroVideo = !!activeOrg.introVideoUrl;

    return (
        <div className="min-h-[75vh] flex flex-col lg:flex-row items-center justify-center gap-12 p-4">
            {/* Left Side: Intro */}
            <div className="lg:w-1/2 max-w-xl text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
                    Welcome to the <br/>
                    <span className="text-cyan-600">{activeOrg.name}</span><br/>
                    Examination Portal
                </h1>
                
                <p className="text-lg text-slate-600 mb-8">
                    Your central hub for practice tests, certification exams, and AI-powered study guides to accelerate your career.
                </p>

                {hasIntroVideo && (
                    <div className="aspect-video w-full bg-slate-800 rounded-lg shadow-xl overflow-hidden border-4 border-slate-200 mb-8">
                        <video
                            ref={videoRef}
                            key={activeOrg.introVideoUrl}
                            className="w-full h-full object-cover"
                            src={activeOrg.introVideoUrl}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                )}

                <div className="space-y-4 text-left">
                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
                        <FileText className="h-8 w-8 text-cyan-600 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-slate-800">Practice Exams</h3>
                            <p className="text-sm text-slate-500">Hone your skills with a wide range of practice tests.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
                        <Award className="h-8 w-8 text-cyan-600 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-slate-800">Official Certifications</h3>
                            <p className="text-sm text-slate-500">Earn verifiable certificates to advance your career.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
                        <Sparkles className="h-8 w-8 text-cyan-600 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-slate-800">AI-Powered Study Guides</h3>
                            <p className="text-sm text-slate-500">Get personalized feedback to focus your studies.</p>
                        </div>
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