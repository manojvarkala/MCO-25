import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-white mt-auto">
      <div className="container mx-auto px-4 py-4 text-center text-slate-500 text-sm">
        <div className="flex justify-center items-center space-x-4 mb-2">
            <ReactRouterDOM.Link to="/instructions" className="text-cyan-600 hover:underline">Instructions</ReactRouterDOM.Link>
            {user && user.isAdmin && (
              <>
                <span className="text-slate-300">|</span>
                <ReactRouterDOM.Link to="/integration" className="text-cyan-600 hover:underline">WordPress Integration</ReactRouterDOM.Link>
              </>
            )} 
          import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-white mt-auto">
      <div className="container mx-auto px-4 py-4 text-center text-slate-500 text-sm">
        <div className="flex justify-center items-center space-x-4 mb-2">
            <ReactRouterDOM.Link to="/instructions" className="text-cyan-600 hover:underline">Instructions</ReactRouterDOM.Link>
            {user && user.isAdmin && (
              <>
                <span className="text-slate-300">|</span>
                <ReactRouterDOM.Link to="/integration" className="text-cyan-600 hover:underline">WordPress Integration</ReactRouterDOM.Link>
              </>
            )}
            
                   <span className="text-slate-300">|</span>
            <a href="https://annapoornainfo.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Privacy Policy</a>
        </div>
        <p>&copy; {new Date().getFullYear()} Medical Coding Online | Powered by Annapoorna Examination App. All Rights Reserved.</p>
        <p>An <a href="https://annapoornainfo.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Annapoorna Infotech</a> Venture.</p>
      </div>
    </footer>
  );
};

export default Footer;
            <span className="text-slate-300">|</span>
            <a href="https://annapoornainfo.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Privacy Policy</a>
        </div>
        <p>&copy; {new Date().getFullYear()} Medical Coding Online | Powered by Annapoorna Examination App. All Rights Reserved.</p>
        <p>An <a href="https://annapoornainfo.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Annapoorna Infotech</a> Venture.</p>
      </div>
    </footer>
  );
};

export default Footer;
