import React, { FC, useState, useMemo, useEffect } from 'react';
import { Link } from "react-router-dom";
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { LogOut, UserCircle, UserPlus, LogIn, User, Shield, Tag, Users, Gift, Star, List, BookOpen, Menu } from 'lucide-react';

const Header: FC = () => {
  const { user, logout, isSubscribed, isEffectivelyAdmin } = useAuth();
  const { activeOrg } = useAppContext();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Reset error state if the logo URL changes
  useEffect(() => {
      setLogoError(false);
  }, [activeOrg?.logo]);

  // Updated URL generation with fallback
  const mainSiteBaseUrl = useMemo(() => {
    return activeOrg ? `https://${activeOrg.website}` : '';
  }, [activeOrg]);
  
  const handleLogout = () => {
    logout();
    // Redirect to the app's home page instead of WordPress logout
    // This keeps the user logged into the main site.
    window.location.href = '/';
  };

  const headerLink = user ? "/dashboard" : "/";
  
  // Revert to the original slug
  const loginUrl = `${mainSiteBaseUrl}/exam-login/`;
  const myAccountUrl = `${mainSiteBaseUrl}/my-account/`;
  const registerUrl = `${mainSiteBaseUrl}/wp-login.php?action=register`;

  const headerClasses = isSubscribed
    ? "shadow-lg sticky top-0 z-50 premium-header-gradient"
    : "bg-[rgb(var(--color-card-rgb))] shadow-md sticky top-0 z-50";

  const linkClasses = isSubscribed
    ? "text-slate-300 hover:text-white"
    : "text-[rgb(var(--color-text-muted-rgb))] hover:text-[rgb(var(--color-secondary-rgb))]";
    
  const examCategories = activeOrg?.examProductCategories || [];

  return (
    <header className={headerClasses}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to={headerLink} className="flex items-center space-x-3">
             {activeOrg && (activeOrg.logo && !logoError) ? (
                <img
                    src={activeOrg.logo}
                    alt={`${activeOrg.name} Logo`}
                    className="h-14 w-14 object-contain"
                    onError={() => setLogoError(true)}
                />
             ) : activeOrg ? (
                <div className="h-14 w-14 bg-slate-200 rounded-full flex items-center justify-center">
                    <Menu className="h-8 w-8 text-slate-400" />
                </div>
             ) : (
                <div className="h-14 w-14 bg-slate-200 rounded-full animate-pulse"></div>
             )}
            <div className="flex flex-col">
                {activeOrg ? (
                     <>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold font-display text-[rgb(var(--color-text-strong-rgb))]">
                                {activeOrg.name}
                            </span>
                            {isSubscribed && (
                                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold uppercase px-2 py-0.5 rounded-full self-center">
                                    PRO
                                </span>
                            )}
                        </div>
                        <span className="text-md font-display text-[rgb(var(--color-text-muted-rgb))]">
                            {activeOrg.address || activeOrg.website}
                        </span>
                     </>
                ) : (
                    <>
                        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                    </>
                )}
            </div>
        </Link>
       
        <nav className="flex items-center space-x-4">
            <Link 
                to="/pricing"
                className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`}
                title="View Plans and Pricing"
            >
                <Tag size={20} />
                <span className="hidden sm:inline font-semibold">Pricing</span>
            </Link>
            {examCategories.length > 0 && (
                <div className="relative" onMouseEnter={() => setIsCategoriesMenuOpen(true)} onMouseLeave={() => setIsCategoriesMenuOpen(false)}>
                    <Link to="/dashboard" className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`} title="View Exam Programs">
                        <List size={20} />
                        <span className="hidden sm:inline font-semibold">Exam Programs</span>
                    </Link>
                    {isCategoriesMenuOpen && (
                        <div className={`absolute left-0 top-full pt-2 w-64 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 ${isSubscribed ? 'bg-slate-800' : 'bg-[rgb(var(--color-card-rgb))]'}`}>
                            <div className="py-1 max-h-[calc(100vh-10rem)] overflow-y-auto">
                                {examCategories.map(category => (
                                    <Link
                                        key={category.id}
                                        to={`/program/${category.id}`}
                                        onClick={() => setIsCategoriesMenuOpen(false)}
                                        className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isSubscribed ? 'text-slate-300 hover:bg-slate-700' : 'text-[rgb(var(--color-text-default-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]'}`}
                                    >
                                        {category.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            <Link
                to="/bookstore"
                className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`}
                title="Recommended Books"
            >
                <BookOpen size={20} />
                <span className="hidden sm:inline font-semibold">Book Store</span>
            </Link>
            <Link 
                to="/about-us"
                className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`}
                title="About Us"
            >
                <Users size={20} />
                <span className="hidden sm:inline font-semibold">About Us</span>
            </Link>
          {user ? (
            <>
              <div className="relative" onMouseEnter={() => setIsProfileMenuOpen(true)} onMouseLeave={() => setIsProfileMenuOpen(false)}>
                <Link to="/profile" className={`flex items-center space-x-2 transition duration-200 ${linkClasses}`} title="View your profile">
                    {isSubscribed && <Star size={16} className="text-yellow-400 fill-current" />}
                    <UserCircle size={20} />
                    <span className="hidden sm:inline">Profile</span>
                </Link>
                 {isProfileMenuOpen && (
                    <div className={`absolute right-0 top-full pt-2 w-56 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 ${isSubscribed ? 'bg-slate-800' : 'bg-[rgb(var(--color-card-rgb))]'}`}>
                        <div className="px-4 py-2 text-xs text-slate-400">Welcome, {user.name}</div>
                         <Link to="/profile" className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isSubscribed ? 'text-slate-300 hover:bg-slate-700' : 'text-[rgb(var(--color-text-default-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]'}`}>
                            <User size={14}/> Profile Details
                        </Link>
                        <a href={myAccountUrl} target="_blank" rel="noopener noreferrer" className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isSubscribed ? 'text-slate-300 hover:bg-slate-700' : 'text-[rgb(var(--color-text-default-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]'}`}>
                           <UserCircle size={14}/> My Account (Main Site)
                        </a>
                        {isEffectivelyAdmin && (
                            <Link to="/admin" className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isSubscribed ? 'text-slate-300 hover:bg-slate-700' : 'text-[rgb(var(--color-text-default-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]'}`}>
                               <Shield size={14}/> Admin Panel
                            </Link>
                        )}
                    </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-[rgb(var(--color-muted-rgb))] hover:bg-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-default-rgb))] font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
             <div className="flex items-center space-x-2">
                <a
                    href={loginUrl}
                    className="flex items-center space-x-2 bg-[rgb(var(--color-muted-rgb))] hover:bg-[rgb(var(--color-border-rgb))] text-[rgb(var(--color-text-default-rgb))] font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                    <LogIn size={16} />
                    <span>Login</span>
                </a>
                <a
                    href={registerUrl}
                    className="flex items-center space-x-2 bg-[rgb(var(--color-primary-rgb))] hover:bg-[rgb(var(--color-primary-hover-rgb))] text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
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