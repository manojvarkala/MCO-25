import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
import { Switch, Route, BrowserRouter, Redirect, useLocation } from "react-router-dom";
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

// Helper component for routes requiring authentication
const ProtectedRoute: FC<{ children: ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
    const { user, isEffectivelyAdmin } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Redirect to={{ pathname: "/", state: { from: location } }} />;
    }
    if (adminOnly && !isEffectivelyAdmin) {
        return <Redirect to={{ pathname: "/dashboard", state: { from: location } }} />;
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
                    <Switch>
                        <Route path="/" exact component={LandingPage} />
                        <Route path="/auth" component={Login} />
                        <Route path="/checkout/:productSlug" component={Checkout} />
                        <Route path="/verify" exact component={VerifyPage} />
                        <Route path="/verify/:certId" component={VerifyCertificate} />
                        <Route path="/onboard/:token" component={VolunteerOnboarding} />
                        <Route path="/beta-signup" component={BetaRegistration} />
                        
                        <Route path="/test/:examId">
                            <ProtectedRoute><Test /></ProtectedRoute>
                        </Route>
                        <Route path="/certificate/sample">
                            <ProtectedRoute><Certificate /></ProtectedRoute>
                        </Route>
                        <Route path="/certificate/:testId">
                            <ProtectedRoute><Certificate /></ProtectedRoute>
                        </Route>

                        {/* Routes with Sidebar */}
                        <Route path="/dashboard">
                            <SidebarLayout><Dashboard /></SidebarLayout>
                        </Route>
                        <Route path="/instructions">
                            <SidebarLayout><Instructions /></SidebarLayout>
                        </Route>
                        <Route path="/pricing">
                            <SidebarLayout><Pricing /></SidebarLayout>
                        </Route>
                        <Route path="/feedback">
                            <SidebarLayout><Feedback /></SidebarLayout>
                        </Route>
                        <Route path="/user-guide">
                            <SidebarLayout><UserGuide /></SidebarLayout>
                        </Route>
                        <Route path="/about-us">
                            <SidebarLayout><AboutUs /></SidebarLayout>
                        </Route>
                        <Route path="/privacy-policy">
                            <SidebarLayout><PrivacyPolicy /></SidebarLayout>
                        </Route>
                        <Route path="/refund-policy">
                            <SidebarLayout><RefundPolicy /></SidebarLayout>
                        </Route>
                        <Route path="/terms-of-service">
                            <SidebarLayout><TermsOfService /></SidebarLayout>
                        </Route>
                        <Route path="/bookstore">
                            <SidebarLayout><BookStore /></SidebarLayout>
                        </Route>
                        <Route path="/program/:programId">
                            <SidebarLayout><ExamProgram /></SidebarLayout>
                        </Route>
                        <Route path="/faq">
                            <SidebarLayout><FAQ /></SidebarLayout>
                        </Route>
                        <Route path="/profile">
                            <ProtectedRoute><SidebarLayout><Profile /></SidebarLayout></ProtectedRoute>
                        </Route>
                        <Route path="/results/:testId">
                            <ProtectedRoute><SidebarLayout><Results /></SidebarLayout></ProtectedRoute>
                        </Route>
                        
                        {/* Admin Routes with dedicated layout */}
                        <Route path="/admin/analytics">
                            <ProtectedRoute adminOnly={true}><AdminLayout><SalesAnalytics /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/exam-analytics">
                            <ProtectedRoute adminOnly={true}><AdminLayout><ExamAnalytics /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/beta-analytics">
                            <ProtectedRoute adminOnly={true}><AdminLayout><BetaTesterAnalytics /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/products">
                            <ProtectedRoute adminOnly={true}><AdminLayout><ProductCustomizer /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/programs">
                            <ProtectedRoute adminOnly={true}><AdminLayout><ExamProgramCustomizer /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/content-engine">
                            <ProtectedRoute adminOnly={true}><AdminLayout><ContentEngine /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/integration">
                            <ProtectedRoute adminOnly={true}><AdminLayout><Integration /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/history">
                            <ProtectedRoute adminOnly={true}><AdminLayout><DevelopmentHistory /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin/handbook">
                            <ProtectedRoute adminOnly={true}><AdminLayout><Handbook /></AdminLayout></ProtectedRoute>
                        </Route>
                        <Route path="/admin" exact>
                            <ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>
                        </Route>
                    
                        <Route path="*"><Redirect to="/" /></Route>
                    </Switch>
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