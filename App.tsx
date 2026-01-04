import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import * as ReactRouter from "react-router-dom";
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X, AlertTriangle, WifiOff, RefreshCw, Server } from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AppProvider, useAppContext } from './context/AppContext.tsx';

import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import Test from './components/Test.tsx';
import Results from './components/Results.tsx';
import Certificate from './components/Certificate.tsx';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import LandingPage from './components/LandingPage.tsx';
import Instructions from './components/Instructions.tsx';
import Admin from './components/Admin.tsx';
import Profile from './components/Profile.tsx';
import Checkout from './components/Checkout.tsx';
import Pricing from './components/Pricing.tsx';
import Feedback from './components/Feedback.tsx';
import UserGuide from './components/UserGuide.tsx';
import AboutUs from './components/AboutUs.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import RefundPolicy from './components/RefundPolicy.tsx';
import TermsOfService from './components/TermsOfService.tsx';
import LivePurchaseNotification from './components/LivePurchaseNotification.tsx';
import SidebarLayout from './components/SidebarLayout.tsx';
import Integration from './components/Integration.tsx';
import MasqueradeBanner from './components/MasqueradeBanner.tsx';
import BookStore from './components/BookStore.tsx';
import ExamProgram from './components/ExamProgram.tsx';
import ProductCustomizer from './components/ProductCustomizer.tsx';
import ExamProgramCustomizer from './components/ExamProgramCustomizer.tsx';
import AdminLayout from './components/AdminLayout.tsx';
import FAQ from './components/FAQ.tsx';
import DevelopmentHistory from './components/DevelopmentHistory.tsx';
import SalesAnalytics from './components/SalesAnalytics.tsx';
import ExamAnalytics from './components/ExamAnalytics.tsx';
import BetaTesterAnalytics from './components/BetaTesterAnalytics.tsx';
import ContentEngine from './components/ContentEngine.tsx';
import Handbook from './components/handbook/Handbook.tsx';
import VerifyCertificate from './components/VerifyCertificate.tsx';
import VerifyPage from './components/VerifyPage.tsx';
import LogoSpinner from './components/LogoSpinner.tsx';
import AdminToolbar from './components/AdminToolbar.tsx';
import DebugSidebar from './components/DebugSidebar.tsx';
import VolunteerOnboarding from './components/VolunteerOnboarding.tsx';
import BetaRegistration from './components/BetaRegistration.tsx';
import WooCommerceStyling from './components/WooCommerceStyling.tsx';
import PurchaseNotifier from './components/PurchaseNotifier.tsx'; 
import { getApiBaseUrl } from './services/apiConfig.ts';

const ProtectedRoute: FC<{ children: ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
    const { user, isEffectivelyAdmin } = useAuth();
    const location = ReactRouter.useLocation();
    if (!user) return <ReactRouter.Navigate to="/" state={{ from: location }} replace />;
    if (adminOnly && !isEffectivelyAdmin) return <ReactRouter.Navigate to="/dashboard" state={{ from: location }} replace />;
    return <>{children}</>;
};

