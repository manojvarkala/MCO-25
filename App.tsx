import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
// FIX: Corrected import for react-router-dom to resolve module export errors.
import { Navigate, useLocation, Routes, Route, HashRouter, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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
import DebugSidebar from './components/DebugSidebar.tsx';
import Pricing from './components/Pricing.tsx';
import Feedback from './components/Feedback.tsx';
import UserGuide from './components/UserGuide.tsx';
import AboutUs from './components/AboutUs.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import RefundPolicy from './components/RefundPolicy.tsx';
import WheelOfFortune from './components/WheelOfFortune.tsx';
import TermsOfService from './components/TermsOfService.tsx';
import LivePurchaseNotification from './components/LivePurchaseNotification.tsx';
import SidebarLayout from './components/SidebarLayout.tsx';
import Integration from './components/Integration.tsx';
import UpdateNameModal from './components/UpdateNameModal.tsx';
import MasqueradeBanner from './components/MasqueradeBanner.tsx';
import BookStore from './components/BookStore.tsx';
import ExamProgram from './components/ExamProgram.tsx';
import ProductCustomizer from './components/ProductCustomizer.tsx';
import ExamProgramCustomizer from './components/ExamProgramCustomizer.tsx';
import AdminLayout from './components/AdminLayout.tsx';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, isEffectivelyAdmin } = useAuth();
  if (!user) {
    // Fix: Use <Navigate> for react-router-dom v6
    return <Navigate to="/" replace />;
  }
  if (adminOnly && !isEffectivelyAdmin) {
    // Fix: Use <Navigate> for react-router-dom v6
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppContent: FC = () => {
    const { user, canSpinWheel, wheelModalDismissed, setWheelModalDismissed, isMasquerading } = useAuth();
    const { isWheelModalOpen, setWheelModalOpen, activeOrg, activeTheme } = useAppContext();
    const location = useLocation();
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    
    const isTestPage = location.pathname.startsWith('/test/');
    const isAdminPage = location.pathname.startsWith('/admin');

    const mainLayoutComponent = isAdminPage ? <Outlet /> : <SidebarLayout><Outlet /></SidebarLayout>;

    useEffect(() => {
        if (activeTheme) {
            document.documentElement.setAttribute('data-theme', activeTheme);
        }
    }, [activeTheme]);

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
        // Show the wheel modal only for eligible users who haven't already dismissed it this session.
        if (canSpinWheel && !wheelModalDismissed) {
            const timer = setTimeout(() => setWheelModalOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [canSpinWheel, wheelModalDismissed, setWheelModalOpen]);

    useEffect(() => {
        // Show the modal to update name if it looks like a username and hasn't been shown this session
        if (user && user.name && !user.name.includes(' ') && !sessionStorage.getItem('nameUpdateModalShown')) {
            const timer = setTimeout(() => {
                setIsNameModalOpen(true);
                sessionStorage.setItem('nameUpdateModalShown', 'true');
            }, 2000); // Delay slightly after login
            return () => clearTimeout(timer);
        }
    }, [user]);

    const mainClasses = isTestPage 
        ? "py-8" 
        : "container mx-auto px-4 py-8";

    return (
        <div className={`flex flex-col min-h-screen bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-default-rgb))] font-main ${isMasquerading ? 'pt-10' : ''}`}>
            {isMasquerading && <MasqueradeBanner />}
            {user && <UpdateNameModal isOpen={isNameModalOpen} onClose={() => setIsNameModalOpen(false)} />}
            {canSpinWheel && isWheelModalOpen && (
              <WheelOfFortune 
                isOpen={isWheelModalOpen} 
                onClose={() => {
                  setWheelModalOpen(false);
                  setWheelModalDismissed(true); // User has now interacted with it this session
                }} 
              />
            )}
            {!isTestPage && <Header />}
            <div className="flex-grow w-full relative">
                <main className={mainClasses}>
                    {/* Fix: Use <Routes> and v6 Route syntax */}
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<Login />} />
                        <Route path="/checkout/:productSlug" element={<Checkout />} />
                        <Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />

                        {/* Routes with Sidebar */}
                        <Route element={<SidebarLayout><Outlet /></SidebarLayout>}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/instructions" element={<Instructions />} />
                            <Route path="/pricing" element={<Pricing />} />
                            <Route path="/feedback" element={<Feedback />} />
                            <Route path="/user-guide" element={<UserGuide />} />
                            <Route path="/about-us" element={<AboutUs />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/refund-policy" element={<RefundPolicy />} />
                            <Route path="/terms-of-service" element={<TermsOfService />} />
                            <Route path="/bookstore" element={<BookStore />} />
                            <Route path="/program/:programId" element={<ExamProgram />} />
                            <Route path="/profile" element={
                              <ProtectedRoute>
                                <Profile />
                              </ProtectedRoute>
                            } />
                            <Route path="/results/:testId" element={
                              <ProtectedRoute>
                                <Results />
                              </ProtectedRoute>
                            } />
                        </Route>

                        {/* Admin Routes with dedicated layout */}
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute adminOnly={true}>
                              <AdminLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route index element={<Admin />} />
                          <Route path="products" element={<ProductCustomizer />} />
                          <Route path="programs" element={<ExamProgramCustomizer />} />
                          <Route path="integration" element={<Integration />} />
                        </Route>
                    
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                {user && user.isAdmin && !isTestPage && <DebugSidebar />}
            </div>
            {!isTestPage && <Footer />}
            {!isTestPage && <LivePurchaseNotification />}
        </div>
    );
};


const App: FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <HashRouter>
            <AppContent />
            <Toaster position="top-right" reverseOrder={false} />
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;