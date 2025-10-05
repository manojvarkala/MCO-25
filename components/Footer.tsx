import React, { FC } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';

const Footer: FC = () => {
  const { user } = useAuth();
  const { activeOrg } = useAppContext();

  if (!activeOrg) {
    return (
        <footer className="bg-white mt-auto">
            <div className="container mx-auto px-4 py-4 text-center text-slate-500 text-sm">
                <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
                </div>
            </div>
        </footer>
    );
  }

  return (
    <footer className="bg-[rgb(var(--color-card-rgb))] mt-auto">
      <div className="container mx-auto px-4 py-4 text-center text-[rgb(var(--color-text-muted-rgb))] text-sm">
        <div className="flex justify-center items-center space-x-4 mb-2 flex-wrap">
            <a href="/#/instructions" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Instructions</a>
            <span className="text-slate-300">|</span>
            <a href="/#/user-guide" className="text-[rgb(var(--color-primary-rgb))] hover:underline">User Guide</a>
            <span className="text-slate-300">|</span>
            <a href="/#/about-us" className="text-[rgb(var(--color-primary-rgb))] hover:underline">About Us</a>
            <span className="text-slate-300">|</span>
            <a href="/#/feedback" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Feedback</a>
            <span className="text-slate-300">|</span>
            <a href="/#/terms-of-service" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Terms of Service</a>
            <span className="text-slate-300">|</span>
            <a href="/#/privacy-policy" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Privacy Policy</a>
            <span className="text-slate-300">|</span>
            <a href="/#/refund-policy" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Refund Policy</a>
        </div>
        <p>&copy; {new Date().getFullYear()} {activeOrg.name}. All Rights Reserved.</p>
        <p>An <a href="https://annapoornainfo.com" target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Annapoorna Infotech</a> Venture.</p>
      </div>
    </footer>
  );
};

export default Footer;