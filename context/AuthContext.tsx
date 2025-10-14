


import React, { useState, useEffect, useCallback, useMemo, useContext, createContext, FC, ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { User, TokenPayload } from '../types.ts';
import { googleSheetsService } from '../services/googleSheetsService.ts';

type MasqueradeMode = 'none' | 'user' | 'visitor';

interface AuthState {
    user: User | null;
    token: string | null;
    paidExamIds: string[];
    isSubscribed: boolean;
    // FIX: Add spinsAvailable to the auth state for the "Spin & Win" feature.
    spinsAvailable: number;
}

interface AuthContextType extends AuthState {
  isEffectivelyAdmin: boolean;
  isMasquerading: boolean;
  masqueradeAs: MasqueradeMode;
  loginWithToken: (token: string, isSyncOnly?: boolean) => Promise<void>;
  logout: () => void;
  updateUserName: (name: string) => void;
  startMasquerade: (as: 'user' | 'visitor') => void;
  stopMasquerade: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeHtmlEntities = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return text;
    }
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
        const storedUser = localStorage.getItem('examUser');
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });
  const [paidExamIds, setPaidExamIds] = useState<string[]>(() => {
      try {
        const storedIds = localStorage.getItem('paidExamIds');
        return storedIds ? JSON.parse(storedIds) : [];
      } catch (error) {
          console.error("Failed to parse paidExamIds from localStorage", error);
          return [];
      }
  });
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    try {
        const storedSubscribed = localStorage.getItem('isSubscribed');
        return storedSubscribed ? JSON.parse(storedSubscribed) : false;
    } catch (error) {
        console.error("Failed to parse isSubscribed from localStorage", error);
        return false;
    }
  });
  // FIX: Add state for spinsAvailable and initialize from localStorage.
  const [spinsAvailable, setSpinsAvailable] = useState<number>(() => {
    try {
        const storedSpins = localStorage.getItem('spinsAvailable');
        return storedSpins ? parseInt(storedSpins, 10) : 0;
    } catch (error) {
        console.error("Failed to parse spinsAvailable from localStorage", error);
        return 0;
    }
  });
  
  const [masqueradeAs, setMasqueradeAs] = useState<MasqueradeMode>('none');
  const [originalAuthState, setOriginalAuthState] = useState<AuthState | null>(null);

  const isEffectivelyAdmin = useMemo(() => {
    if (!user) return false;
    return user.isAdmin && masqueradeAs === 'none';
  }, [user, masqueradeAs]);


  const logout = useCallback(() => {
    setUser(null);
    setPaidExamIds([]);
    setToken(null);
    setIsSubscribed(false);
    // FIX: Reset spinsAvailable on logout.
    setSpinsAvailable(0);
    setMasqueradeAs('none');
    setOriginalAuthState(null);
    localStorage.removeItem('examUser');
    localStorage.removeItem('paidExamIds');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isSubscribed');
    localStorage.removeItem('spinsAvailable');
    localStorage.removeItem('wonPrize');
    localStorage.removeItem('activeOrg');
    localStorage.removeItem('isSpinWheelEnabled');
    sessionStorage.removeItem('wheelModalDismissed');
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('exam_timer_') || key.startsWith('exam_results_')) {
            localStorage.removeItem(key);
        }
    });
  }, []);

  useEffect(() => {
    const checkTokenExpiration = () => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            try {
                const payloadBase64Url = storedToken.split('.')[1];
                if (!payloadBase64Url) {
                    logout();
                    return;
                }
                const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
                const decodedPayload = decodeURIComponent(atob(payloadBase64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(decodedPayload);
                
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    toast.error("Your session has expired. Please log in again.");
                    logout();
                }
            } catch (e) {
                console.error("Failed to parse token for expiration check, logging out.", e);
                logout();
            }
        }
    };
    
    checkTokenExpiration();
    const intervalId = setInterval(checkTokenExpiration, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
        clearInterval(intervalId);
    };
  }, [logout]);


  const loginWithToken = useCallback(async (jwtToken: string, isSyncOnly: boolean = false) => {
    try {
        const parts = jwtToken.split('.');
        if (parts.length !== 3) throw new Error("Invalid JWT format.");
        
        const payloadBase64Url = parts[1];
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = decodeURIComponent(atob(payloadBase64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload: TokenPayload = JSON.parse(decodedPayload);
        
        if (payload.user && payload.user.name) {
            payload.user.name = decodeHtmlEntities(payload.user.name);
        }

        if (payload.user && payload.paidExamIds) {
            setUser(payload.user);
            setPaidExamIds(payload.paidExamIds);
            setToken(jwtToken);
            setMasqueradeAs('none');
            setOriginalAuthState(null);
            localStorage.setItem('examUser', JSON.stringify(payload.user));
            localStorage.setItem('paidExamIds', JSON.stringify(payload.paidExamIds));
            localStorage.setItem('authToken', jwtToken);

            if (payload.isSubscribed) {
                setIsSubscribed(payload.isSubscribed);
                localStorage.setItem('isSubscribed', JSON.stringify(payload.isSubscribed));
            } else {
                setIsSubscribed(false);
                localStorage.removeItem('isSubscribed');
            }

            // FIX: Handle spinsAvailable from the token payload.
            if (typeof payload.spinsAvailable === 'number') {
                setSpinsAvailable(payload.spinsAvailable);
                localStorage.setItem('spinsAvailable', payload.spinsAvailable.toString());
            } else {
                setSpinsAvailable(0);
                localStorage.removeItem('spinsAvailable');
            }

            try {
                await googleSheetsService.syncResults(payload.user, jwtToken);
                toast.success(isSyncOnly ? 'Exams synchronized successfully!' : 'Logged in successfully!');
            } catch (syncError: any) {
                console.error("Background sync on login failed:", syncError.message);
                const successPart = isSyncOnly ? 'Exams synchronized.' : 'Login successful.';
                toast.error(
                    `${successPart} Could not sync your exam history. Locally saved results will be shown. Error: ${syncError.message}`,
                    { duration: 10000 }
                );
            }

        } else {
            throw new Error("Invalid token payload structure.");
        }
    } catch(e) {
        console.error("Failed to decode or parse token:", e);
        logout();
        throw new Error("Invalid authentication token.");
    }
  }, [logout]);
  
    const startMasquerade = (as: 'user' | 'visitor') => {
        if (masqueradeAs !== 'none' || !user?.isAdmin) return;
    
        // FIX: Include spinsAvailable in the original auth state to restore it later.
        setOriginalAuthState({ user, token, paidExamIds, isSubscribed, spinsAvailable });
        setMasqueradeAs(as);

        if (as === 'user') {
            toast('Masquerade mode enabled. Viewing as a logged-in user.', { icon: '🎭' });
        } else { // visitor
            setUser(null);
            setToken(null);
            setPaidExamIds([]);
            setIsSubscribed(false);
            // FIX: Reset spinsAvailable when masquerading as a visitor.
            setSpinsAvailable(0);
            toast('Masquerade mode enabled. Viewing as a visitor.', { icon: '👻' });
        }
    };

    const stopMasquerade = () => {
        if (masqueradeAs === 'none' || !originalAuthState) return;

        setUser(originalAuthState.user);
        setToken(originalAuthState.token);
        setPaidExamIds(originalAuthState.paidExamIds);
        setIsSubscribed(originalAuthState.isSubscribed);
        // FIX: Restore spinsAvailable when stopping masquerade.
        setSpinsAvailable(originalAuthState.spinsAvailable);

        setOriginalAuthState(null);
        setMasqueradeAs('none');
        toast.success('Returned to Admin view.');
    };

  const updateUserName = useCallback((name: string) => {
    if (user) {
      const updatedUser = { ...user, name };
      setUser(updatedUser);
      localStorage.setItem('examUser', JSON.stringify(updatedUser));
    }
  }, [user]);

  const isMasquerading = masqueradeAs !== 'none';

  const value = useMemo(() => ({
    user,
    token,
    paidExamIds,
    isSubscribed,
    // FIX: Expose spinsAvailable through the context.
    spinsAvailable,
    isEffectivelyAdmin,
    isMasquerading,
    masqueradeAs,
    loginWithToken,
    logout,
    updateUserName,
    startMasquerade,
    stopMasquerade,
  }), [
    user, token, paidExamIds, isSubscribed, spinsAvailable,
    isEffectivelyAdmin, isMasquerading, masqueradeAs, loginWithToken,
    logout, updateUserName, startMasquerade, stopMasquerade
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    {/* FIX: Corrected the closing tag for AuthContext.Provider. */}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};