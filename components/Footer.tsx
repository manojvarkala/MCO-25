import React, { FC } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors.
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { Users, Zap } from 'lucide-react';

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
    <footer className="mt-auto flex flex-col">
      <div className="bg-[rgb(var(--color-card-rgb))] py-8 border-t border-[rgb(var(--color-border-rgb))]">
        <div className="container mx-auto px-4 text-center text-[rgb(var(--color-text-muted-rgb))] text-sm">
          <div className="flex justify-center items-center space-x-4 mb-4 flex-wrap">
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
          
          {activeOrg.disclaimerText && (
              <div className="mt-6 pt-6 border-t border-[rgb(var(--color-border-rgb))] opacity-60">
                  <p className="text-[10px] text-center max-w-3xl mx-auto uppercase tracking-widest font-bold">
                      {activeOrg.disclaimerText}
                  </p>
              </div>
          )}

          <p className="mt-6 font-semibold">&copy; {new Date().getFullYear()} {activeOrg.name}. All Rights Reserved.</p>
        </div>
      </div>

      {/* Annapoorna Advantage Branding Ribbon */}
      <div className="bg-slate-950 py-3 border-t border-slate-800">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black">
              <span className="text-slate-500">System Powered by</span>
              <a 
                href="https://annapoornainfo.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1.5 text-cyan-500 hover:text-cyan-400 transition-colors group"
              >
                  <Zap size={12} className="fill-cyan-500 group-hover:scale-110 transition-transform" />
                  ANNAPOORNA ADVANTAGE
              </a>
          </div>
      </div>
    </footer>
  );
};

export default Footer;