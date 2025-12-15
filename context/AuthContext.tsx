import React, { useState, useEffect, useCallback, useMemo, useContext, createContext, FC, ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { User, TokenPayload, SubscriptionInfo } from '../types.ts';
import { googleSheetsService } from '../services/googleSheetsService.ts';

type MasqueradeMode = 'none' | 'user' | 'visitor';

interface AuthState {
    user: User | null;
    token: string | null;
    paidExamIds: string[];
    isSubscribed: boolean;
    subscriptionInfo: SubscriptionInfo | null;
    isBetaTester: boolean;
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
        const parsed = storedIds ? JSON.parse(storedIds) : [];
        return Array.isArray(parsed) ? parsed : (parsed ? Object.values(parsed) : []);
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
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(() => {
    try {
        const storedInfo = localStorage.getItem('subscriptionInfo');
        return storedInfo ? JSON.parse(storedInfo) : null;
    } catch (error) {
        console.error("Failed to parse subscriptionInfo from localStorage", error);
        return null;
    }
  });
  const [isBetaTester, setIsBetaTester] = useState<boolean>(() => {
    try {
        const stored = localStorage.getItem('isBetaTester');
        return stored ? JSON.parse(stored) : false;
    } catch (error) {
        console.error("Failed to parse isBetaTester from localStorage", error);
        return false;
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
    setSubscriptionInfo(null);
    setIsBetaTester(false);
    setMasqueradeAs('none');
    setOriginalAuthState(null);
    localStorage.removeItem('examUser');
    localStorage.removeItem('paidExamIds');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isSubscribed');
    localStorage.removeItem('subscriptionInfo');
    localStorage.removeItem('isBetaTester');
    localStorage.removeItem('activeOrg');
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
                const parts = storedToken.split('.');
                if (parts.length === 3) {
                     const payloadBase64Url = parts[1];
                     const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
                     const decodedPayload = decodeURIComponent(atob(payloadBase64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                     }).join(''));
                     const payload = JSON.parse(decodedPayload);
                     
                     if (payload.exp && payload.exp * 1000 < Date.now()) {
                         console.warn("Token expired via interval check.");
                         logout();
                     }
                }
            } catch (e) {
                console.error("Failed to parse token for expiration check, logging out.", e);
                // Do NOT logout here for minor parse errors, wait for API rejection
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

        if (payload.user) {
            setUser(payload.user);
            
            // Robustly handle paidExamIds: If backend sent an object instead of array, convert it.
            let paidIds: string[] = [];
            if (payload.paidExamIds) {
                if (Array.isArray(payload.paidExamIds)) {
                    paidIds = payload.paidExamIds;
                } else if (typeof payload.paidExamIds === 'object') {
                    // Handle case where PHP array_unique preserved keys and json_encode made it an object
                    paidIds = Object.values(payload.paidExamIds);
                }
            }
            setPaidExamIds(paidIds);
            
            setToken(jwtToken);
            setMasqueradeAs('none');
            setOriginalAuthState(null);
            
            localStorage.setItem('examUser', JSON.stringify(payload.user));
            localStorage.setItem('paidExamIds', JSON.stringify(paidIds));
            localStorage.setItem('authToken', jwtToken);

            if (payload.isBetaTester) {
                setIsBetaTester(true);
                localStorage.setItem('isBetaTester', 'true');
            } else {
                setIsBetaTester(false);
                localStorage.removeItem('isBetaTester');
            }

            if (payload.isSubscribed) {
                setIsSubscribed(payload.isSubscribed);
                localStorage.setItem('isSubscribed', JSON.stringify(payload.isSubscribed));
            } else {
                setIsSubscribed(false);
                localStorage.removeItem('isSubscribed');
            }

            if (payload.subscriptionInfo) {
                setSubscriptionInfo(payload.subscriptionInfo);
                localStorage.setItem('subscriptionInfo', JSON.stringify(payload.subscriptionInfo));
            } else {
                setSubscriptionInfo(null);
                localStorage.removeItem('subscriptionInfo');
            }

            // The sync operation is now non-blocking. It runs in the background.
            (async () => {
                try {
                    await googleSheetsService.syncResults(payload.user, jwtToken);
                    if (isSyncOnly) {
                        toast.success('Exams synchronized successfully!');
                    } else {
                        // Silent success for login to avoid UI clutter
                    }
                } catch (syncError: any) {
                    console.error("Background sync on login failed:", syncError.message);
                    const errorPrefix = isSyncOnly ? 'Sync failed:' : 'Login successful, but sync failed:';
                    
                    if (syncError.message.includes("Authorization header")) {
                         toast.error(`${errorPrefix} Server configuration issue (Auth Header missing). Check Admin Debug sidebar.`, { duration: 10000 });
                    } else {
                         toast.error(`${errorPrefix} Locally saved results will be shown. Error: ${syncError.message}`, { duration: 8000 });
                    }
                }
            })();

        } else {
            throw new Error("Invalid token payload structure.");
        }
    } catch(e) {
        console.error("Failed to decode or parse token:", e);
        // Do not force logout on sync failures, just report error.
        throw new Error("Invalid authentication token.");
    }
  }, [logout]);
  
    const startMasquerade = (as: 'user' | 'visitor') => {
        if (masqueradeAs !== 'none' || !user?.isAdmin) return;
    
        setOriginalAuthState({ user, token, paidExamIds, isSubscribed, subscriptionInfo, isBetaTester });
        setMasqueradeAs(as);

        if (as === 'user') {
            toast('Masquerade mode enabled. Viewing as a logged-in user.', { icon: '🎭' });
        } else { // visitor
            setUser(null);
            setToken(null);
            setPaidExamIds([]);
            setIsSubscribed(false);
            setSubscriptionInfo(null);
            setIsBetaTester(false);
            toast('Masquerade mode enabled. Viewing as a visitor.', { icon: '👻' });
        }
    };

    const stopMasquerade = () => {
        if (masqueradeAs === 'none' || !originalAuthState) return;

        setUser(originalAuthState.user);
        setToken(originalAuthState.token);
        setPaidExamIds(originalAuthState.paidExamIds);
        setIsSubscribed(originalAuthState.isSubscribed);
        setSubscriptionInfo(originalAuthState.subscriptionInfo);
        setIsBetaTester(originalAuthState.isBetaTester);
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
    subscriptionInfo,
    isEffectivelyAdmin,
    isMasquerading,
    masqueradeAs,
    isBetaTester,
    loginWithToken,
    logout,
    updateUserName,
    startMasquerade,
    stopMasquerade,
  }), [
    user, token, paidExamIds, isSubscribed, subscriptionInfo,
    isEffectivelyAdmin, isMasquerading, masqueradeAs, isBetaTester, loginWithToken,
    logout, updateUserName, startMasquerade, stopMasquerade
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
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