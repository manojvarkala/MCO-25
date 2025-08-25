

import * as React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { LogOut, UserCircle, UserPlus, LogIn, User, Shield, BookMarked, Tag, Users, Gift, Star } from 'lucide-react';
import { logoBase64 } from '../assets/logo.ts';

const Header: React.FC = () => {
  const { user, logout, canSpinWheel, isSubscribed } = useAuth();
  const { activeOrg, setWheelModalOpen } = useAppContext();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    // Redirect to the external WordPress site's logout page, then back to the app's home
    const appHomeUrl = 'https://exams.coding-online.net';
    const wpLogoutUrl = `https://www.coding-online.net/wp-login.php?action=logout&redirect_to=${encodeURIComponent(appHomeUrl)}`;
    window.location.href = wpLogoutUrl;
  };

  const headerLink = user ? "/#/dashboard" : "/#/";
  
  // The custom login page is a WordPress page with the slug 'exam-login'
  const loginUrl = `https://www.coding-online.net/exam-login/`;
  const myAccountUrl = `https://www.coding-online.net/my-account/`;

  const headerClasses = isSubscribed
    ? "shadow-lg sticky top-0 z-50 premium-header-gradient"
    : "bg-white shadow-md sticky top-0 z-50";

  const linkClasses = isSubscribed
    ? "text-slate-300 hover:text-white"
    : "text-slate-600 hover:text-cyan-600";

  return (
    <header className={headerClasses}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {activeOrg ? (
            <a href={headerLink} className="flex items-center space-x-3">
                 <img
                    src={logoBase64}
                    alt={`${activeOrg.name} Logo`}
                    className="h-14 w-14 object-contain"
                />
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold font-serif text-slate-900">
                            {activeOrg.name}
                        </span>
                        {isSubscribed && (
                            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold uppercase px-2 py-0.5 rounded-full self-center">
                                PRO
                            </span>
                        )}
                    </div>
                    <span className="text-md font-serif text-slate-500">
                        {activeOrg.website}
                    </span>
                </div>
            </a>
        ) : (
             <div className="flex items-center space-x-3">
                 <div className="h-14 w-14 bg-slate-200 rounded-full animate-pulse"></div>
                 <div className="flex flex-col">
                    <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                 </div>
             </div>
        )}
       
        <nav className="flex items-center space-x-4">
            {canSpinWheel && (
                <button
                    onClick={() => setWheelModalOpen(true)}
                    className="flex items-center gap-2 bg-black text-yellow-400 font-bold py-2 px-4 rounded-full border-2 border-yellow-500 shadow-lg hover:bg-gray-800 transition-all transform hover:scale-105"
                    title="You have a free spin!"
                >
                    <Gift size={16} className="animate-pulse-gift" />
                    <span className="hidden sm:inline">Spin & Win</span>
                </button>
            )}
            <a 
                href="/#/pricing"
                className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`}
                title="View Plans and Pricing"
            >
                <Tag size={20} />
                <span className="hidden sm:inline font-semibold">Pricing</span>
            </a>
           <a 
                href="/#/bookstore"
                className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`}
                title="Recommended Books"
            >
                <BookMarked size={20} />
                <span className="hidden sm:inline font-semibold">Book Store</span>
            </a>
            <a 
                href="/#/about-us"
                className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`}
                title="About Us"
            >
                <Users size={20} />
                <span className="hidden sm:inline font-semibold">About Us</span>
            </a>
          {user ? (
            <>
              <div className="relative" onMouseEnter={() => setIsProfileMenuOpen(true)} onMouseLeave={() => setIsProfileMenuOpen(false)}>
                <a href="/#/profile" className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`} title="View your profile">
                    {isSubscribed && <Star size={16} className="text-yellow-400 fill-current" />}
                    <UserCircle size={20} />
                    <span className="hidden sm:inline">Profile</span>
                </a>
                 {isProfileMenuOpen && (
                    <div className={`absolute right-0 top-full pt-2 w-56 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 ${isSubscribed ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="px-4 py-2 text-xs text-slate-400">Welcome, {user.name}</div>
                         <a href="/#/profile" className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isSubscribed ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                            <User size={14}/> Profile Details
                        </a>
                        <a href={myAccountUrl} target="_blank" rel="noopener noreferrer" className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isSubscribed ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                           <UserCircle size={14}/> My Account (Main Site)
                        </a>
                        {user.isAdmin && (
                            <a href="/#/admin" className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isSubscribed ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                               <Shield size={14}/> Admin Panel
                            </a>
                        )}
                    </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
             <div className="flex items-center space-x-2">
                <a
                    href={loginUrl}
                    className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                    <LogIn size={16} />
                    <span>Login</span>
                </a>
                <a
                    href="https://www.coding-online.net/wp-login.php?action=register"
                    className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                    >
                    <UserPlus size={16} />
                    <span>Register</span>
                </a>
             </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