const AppContent: FC = () => {
    const { user, isMasquerading, isEffectivelyAdmin } = useAuth();
    const { activeOrg, activeTheme, isInitializing } = useAppContext();
    const location = ReactRouter.useLocation();
    const [isDebugSidebarOpen, setIsDebugSidebarOpen] = useState(false);

    const isTestPage = location.pathname.startsWith('/test/');
    const isAuthPath = location.pathname.startsWith('/auth');

    useEffect(() => {
        if (activeOrg) {
            document.title = `${activeOrg.name} | Examination Portal`;
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            const description = `The official examination portal for ${activeOrg.name}. Access practice tests, certification exams, and AI-powered study guides.`;
            metaDescription.setAttribute('content', description);
        }
    }, [activeOrg]);

    useEffect(() => {
        if (isTestPage) document.body.classList.add('google-revocation-no-ad');
        else document.body.classList.remove('google-revocation-no-ad');
        return () => { document.body.classList.remove('google-revocation-no-ad'); };
    }, [isTestPage]);

    // 1. GLOBAL INITIALIZATION SCREEN
    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <LogoSpinner />
                <p className="mt-4 font-mono text-cyan-400 animate-pulse uppercase tracking-widest text-xs">Initializing Secure Environment...</p>
            </div>
        );
    }

    // 2. SSO AUTHENTICATION SPECIAL VIEW
    if (isAuthPath) {
        return <Login />;
    }

    // 3. CONNECTION FAILURE VIEW
    if (!activeOrg) {
        const targetUrl = getApiBaseUrl();
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                    <WifiOff size={48} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Connection Issue</h2>
                    <p className="text-slate-400 mb-4 text-sm">We're having trouble connecting to the examination server. This often indicates a misconfiguration with your WordPress backend API.</p>
                    <div className="bg-slate-900/50 p-3 rounded-lg mb-6 text-left border border-slate-700">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1"><Server size={10} /> Attempting to connect to:</p>
                        <code className="text-xs text-cyan-400 break-all">{targetUrl}</code>
                    </div>
                    <div className="space-y-3">
                        <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition"><RefreshCw size={18} /> Retry Connection</button>
                        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm underline transition">Clear Cache & Reset</button>
                    </div>
                </div>
            </div>
        );
    }

    // 4. MAIN APPLICATION VIEW
    const mainClasses = isTestPage ? "py-8" : "container mx-auto px-4 py-8";

    return (
        <div data-theme={activeTheme} className={`flex flex-col min-h-screen bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-default-rgb))] font-main ${isMasquerading ? 'pt-10' : ''}`}>
            {isMasquerading && <MasqueradeBanner />}
            {!isTestPage && <Header />}
            {!isTestPage && (
                <div className="bg-[rgba(var(--color-accent-rgb),0.2)] border-b border-[rgba(var(--color-accent-rgb),0.4)]">
                    <div className="container mx-auto px-4 py-2 text-center text-sm font-medium text-[rgb(var(--color-text-strong-rgb))] flex items-center justify-center gap-2">
                        <AlertTriangle size={16} className="flex-shrink-0" />
                        <span>All exams are independent practice tools designed to build proficiency. Not affiliated with AAPC, AHIMA, or any certifying body.</span>
                    </div>
                </div>
            )}
            <div className="flex-grow w-full relative">
                <main className={mainClasses}>
                    <ReactRouter.Routes>
                        <ReactRouter.Route path="/" element={<LandingPage />} />
                        <ReactRouter.Route path="/auth" element={<Login />} />
                        <ReactRouter.Route path="/checkout/:productSlug" element={<Checkout />} />
                        <ReactRouter.Route path="/verify" element={<VerifyPage />} />
                        <ReactRouter.Route path="/verify/:certId" element={<VerifyCertificate />} />
                        <ReactRouter.Route path="/onboard/:token" element={<VolunteerOnboarding />} />
                        <ReactRouter.Route path="/beta-signup" element={<BetaRegistration />} />
                        <ReactRouter.Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <ReactRouter.Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <ReactRouter.Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <ReactRouter.Route path="/admin/*" element={<ProtectedRoute adminOnly><AdminLayout><ReactRouter.Routes>
                                <ReactRouter.Route path="/" element={<Admin />} />
                                <ReactRouter.Route path="/analytics" element={<SalesAnalytics />} />
                                <ReactRouter.Route path="/exam-analytics" element={<ExamAnalytics />} />
                                <ReactRouter.Route path="/beta-analytics" element={<BetaTesterAnalytics />} />
                                <ReactRouter.Route path="/programs" element={<ExamProgramCustomizer />} />
                                <ReactRouter.Route path="/products" element={<ProductCustomizer />} />
                                <ReactRouter.Route path="/content-engine" element={<ContentEngine />} />
                                <ReactRouter.Route path="/integration" element={<Integration />} />
                                <ReactRouter.Route path="/history" element={<DevelopmentHistory />} />
                                <ReactRouter.Route path="/handbook" element={<Handbook />} />
                                <ReactRouter.Route path="/woo-styling" element={<WooCommerceStyling />} />
                                <ReactRouter.Route path="/purchase-notifier" element={<PurchaseNotifier />} />
                            </ReactRouter.Routes></AdminLayout></ProtectedRoute>} />
                        <ReactRouter.Route path="/instructions" element={<Instructions />} />
                        <ReactRouter.Route path="/user-guide" element={<UserGuide />} />
                        <ReactRouter.Route path="/about-us" element={<AboutUs />} />
                        <ReactRouter.Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <ReactRouter.Route path="/refund-policy" element={<RefundPolicy />} />
                        <ReactRouter.Route path="/terms-of-service" element={<TermsOfService />} />
                        <ReactRouter.Route path="/pricing" element={<Pricing />} />
                        <ReactRouter.Route path="/feedback" element={<Feedback />} />
                        <ReactRouter.Route path="/faq" element={<FAQ />} />
                        <ReactRouter.Route path="/dashboard" element={<SidebarLayout><Dashboard /></SidebarLayout>} />
                        <ReactRouter.Route path="/bookstore" element={<SidebarLayout><BookStore /></SidebarLayout>} />
                        <ReactRouter.Route path="/program/:programId" element={<SidebarLayout><ExamProgram /></SidebarLayout>} />
                        <ReactRouter.Route path="/results/:testId" element={<SidebarLayout><Results /></SidebarLayout>} />
                        <ReactRouter.Route path="/profile" element={<SidebarLayout><Profile /></SidebarLayout>} />
                        <ReactRouter.Route path="*" element={<ReactRouter.Navigate to="/" replace />} />
                    </ReactRouter.Routes>
                </main>
            </div>
            {!isTestPage && <Footer />}
            <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: 'rgb(var(--color-card-rgb))', color: 'rgb(var(--color-text-strong-rgb))', border: '1px solid rgb(var(--color-border-rgb))' } }} />
            {isEffectivelyAdmin && !isTestPage && <AdminToolbar onToggleDebug={() => setIsDebugSidebarOpen(true)} />}
            {isEffectivelyAdmin && !isTestPage && <DebugSidebar isOpen={isDebugSidebarOpen} onClose={() => setIsDebugSidebarOpen(false)} />}
            {!isTestPage && <LivePurchaseNotification />}
        </div>
    );
};

const App: FC = () => {
  return (
    <ReactRouter.BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ReactRouter.BrowserRouter>
  );
};

export default App;