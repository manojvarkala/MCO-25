import * as React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
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
import PurchaseNotifier from './components/PurchaseNotifier.tsx';
import SidebarLayout from './components/SidebarLayout.tsx';
import Integration from './components/Integration.tsx';


interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) {
    return <ReactRouterDOM.Navigate to="/" replace />;
  }
  if (adminOnly && !user.isAdmin) {
    return <ReactRouterDOM.Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
    const { user, canSpinWheel, wheelModalDismissed, setWheelModalDismissed } = useAuth();
    const { isWheelModalOpen, setWheelModalOpen } = useAppContext();
    const location = ReactRouterDOM.useLocation();
    
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
                    <ReactRouterDOM.Routes>
                        {/* Routes with generic sidebar */}
                        <ReactRouterDOM.Route element={<SidebarLayout />}>
                            <ReactRouterDOM.Route path="/instructions" element={<Instructions />} />
                            <ReactRouterDOM.Route path="/bookstore" element={<BookStore />} />
                            <ReactRouterDOM.Route path="/pricing" element={<Pricing />} />
                            <ReactRouterDOM.Route path="/feedback" element={<Feedback />} />
                            <ReactRouterDOM.Route path="/user-guide" element={<UserGuide />} />
                            <ReactRouterDOM.Route path="/about-us" element={<AboutUs />} />
                            <ReactRouterDOM.Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <ReactRouterDOM.Route path="/refund-policy" element={<RefundPolicy />} />
                            <ReactRouterDOM.Route path="/terms-of-service" element={<TermsOfService />} />
                            <ReactRouterDOM.Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                            <ReactRouterDOM.Route path="/results/:testId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
                        </ReactRouterDOM.Route>

                        {/* Routes with their own layout or no sidebar */}
                        <ReactRouterDOM.Route path="/" element={<LandingPage />} />
                        <ReactRouterDOM.Route path="/auth" element={<Login />} />
                        <ReactRouterDOM.Route path="/checkout/:productSlug" element={<Checkout />} />
                        <ReactRouterDOM.Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/admin" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/integration" element={<ProtectedRoute adminOnly={true}><Integration /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/purchase-notifier" element={<ProtectedRoute adminOnly={true}><PurchaseNotifier /></ProtectedRoute>} />
                    
                        <ReactRouterDOM.Route path="*" element={<ReactRouterDOM.Navigate to="/" replace />} />
                    </ReactRouterDOM.Routes>
                </main>
                {user && user.isAdmin && !isTestPage && <DebugSidebar />}
            </div>
            {!isTestPage && <Footer />}
            {!isTestPage && <LivePurchaseNotification />}
        </div>
    );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <ReactRouterDOM.BrowserRouter basename="/MCO-25">
            <AppContent />
            <Toaster position="top-right" reverseOrder={false} />
        </ReactRouterDOM.BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;