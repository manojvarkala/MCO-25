


import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
// FIX: Updated react-router-dom imports for v6. `Switch` is now `Routes`, `Redirect` is `Navigate`.
// FIX: Standardize react-router-dom import to use single quotes to resolve module export errors.
import { Routes, Route, BrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X, AlertTriangle } from 'lucide-react';

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
import ContentEngine from './components/ContentEngine.tsx';
import Handbook from './components/handbook/Handbook.tsx';
import VerifyCertificate from './components/VerifyCertificate.tsx';
import VerifyPage from './components/VerifyPage.tsx';
import LogoSpinner from './components/LogoSpinner.tsx';
import AdminToolbar from './components/AdminToolbar.tsx';
import DebugSidebar from './components/DebugSidebar.tsx';

// FIX: Helper component for routes requiring authentication, updated for react-router-dom v6.
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
    const { user, isMasquerading, isEffectivelyAdmin } = useAuth();
    const { activeOrg, activeTheme } = useAppContext();
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

    const mainClasses = isTestPage 
        ? "py-8" 
        : "container mx-auto px-4 py-8";

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
                    {/* FIX: Replaced Switch with Routes and updated Route syntax for react-router-dom v6 */}
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<Login />} />
                        <Route path="/checkout/:productSlug" element={<Checkout />} />
                        <Route path="/verify" element={<VerifyPage />} />
                        <Route path="/verify/:certId" element={<VerifyCertificate />} />
                        
                        <Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />

                        {/* Routes with Sidebar */}
                        <Route path="/dashboard" element={<SidebarLayout><Dashboard /></SidebarLayout>} />
                        <Route path="/instructions" element={<SidebarLayout><Instructions /></SidebarLayout>} />
                        <Route path="/pricing" element={<SidebarLayout><Pricing /></SidebarLayout>} />
                        <Route path="/feedback" element={<SidebarLayout><Feedback /></SidebarLayout>} />
                        <Route path="/user-guide" element={<SidebarLayout><UserGuide /></SidebarLayout>} />
                        <Route path="/about-us" element={<SidebarLayout><AboutUs /></SidebarLayout>} />
                        <Route path="/privacy-policy" element={<SidebarLayout><PrivacyPolicy /></SidebarLayout>} />
                        <Route path="/refund-policy" element={<SidebarLayout><RefundPolicy /></SidebarLayout>} />
                        <Route path="/terms-of-service" element={<SidebarLayout><TermsOfService /></SidebarLayout>} />
                        <Route path="/bookstore" element={<SidebarLayout><BookStore /></SidebarLayout>} />
                        <Route path="/program/:programId" element={<SidebarLayout><ExamProgram /></SidebarLayout>} />
                        <Route path="/faq" element={<SidebarLayout><FAQ /></SidebarLayout>} />
                        <Route path="/profile" element={<ProtectedRoute><SidebarLayout><Profile /></SidebarLayout></ProtectedRoute>} />
                        <Route path="/results/:testId" element={<ProtectedRoute><SidebarLayout><Results /></SidebarLayout></ProtectedRoute>} />
                        
                        {/* Admin Routes with dedicated layout */}
                        <Route path="/admin/analytics" element={<ProtectedRoute adminOnly={true}><AdminLayout><SalesAnalytics /></AdminLayout></ProtectedRoute>} />
                        <Route path="/admin/products" element={<ProtectedRoute adminOnly={true}><AdminLayout><ProductCustomizer /></AdminLayout></ProtectedRoute>} />
                        <Route path="/admin/programs" element={<ProtectedRoute adminOnly={true}><AdminLayout><ExamProgramCustomizer /></AdminLayout></ProtectedRoute>} />
                        <Route path="/admin/content-engine" element={<ProtectedRoute adminOnly={true}><AdminLayout><ContentEngine /></AdminLayout></ProtectedRoute>} />
                        <Route path="/admin/integration" element={<ProtectedRoute adminOnly={true}><AdminLayout><Integration /></AdminLayout></ProtectedRoute>} />
                        <Route path="/admin/history" element={<ProtectedRoute adminOnly={true}><AdminLayout><DevelopmentHistory /></AdminLayout></ProtectedRoute>} />
                        <Route path="/admin/handbook" element={<ProtectedRoute adminOnly={true}><AdminLayout><Handbook /></AdminLayout></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>} />
                    
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