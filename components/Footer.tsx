

import * as React from 'react';
import { useAuth } from '../context/AuthContext.tsx';

const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-white mt-auto">
      <div className="container mx-auto px-4 py-4 text-center text-slate-500 text-sm">
        <div className="flex justify-center items-center space-x-4 mb-2 flex-wrap">
            <a href="/#/instructions" className="text-cyan-600 hover:underline">Instructions</a>
            <span className="text-slate-300">|</span>
            <a href="/#/user-guide" className="text-cyan-600 hover:underline">User Guide</a>
            <span className="text-slate-300">|</span>
            <a href="/#/about-us" className="text-cyan-600 hover:underline">About Us</a>
            <span className="text-slate-300">|</span>
            <a href="/#/feedback" className="text-cyan-600 hover:underline">Feedback</a>
            <span className="text-slate-300">|</span>
            <a href="/#/terms-of-service" className="text-cyan-600 hover:underline">Terms of Service</a>
            <span className="text-slate-300">|</span>
            <a href="/#/privacy-policy" className="text-cyan-600 hover:underline">Privacy Policy</a>
            <span className="text-slate-300">|</span>
            <a href="/#/refund-policy" className="text-cyan-600 hover:underline">Refund Policy</a>
        </div>
        <p>&copy; {new Date().getFullYear()} Medical Coding Online | Powered by Annapoorna Examination App. All Rights Reserved.</p>
        <p>An <a href="https://annapoornainfo.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Annapoorna Infotech</a> Venture.</p>
      </div>
    </footer>
  );
};

export default Footer;
