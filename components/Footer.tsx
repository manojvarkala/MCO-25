
import * as React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-white mt-auto">
      <div className="container mx-auto px-4 py-4 text-center text-slate-500 text-sm">
        <div className="flex justify-center items-center space-x-4 mb-2 flex-wrap">
            <Link to="/instructions" className="text-cyan-600 hover:underline">Instructions</Link>
            <span className="text-slate-300">|</span>
            <Link to="/user-guide" className="text-cyan-600 hover:underline">User Guide</Link>
            <span className="text-slate-300">|</span>
            <Link to="/about-us" className="text-cyan-600 hover:underline">About Us</Link>
            <span className="text-slate-300">|</span>
            <Link to="/feedback" className="text-cyan-600 hover:underline">Feedback</Link>
            <span className="text-slate-300">|</span>
            <Link to="/terms-of-service" className="text-cyan-600 hover:underline">Terms of Service</Link>
            <span className="text-slate-300">|</span>
            <Link to="/privacy-policy" className="text-cyan-600 hover:underline">Privacy Policy</Link>
            <span className="text-slate-300">|</span>
            <Link to="/refund-policy" className="text-cyan-600 hover:underline">Refund Policy</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Medical Coding Online | Powered by Annapoorna Examination App. All Rights Reserved.</p>
        <p>An <a href="https://annapoornainfo.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Annapoorna Infotech</a> Venture.</p>
      </div>
    </footer>
  );
};

export default Footer;
