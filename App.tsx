






import * as React from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import BookStore from './components/BookStore.tsx';
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
import SuperAdminBlueprint from './components/SuperAdminBlueprint.tsx';

// New Component for the promotional announcement
const PromotionAnnouncement: React.FC = () => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isHiding, setIsHiding] = React.useState(false);
    const announcementKey = 'announcementDismissed_1_dollar_offer_sept15';

    React.useEffect(() => {
        const dismissed = sessionStorage.getItem(announcementKey);
        if (!dismissed) {
            const timer = setTimeout(() => setIsVisible(true), 2500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsHiding(true);
        sessionStorage.setItem(announcementKey, 'true');
        setTimeout(() => {
            setIsVisible(false);
        }, 500); // Match duration of fade-out animation
    };
    
    if (!isVisible) return null;

    const MegaphoneIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
    );
    const CloseIcon = () => (
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    );

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ease-in-out ${isHiding ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
             <div className="relative bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-2xl w-full rounded-2xl p-6 max-w-md">
                <button onClick={handleClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" aria-label="Dismiss announcement">
                   <CloseIcon />
                </button>
                <div className="flex items-center gap-5">
                    <div className="bg-white/20 p-3 rounded-full hidden sm:block">
                        <MegaphoneIcon />
                    </div>
                    <div className="flex-grow">
                        <h3 className="font-extrabold text-xl sm:text-2xl text-white">Limited Time Offer!</h3>
                        <p className="text-base sm:text-lg text-white/90 mt-1">
                            All certification exams are just <span className="font-black text-yellow-300 text-2xl sm:text-3xl">$1</span> as an introductory offer!
                        </p>
                        <p className="text-sm text-white/80 mt-2">This promotion ends September 15th.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
    const { user, canSpinWheel, wheelModalDismissed, setWheelModalDismissed } = useAuth();
    const { isWheelModalOpen, setWheelModalOpen } = useAppContext();
    const location = useLocation();
    
    const isTestPage = location.pathname.startsWith('/test/');

    React.useEffect(() => {
        // Show the wheel modal only for eligible users who haven't already dismissed it this session.
        if (canSpinWheel && !wheelModalDismissed) {
            const timer = setTimeout(() => setWheelModalOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [canSpinWheel, wheelModalDismissed, setWheelModalOpen]);

    const mainClasses = isTestPage 
        ? "py-8" 
        : "container mx-auto px-4 py-8";

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
            {canSpinWheel && (
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
                    <Routes>
                        {/* Routes with generic sidebar */}
                        <Route path="/instructions" element={<SidebarLayout><Instructions /></SidebarLayout>} />
                        <Route path="/bookstore" element={<SidebarLayout><BookStore /></SidebarLayout>} />
                        <Route path="/pricing" element={<SidebarLayout><Pricing /></SidebarLayout>} />
                        <Route path="/feedback" element={<SidebarLayout><Feedback /></SidebarLayout>} />
                        <Route path="/user-guide" element={<SidebarLayout><UserGuide /></SidebarLayout>} />
                        <Route path="/about-us" element={<SidebarLayout><AboutUs /></SidebarLayout>} />
                        <Route path="/privacy-policy" element={<SidebarLayout><PrivacyPolicy /></SidebarLayout>} />
                        <Route path="/refund-policy" element={<SidebarLayout><RefundPolicy /></SidebarLayout>} />
                        <Route path="/terms-of-service" element={<SidebarLayout><TermsOfService /></SidebarLayout>} />
                        <Route path="/profile" element={
                          <ProtectedRoute>
                            <SidebarLayout><Profile /></SidebarLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/results/:testId" element={
                          <ProtectedRoute>
                            <SidebarLayout><Results /></SidebarLayout>
                          </ProtectedRoute>
                        } />

                        {/* Routes with their own layout or no sidebar */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<Login />} />
                        <Route path="/checkout/:productSlug" element={<Checkout />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
                        <Route path="/integration" element={<ProtectedRoute adminOnly={true}><Integration /></ProtectedRoute>} />
                        <Route path="/superadmin-blueprint" element={<ProtectedRoute adminOnly={true}><SuperAdminBlueprint /></ProtectedRoute>} />
                    
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                {user && user.isAdmin && !isTestPage && <DebugSidebar />}
            </div>
            {!isTestPage && <Footer />}
            {!isTestPage && <LivePurchaseNotification />}
            {!isTestPage && <PromotionAnnouncement />}
        </div>
    );
};


const App: React.FC = () => {
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