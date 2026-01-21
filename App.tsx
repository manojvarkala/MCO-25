import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors in this environment.
import * as ReactRouterDOM from 'react-router-dom';
const { BrowserRouter, Routes, Route, Navigate, useLocation } = ReactRouterDOM as any;
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
import AdminUserResults from './components/AdminUserResults.tsx';
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
    const location = useLocation();
    if (!user) return <Navigate to="/" state={{ from: location }} replace />;
    if (adminOnly && !isEffectivelyAdmin) return <Navigate to="/dashboard" state={{ from: location }} replace />;
    return <>{children}</>;
};

const AppContent: FC = () => {
    const { user, isMasquerading, isEffectivelyAdmin } = useAuth();
    const { activeOrg, activeTheme, isInitializing } = useAppContext();
    const location = useLocation();
    const [isDebugSidebarOpen, setIsDebugSidebarOpen] = useState(false);

    const isTestPage = location.pathname.startsWith('/test/');
    const isAuthPath = location.pathname.startsWith('/auth');

    useEffect(() => {
        if (activeOrg) {
            document.title = `${activeOrg.name} | Annapoorna Advantage`;
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            const description = `The official Annapoorna Advantage portal for ${activeOrg.name}. Access practice tests, certification exams, and AI-powered study guides.`;
            metaDescription.setAttribute('content', description);
        }
    }, [activeOrg]);

    useEffect(() => {
        if (isTestPage) document.body.classList.add('google-revocation-no-ad');
        else document.body.classList.remove('google-revocation-no-ad');
        return () => { document.body.classList.remove('google-revocation-no-ad'); };
    }, [isTestPage]);

    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <LogoSpinner />
                <p className="mt-4 font-mono text-cyan-400 animate-pulse uppercase tracking-widest text-xs">Initializing Advantage Environment...</p>
            </div>
        );
    }

    if (isAuthPath) return <Login />;

    if (!activeOrg) {
        const targetUrl = getApiBaseUrl();
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                    <WifiOff size={48} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Connection Issue</h2>
                    <p className="text-slate-400 mb-4 text-sm">We're having trouble connecting to the Advantage server.</p>
                    <div className="bg-slate-900/50 p-3 rounded-lg mb-6 text-left border border-slate-700">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1"><Server size={10} /> Attempting to connect to:</p>
                        <code className="text-xs text-cyan-400 break-all">{targetUrl}</code>
                    </div>
                    <div className="space-y-3">
                        <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition"><RefreshCw size={18} /> Retry Connection</button>
                    </div>
                </div>
            </div>
        );
    }

    const mainClasses = isTestPage ? "py-8" : "container mx-auto px-4 py-8";

    return (
        <div data-theme={activeTheme} className={`flex flex-col min-h-screen bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-default-rgb))] font-main ${isMasquerading ? 'pt-10' : ''}`}>
            {isMasquerading && <MasqueradeBanner />}
            {!isTestPage && <Header />}
            {!isTestPage && (
                <div className="bg-[rgba(var(--color-accent-rgb),0.2)] border-b border-[rgba(var(--color-accent-rgb),0.4)]">
                    <div className="container mx-auto px-4 py-2 text-center text-sm font-medium text-[rgb(var(--color-text-strong-rgb))] flex items-center justify-center gap-2">
                        <AlertTriangle size={16} className="flex-shrink-0" />
                        <span>All exams are independent practice tools designed to build proficiency via Annapoorna Advantage. Not affiliated with certifying bodies.</span>
                    </div>
                </div>
            )}
            <div className="flex-grow w-full relative">
                <main className={mainClasses}>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<Login />} />
                        <Route path="/checkout/:productSlug" element={<Checkout />} />
                        <Route path="/verify" element={<VerifyPage />} />
                        <Route path="/verify/:certId" element={<VerifyCertificate />} />
                        <Route path="/onboard/:token" element={<VolunteerOnboarding />} />
                        <Route path="/beta-signup" element={<BetaRegistration />} />
                        <Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/admin/*" element={<ProtectedRoute adminOnly><AdminLayout><Routes>
                                <Route path="/" element={<Admin />} />
                                <Route path="/analytics" element={<SalesAnalytics />} />
                                <Route path="/exam-analytics" element={<ExamAnalytics />} />
                                <Route path="/user-results" element={<AdminUserResults />} />
                                <Route path="/beta-analytics" element={<BetaTesterAnalytics />} />
                                <Route path="/programs" element={<ExamProgramCustomizer />} />
                                <Route path="/products" element={<ProductCustomizer />} />
                                <Route path="/content-engine" element={<ContentEngine />} />
                                <Route path="/integration" element={<Integration />} />
                                <Route path="/history" element={<DevelopmentHistory />} />
                                <Route path="/handbook" element={<Handbook />} />
                                <Route path="/woo-styling" element={<WooCommerceStyling />} />
                                <Route path="/purchase-notifier" element={<PurchaseNotifier />} />
                            </Routes></AdminLayout></ProtectedRoute>} />
                        <Route path="/instructions" element={<Instructions />} />
                        <Route path="/user-guide" element={<UserGuide />} />
                        <Route path="/about-us" element={<AboutUs />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/refund-policy" element={<RefundPolicy />} />
                        <Route path="/terms-of-service" element={<TermsOfService />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/feedback" element={<Feedback />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/dashboard" element={<SidebarLayout><Dashboard /></SidebarLayout>} />
                        <Route path="/bookstore" element={<SidebarLayout><BookStore /></SidebarLayout>} />
                        <Route path="/program/:programId" element={<SidebarLayout><ExamProgram /></SidebarLayout>} />
                        <Route path="/results/:testId" element={<SidebarLayout><Results /></SidebarLayout>} />
                        <Route path="/profile" element={<SidebarLayout><Profile /></SidebarLayout>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
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
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;