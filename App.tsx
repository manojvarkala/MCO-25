
import * as React from 'react';
import { HashRouter, Redirect, Route, Switch, useLocation } from 'react-router-dom';
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


interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) {
    return <Redirect to="/" />;
  }
  if (adminOnly && !user.isAdmin) {
    return <Redirect to="/dashboard" />;
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
                    <Switch>
                        {/* Routes with generic sidebar */}
                        <Route path="/instructions">
                            <SidebarLayout><Instructions /></SidebarLayout>
                        </Route>
                        <Route path="/bookstore">
                            <SidebarLayout><BookStore /></SidebarLayout>
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
                        <Route path="/profile">
                          <ProtectedRoute>
                            <SidebarLayout><Profile /></SidebarLayout>
                          </ProtectedRoute>
                        </Route>
                        <Route path="/results/:testId">
                          <ProtectedRoute>
                            <SidebarLayout><Results /></SidebarLayout>
                          </ProtectedRoute>
                        </Route>

                        {/* Routes with their own layout or no sidebar */}
                        <Route exact path="/">
                            <LandingPage />
                        </Route>
                        <Route path="/auth">
                            <Login />
                        </Route>
                        <Route path="/checkout/:productSlug">
                            <Checkout />
                        </Route>
                        <Route path="/dashboard">
                            <ProtectedRoute><Dashboard /></ProtectedRoute>
                        </Route>
                        <Route path="/test/:examId">
                            <ProtectedRoute><Test /></ProtectedRoute>
                        </Route>
                        <Route path="/certificate/sample">
                            <ProtectedRoute><Certificate /></ProtectedRoute>
                        </Route>
                        <Route path="/certificate/:testId">
                            <ProtectedRoute><Certificate /></ProtectedRoute>
                        </Route>
                        <Route path="/admin">
                            <ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>
                        </Route>
                        <Route path="/integration">
                            <ProtectedRoute adminOnly={true}><Integration /></ProtectedRoute>
                        </Route>
                    
                        <Route path="*">
                            <Redirect to="/" />
                        </Route>
                    </Switch>
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
        <HashRouter>
            <AppContent />
            <Toaster position="top-right" reverseOrder={false} />
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
