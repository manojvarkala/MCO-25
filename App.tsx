
import React, { FC, useState, useEffect, ReactNode, useMemo } from 'react';
// FIX: Corrected import for react-router-dom to resolve module export errors.
import { Navigate, useLocation, Routes, Route, BrowserRouter, Outlet } from "react-router-dom";
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
import UpdateNameModal from './components/UpdateNameModal.tsx';
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

// Helper to safely access the aistudio object, which might be in a parent frame.
function getAiStudio(): { openSelectKey: () => Promise<void>; hasSelectedApiKey: () => Promise<boolean>; } | undefined {
    try {
        // @ts-ignore
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            // @ts-ignore
            return window.aistudio;
        }
        // @ts-ignore
        if (window.parent && window.parent.aistudio && typeof window.parent.aistudio.openSelectKey === 'function') {
            // @ts-ignore
            return window.parent.aistudio;
        }
    } catch (e) {
        // A cross-origin error may be thrown when accessing window.parent.
        console.warn("Could not access window.parent to check for AI Studio context.", e);
        // @ts-ignore
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
             // @ts-ignore
            return window.aistudio;
        }
    }
    return undefined;
}

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
    const { user, isMasquerading } = useAuth();
    const { activeOrg, activeTheme } = useAppContext();
    const location = useLocation();
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);

    const isTestPage = location.pathname.startsWith('/test/');
    const isAdminPage = location.pathname.startsWith('/admin');

    const mainLayoutComponent = isAdminPage ? <Outlet /> : <SidebarLayout><Outlet /></SidebarLayout>;

    const themeClass = useMemo(() => {
        return activeTheme ? `theme-${activeTheme}` : 'theme-default';
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
        <div data-theme={activeTheme} className={`flex flex-col min-h-screen bg-[rgb(var(--color-background-rgb))] text-[rgb(var(--color-text-default-rgb))] font-main ${isMasquerading ? 'pt-10' : ''}`}>
            {isMasquerading && <MasqueradeBanner />}
            {user && <UpdateNameModal isOpen={isNameModalOpen} onClose={() => setIsNameModalOpen(false)} />}
            {!isTestPage && <Header />}
            <div className="flex-grow w-full relative">
                <main className={mainClasses}>
                    {/* Fix: Use <Routes> and v6 Route syntax */}
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
                            <Route path="/faq" element={<FAQ />} />
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
                          <Route path="analytics" element={<SalesAnalytics />} />
                          <Route path="products" element={<ProductCustomizer />} />
                          <Route path="programs" element={<ExamProgramCustomizer />} />
                          <Route path="content-engine" element={<ContentEngine />} />
                          <Route path="integration" element={<Integration />} />
                          <Route path="history" element={<DevelopmentHistory />} />
                          <Route path="handbook" element={<Handbook />} />
                        </Route>
                    
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
            {!isTestPage && <Footer />}
            {!isTestPage && <LivePurchaseNotification />}
        </div>
    );
};

const ApiKeySelector: FC<{ onKeySelected: () => void }> = ({ onKeySelected }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">API Key Required for Video Generation</h2>
                <p className="text-slate-600 mb-6">To use the Veo video generation feature, you must select an API key. Please note that generating videos may incur billing charges.</p>
                <button
                    onClick={async () => {
                        try {
                            const aistudio = getAiStudio();
                            if (aistudio) {
                                await aistudio.openSelectKey();
                                onKeySelected(); // Assume success to mitigate race conditions
                            } else {
                                toast.error("API Key selection feature is unavailable in this environment.");
                                console.error("AI Studio context (window.aistudio) was not found.");
                            }
                        } catch (e) {
                            console.error("Error opening API key selector:", e);
                            toast.error("An error occurred while trying to open the API key selector.");
                        }
                    }}
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
                >
                    Select API Key
                </button>
                <p className="text-xs text-slate-500 mt-4">
                    For more information, please see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">billing documentation</a>.
                </p>
            </div>
        </div>
    );
};

const App: FC = () => {
  const [hasVeoKey, setHasVeoKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
        try {
            const aistudio = getAiStudio();
            if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
                if (await aistudio.hasSelectedApiKey()) {
                    setHasVeoKey(true);
                }
            }
        } catch (e) {
            console.error("Error checking for selected API key:", e);
        } finally {
            setIsCheckingKey(false);
        }
    };
    checkKey();
  }, []);

  const requiresVeo = new URLSearchParams(window.location.search).get('gen_video') === 'true';

  if(isCheckingKey) {
      return null; // Don't render anything until the key check is complete
  }

  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
            {requiresVeo && !hasVeoKey && <ApiKeySelector onKeySelected={() => setHasVeoKey(true)} />}
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