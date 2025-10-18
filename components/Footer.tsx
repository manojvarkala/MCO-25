import React, { FC } from 'react';
import { Link } from "react-router-dom";
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { Users } from 'lucide-react';

const Footer: FC = () => {
  const { user } = useAuth();
  const { activeOrg, hitCount } = useAppContext();

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
            <Link to="/instructions" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Instructions</Link>
            <span className="text-slate-300">|</span>
            <Link to="/faq" className="text-[rgb(var(--color-primary-rgb))] hover:underline">FAQ</Link>
            <span className="text-slate-300">|</span>
            <Link to="/verify" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Verify Certificate</Link>
            <span className="text-slate-300">|</span>
            <Link to="/user-guide" className="text-[rgb(var(--color-primary-rgb))] hover:underline">User Guide</Link>
            <span className="text-slate-300">|</span>
            <Link to="/about-us" className="text-[rgb(var(--color-primary-rgb))] hover:underline">About Us</Link>
            <span className="text-slate-300">|</span>
            <Link to="/feedback" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Feedback</Link>
            <span className="text-slate-300">|</span>
            <Link to="/terms-of-service" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Terms of Service</Link>
            <span className="text-slate-300">|</span>
            <Link to="/privacy-policy" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Privacy Policy</Link>
            <span className="text-slate-300">|</span>
            <Link to="/refund-policy" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Refund Policy</Link>
        </div>
        {hitCount !== null && (
            <div className="flex justify-center items-center gap-2 mt-4 text-slate-400">
                <Users size={16} />
                <p>
                    Site Visitors: 
                    <span className="font-bold text-slate-300 ml-1">
                        {hitCount.toLocaleString()}
                    </span>
                </p>
            </div>

        )}
        <p className="mt-4">&copy; {new Date().getFullYear()} {activeOrg.name}. All Rights Reserved.</p>
        <p>An <a href="https://annapoornainfo.com" target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary-rgb))] hover:underline">Annapoorna Infotech</a> Venture.</p>
      </div>
    </footer>
  );
};


export default Footer;