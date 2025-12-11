import React, { FC, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { LogIn, UserPlus, FileText, Award, Sparkles, Beaker } from 'lucide-react';
import LogoSpinner from './LogoSpinner.tsx';

const LandingPage: FC = () => {
    const history = useHistory();
    const { user } = useAuth();
    const { activeOrg, isInitializing } = useAppContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
        if (user) {
            history.push('/dashboard');
        }
    }, [user, history]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = true;
            // Attempt autoplay, but handle browser policies gracefully
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Video autoplay was prevented by the browser:", error);
                });
            }
        }
    }, [activeOrg?.introVideoUrl]);

    if (isInitializing || !activeOrg) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
                <p className="mt-4 text-[rgb(var(--color-text-muted-rgb))]">Loading Portal...</p>
            </div>
        );
    }
    
    const mainSiteBaseUrl = `https://${activeOrg.website}`;
    const loginUrl = `${mainSiteBaseUrl}/exam-login/`;
    const registerUrl = `${mainSiteBaseUrl}/wp-login.php?action=register`;
    
    // Explicit check for non-empty string
    const hasIntroVideo = activeOrg.introVideoUrl && activeOrg.introVideoUrl.trim() !== '';

    return (
        <div className="min-h-[75vh] flex flex-col lg:flex-row items-center justify-center gap-12 p-4">
            {/* Left Side: Intro */}
            <div className="lg:w-1/2 max-w-xl text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] mb-4 leading-tight">
                    Welcome to the <br/>
                    <span className="text-[rgb(var(--color-primary-rgb))]">{activeOrg.name}</span><br/>
                    Examination Portal
                </h1>
                
                <p className="text-lg text-[rgb(var(--color-text-muted-rgb))] mb-8">
                    Your central hub for practice tests, certification exams, and AI-powered study guides to accelerate your career.
                </p>

                {hasIntroVideo && (
                    <div className="aspect-video w-full bg-[rgb(var(--color-background-rgb))] rounded-lg shadow-xl overflow-hidden border-4 border-[rgb(var(--color-card-rgb))] mb-8">
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
                            <source src={activeOrg.introVideoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                )}

                <div className="space-y-4 text-left">
                    <div className="flex items-center gap-4 p-4 bg-[rgb(var(--color-card-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                        <FileText className="h-8 w-8 text-[rgb(var(--color-primary-rgb))] flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-[rgb(var(--color-text-strong-rgb))]">Practice Exams</h3>
                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Hone your skills with a wide range of practice tests.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-[rgb(var(--color-card-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                        <Award className="h-8 w-8 text-[rgb(var(--color-primary-rgb))] flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-[rgb(var(--color-text-strong-rgb))]">Official Certifications</h3>
                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Earn verifiable certificates to advance your career.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-[rgb(var(--color-card-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                        <Sparkles className="h-8 w-8 text-[rgb(var(--color-primary-rgb))] flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-[rgb(var(--color-text-strong-rgb))]">AI-Powered Study Guides</h3>
                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Get personalized feedback to focus your studies.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Box */}
            <div className="w-full max-w-md bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-2xl border border-[rgb(var(--color-border-rgb))]">
                {activeOrg.logo && <img src={activeOrg.logo} alt={`${activeOrg.name} Logo`} className="h-20 w-20 mx-auto mb-4 object-contain" />}
                <h2 className="text-2xl font-bold text-center text-[rgb(var(--color-text-strong-rgb))] mb-2">Get Started</h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] text-center mb-6">
                    Log in or create an account to access your dashboard and begin your journey.
                </p>
                
                <div className="space-y-4">
                    <a
                        href={loginUrl}
                        className="w-full flex items-center justify-center bg-[rgb(var(--color-primary-rgb))] text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-[rgb(var(--color-primary-hover-rgb))] transition-transform transform hover:scale-105"
                    >
                        <LogIn size={20} className="mr-2"/>
                        Login to Your Account
                    </a>
                    <a
                        href={registerUrl}
                        className="w-full flex items-center justify-center bg-[rgb(var(--color-muted-rgb))] text-[rgb(var(--color-text-default-rgb))] font-bold py-3 px-8 rounded-lg text-lg hover:bg-[rgb(var(--color-border-rgb))] transition"
                    >
                        <UserPlus size={20} className="mr-2"/>
                        Create an Account
                    </a>
                </div>

                <p className="text-xs text-[rgb(var(--color-text-muted-rgb))] opacity-50 text-center mt-6">
                    All accounts are managed through our main site, {activeOrg.website}, for your security and convenience.
                </p>
            </div>
        </div>
    );
    
};
export default LandingPage;