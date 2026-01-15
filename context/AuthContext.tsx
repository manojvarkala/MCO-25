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
  refreshEntitlements: () => Promise<void>;
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
        return text;
    }
};

const normalizePaidIds = (raw: any): string[] => {
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const items = Array.isArray(parsed) ? parsed : Object.values(parsed);
    return items.filter(i => typeof i === 'string' || typeof i === 'number').map(i => i.toString());
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
        const storedUser = localStorage.getItem('examUser');
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });
  const [paidExamIds, setPaidExamIds] = useState<string[]>(() => {
      try {
        const storedIds = localStorage.getItem('paidExamIds');
        return normalizePaidIds(storedIds);
      } catch (error) {
          return [];
      }
  });
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    try {
        const storedSubscribed = localStorage.getItem('isSubscribed');
        return storedSubscribed ? JSON.parse(storedSubscribed) : false;
    } catch (error) {
        return false;
    }
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(() => {
    try {
        const storedInfo = localStorage.getItem('subscriptionInfo');
        return storedInfo ? JSON.parse(storedInfo) : null;
    } catch (error) {
        return null;
    }
  });
  const [isBetaTester, setIsBetaTester] = useState<boolean>(() => {
    try {
        const stored = localStorage.getItem('isBetaTester');
        return stored ? JSON.parse(stored) : false;
    } catch (error) {
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
    
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('exam_timer_') || key.startsWith('exam_results_') || key.startsWith('appConfigCache')) {
            localStorage.removeItem(key);
        }
    });
  }, []);

  const refreshEntitlements = useCallback(async () => {
    if (!token) return;
    try {
        const data = await googleSheetsService.syncEntitlements(token);
        const normalizedIds = normalizePaidIds(data.paidExamIds);
        
        setPaidExamIds(normalizedIds);
        setIsSubscribed(!!data.isSubscribed);
        setSubscriptionInfo(data.subscriptionInfo);
        setIsBetaTester(!!data.isBetaTester);
        
        localStorage.setItem('paidExamIds', JSON.stringify(normalizedIds));
        localStorage.setItem('isSubscribed', JSON.stringify(!!data.isSubscribed));
        localStorage.setItem('subscriptionInfo', JSON.stringify(data.subscriptionInfo));
        localStorage.setItem('isBetaTester', JSON.stringify(!!data.isBetaTester));
    } catch (e) {
        console.error("Failed to refresh entitlements", e);
        throw e;
    }
  }, [token]);

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
            if (!isSyncOnly) {
                await googleSheetsService.syncResults(payload.user, jwtToken).catch(console.warn);
            }

            const normalizedIds = normalizePaidIds(payload.paidExamIds);

            setUser(payload.user);
            setPaidExamIds(normalizedIds);
            setToken(jwtToken);
            setMasqueradeAs('none');
            setOriginalAuthState(null);
            
            localStorage.setItem('examUser', JSON.stringify(payload.user));
            localStorage.setItem('paidExamIds', JSON.stringify(normalizedIds));
            localStorage.setItem('authToken', jwtToken);
            setIsBetaTester(!!payload.isBetaTester);
            localStorage.setItem('isBetaTester', payload.isBetaTester ? 'true' : 'false');

            setIsSubscribed(!!payload.isSubscribed);
            localStorage.setItem('isSubscribed', payload.isSubscribed ? 'true' : 'false');

            setSubscriptionInfo(payload.subscriptionInfo || null);
            if (payload.subscriptionInfo) localStorage.setItem('subscriptionInfo', JSON.stringify(payload.subscriptionInfo));
            else localStorage.removeItem('subscriptionInfo');
            
            if (isSyncOnly) toast.success('Exams synchronized successfully!');
        } else {
            throw new Error("Invalid token payload structure.");
        }
    } catch(e) {
        if (!isSyncOnly) logout();
        throw e;
    }
  }, [logout]);
  
    const startMasquerade = (as: 'user' | 'visitor') => {
        if (masqueradeAs !== 'none' || !user?.isAdmin) return;
        setOriginalAuthState({ user, token, paidExamIds, isSubscribed, subscriptionInfo, isBetaTester });
        setMasqueradeAs(as);
    };

    const stopMasquerade = () => {
        if (masqueradeAs === 'none' || !originalAuthState) return;
        setUser(originalAuthState.user); setToken(originalAuthState.token);
        setPaidExamIds(originalAuthState.paidExamIds); setIsSubscribed(originalAuthState.isSubscribed);
        setSubscriptionInfo(originalAuthState.subscriptionInfo); setIsBetaTester(originalAuthState.isBetaTester);
        setOriginalAuthState(null); setMasqueradeAs('none');
    };

  const updateUserName = useCallback((name: string) => {
    if (user) {
      const updatedUser = { ...user, name };
      setUser(updatedUser);
      localStorage.setItem('examUser', JSON.stringify(updatedUser));
    }
  }, [user]);

  const value = useMemo(() => ({
    user, token, paidExamIds, isSubscribed, subscriptionInfo, isEffectivelyAdmin,
    isMasquerading: masqueradeAs !== 'none', masqueradeAs, isBetaTester,
    loginWithToken, logout, refreshEntitlements, updateUserName, startMasquerade, stopMasquerade,
  }), [user, token, paidExamIds, isSubscribed, subscriptionInfo, isEffectivelyAdmin, masqueradeAs, isBetaTester, loginWithToken, logout, refreshEntitlements, updateUserName, startMasquerade, stopMasquerade]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};