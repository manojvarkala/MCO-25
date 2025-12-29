

import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { Routes, Route, BrowserRouter, Navigate, useLocation } from "react-router-dom";
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
import { getApiBaseUrl } from './services/apiConfig.ts';

// Helper component for routes requiring authentication
const ProtectedRoute: FC<{ children: ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
    const { user, isEffectivelyAdmin } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }
    if (adminOnly && !isEffectivelyAdmin) {
        return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
    return <>{children}</>;
};


const AppContent: FC = () => {
    const { user, isMasquerading, isEffectivelyAdmin, logout } = useAuth();
    const { activeOrg, activeTheme, isInitializing } = useAppContext();
    const location = useLocation();
    const [isDebugSidebarOpen, setIsDebugSidebarOpen] = useState(false);

    const isTestPage = location.pathname.startsWith('/test/');

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
        if (isTestPage) {
            document.body.classList.add('google-revocation-no-ad');
        } else {
            document.body.classList.remove('google-revocation-no-ad');
        }
        return () => {
            document.body.classList.remove('google-revocation-no-ad');
        };
    }, [isTestPage]);

    const mainClasses = isTestPage 
        ? "py-8" 
        : "container mx-auto px-4 py-8";

    if (!isInitializing && !activeOrg) {
        const targetUrl = getApiBaseUrl();
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                    <WifiOff size={48} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Connection Issue</h2>
                    <p className="text-slate-400 mb-4">
                        We're having trouble connecting to the examination server. This often indicates a misconfiguration with your WordPress backend API.
                    </p>
                    <div className="bg-slate-900/50 p-3 rounded-lg mb-6 text-left border border-slate-700">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Server size={10} /> Attempting to connect to:
                        </p>
                        <code className="text-xs text-cyan-400 break-all">{targetUrl}</code>
                    </div>
                    <div className="text-left text-sm text-slate-300 space-y-3 mb-6">
                        <h3 className="font-bold text-base text-red-300 flex items-center gap-2 mb-2">
                             <AlertTriangle size={18} /> Common Troubleshooting Steps:
                        </h3>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>.htaccess Fix:</strong> Ensure the <code>.htaccess</code> file in your WordPress root has the correct <code>Authorization</code> header rewrite rules at the very top. <a href="https://developers.google.com/workspace/marketplace/security-checklist#http-headers" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">More info here</a>.</li>
                            <li><strong>WordPress Permalinks:</strong> Confirm WordPress permalinks are set to "Post Name" (Settings &gt; Permalinks).</li>
                            <li><strong>API URL Config:</strong> Verify the "App URL(s)" in your WordPress Admin (Exam App Engine &gt; Main Settings) matches this site's URL.</li>
                            <li><strong>Clear Caches:</strong> Clear all caches on your WordPress site (plugin cache, server cache).</li>
                            <li><strong>Browser Cache:</strong> Perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) or clear your browser's cache for this site.</li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition"
                        >
                            <RefreshCw size={18} /> Retry Connection
                        </button>
                        <button 
                            onClick={() => { localStorage.clear(); window.location.reload(); }} 
                            className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm underline transition"
                        >
                            Clear Cache & Reset
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<Login />} />
                        <Route path="/checkout/:productSlug" element={<Checkout />} />
                        <Route path="/verify" element={<VerifyPage />} />
                        <Route path="/verify/:certId" element={<VerifyCertificate />} />
                        <Route path="/onboard/:token" element={<VolunteerOnboarding />} />
                        <Route path="/beta-signup" element={<BetaRegistration />} />
                        
                        <Route path="/test/:examId" element={
                            <ProtectedRoute><Test /></ProtectedRoute>
                        } />
                        <Route path="/certificate/sample" element={
                            <ProtectedRoute><Certificate /></ProtectedRoute>
                        } />
                        <Route path="/certificate/:testId" element={
                            <ProtectedRoute><Certificate /></ProtectedRoute>
                        } />

                        {/* Routes with Sidebar */}
                        <Route path="/dashboard" element={
                            <SidebarLayout><Dashboard /></SidebarLayout>
                        } />
                        <Route path="/instructions" element={
                            <SidebarLayout><Instructions /></SidebarLayout>
                        } />
                        <Route path="/pricing" element={
                            <SidebarLayout><Pricing /></SidebarLayout>
                        } />
                        <Route path="/feedback" element={
                            <SidebarLayout><Feedback /></SidebarLayout>
                        } />
                        <Route path="/user-guide" element={
                            <SidebarLayout><UserGuide /></SidebarLayout>
                        } />
                        <Route path="/about-us" element={
                            <SidebarLayout><AboutUs /></SidebarLayout>
                        } />
                        <Route path="/privacy-policy" element={
                            <SidebarLayout><PrivacyPolicy /></SidebarLayout>
                        } />
                        <Route path="/refund-policy" element={
                            <SidebarLayout><RefundPolicy /></SidebarLayout>
                        } />
                        <Route path="/terms-of-service" element={
                            <SidebarLayout><TermsOfService /></SidebarLayout>
                        } />
                        <Route path="/bookstore" element={
                            <SidebarLayout><BookStore /></SidebarLayout>
                        } />
                        <Route path="/program/:programId" element={
                            <SidebarLayout><ExamProgram /></SidebarLayout>
                        } />
                        <Route path="/faq" element={
                            <SidebarLayout><FAQ /></SidebarLayout>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute><SidebarLayout><Profile /></SidebarLayout></ProtectedRoute>
                        } />
                        <Route path="/results/:testId" element={
                            <ProtectedRoute><SidebarLayout><Results /></SidebarLayout></ProtectedRoute>
                        } />
                        
                        {/* Admin Routes with dedicated layout */}
                        <Route path="/admin/analytics" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><SalesAnalytics /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/exam-analytics" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><ExamAnalytics /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/beta-analytics" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><BetaTesterAnalytics /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/products" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><ProductCustomizer /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/programs" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><ExamProgramCustomizer /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/content-engine" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><ContentEngine /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/integration" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><Integration /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/history" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><DevelopmentHistory /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin/handbook" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><Handbook /></AdminLayout></ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>
                        } />
                    
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
            {!isTestPage && <Footer />}
            {!isTestPage && <LivePurchaseNotification />}
            
            {/* Global Admin Tools */}
            {isEffectivelyAdmin && <AdminToolbar onToggleDebug={() => setIsDebugSidebarOpen(true)} />}
            <DebugSidebar isOpen={isDebugSidebarOpen && isEffectivelyAdmin} onClose={() => setIsDebugSidebarOpen(false)} />
        </div>
    );
};

const App: FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
            <AppContent />
            <Toaster position="top-right" reverseOrder={false}>
              {(t) => (
                <ToastBar toast={t}>
                  {({ icon, message }) => (
                    <>
                      {icon}
                      {message}
                      {t.type !== 'loading' && (
                        <button
                          className="ml-4 p-1 rounded-full hover:bg-black/10 transition-colors"
                          onClick={() => toast.dismiss(t.id)}
                          aria-label="Dismiss"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </>
                  )}
                </ToastBar>
              )}
            </Toaster>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
