import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
import { Switch, Route, BrowserRouter, Redirect, useLocation } from 'react-router-dom';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';

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

    // Helper component for routes requiring authentication
    const ProtectedRoute: FC<{ path: string; children: ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false, ...rest }) => {
        return (
            <Route {...rest} render={({ location }) => {
                if (!user) {
                    return <Redirect to={{ pathname: "/", state: { from: location } }} />;
                }
                if (adminOnly && !isEffectivelyAdmin) {
                    return <Redirect to={{ pathname: "/dashboard", state: { from: location } }} />;
                }
                return children;
            }} />
        );
    };

    return (
        <div data-theme={activeTheme} className={`flex flex-col min-h-screen bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-default-rgb))] font-main ${isMasquerading ? 'pt-10' : ''}`}>
            {isMasquerading && <MasqueradeBanner />}
            {!isTestPage && <Header />}
            <div className="flex-grow w-full relative">
                <main className={mainClasses}>
                    <Switch>
                        <Route exact path="/" component={LandingPage} />
                        <Route path="/auth" component={Login} />
                        <Route path="/checkout/:productSlug" component={Checkout} />
                        <Route path="/verify" component={VerifyPage} />
                        <Route path="/verify/:certId" component={VerifyCertificate} />
                        
                        <ProtectedRoute path="/test/:examId">
                            <Test />
                        </ProtectedRoute>
                        <ProtectedRoute path="/certificate/sample">
                            <Certificate />
                        </ProtectedRoute>
                        <ProtectedRoute path="/certificate/:testId">
                            <Certificate />
                        </ProtectedRoute>

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
                        <ProtectedRoute path="/profile">
                            <SidebarLayout><Profile /></SidebarLayout>
                        </ProtectedRoute>
                        <ProtectedRoute path="/results/:testId">
                            <SidebarLayout><Results /></SidebarLayout>
                        </ProtectedRoute>
                        
                        {/* Admin Routes with dedicated layout */}
                        <ProtectedRoute path="/admin/analytics" adminOnly>
                            <AdminLayout><SalesAnalytics /></AdminLayout>
                        </ProtectedRoute>
                        <ProtectedRoute path="/admin/products" adminOnly>
                            <AdminLayout><ProductCustomizer /></AdminLayout>
                        </ProtectedRoute>
                        <ProtectedRoute path="/admin/programs" adminOnly>
                            <AdminLayout><ExamProgramCustomizer /></AdminLayout>
                        </ProtectedRoute>
                        <ProtectedRoute path="/admin/content-engine" adminOnly>
                            <AdminLayout><ContentEngine /></AdminLayout>
                        </ProtectedRoute>
                        <ProtectedRoute path="/admin/integration" adminOnly>
                            <AdminLayout><Integration /></AdminLayout>
                        </ProtectedRoute>
                        <ProtectedRoute path="/admin/history" adminOnly>
                            <AdminLayout><DevelopmentHistory /></AdminLayout>
                        </ProtectedRoute>
                        <ProtectedRoute path="/admin/handbook" adminOnly>
                            <AdminLayout><Handbook /></AdminLayout>
                        </ProtectedRoute>
                        <ProtectedRoute exact path="/admin" adminOnly>
                           <AdminLayout><Admin /></AdminLayout>
                        </ProtectedRoute>
                    
                        <Route path="*">
                            <Redirect to="/" />
                        </Route>
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