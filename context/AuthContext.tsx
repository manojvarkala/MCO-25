import React, { useState, useEffect, useCallback, useMemo, useContext, createContext, FC, ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { User, TokenPayload, RecommendedBook, Exam, ExamProductCategory } from '../types.ts';
import { googleSheetsService } from '../services/googleSheetsService.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  paidExamIds: string[];
  examPrices: { [id: string]: { price: number; regularPrice?: number; productId?: number; avgRating?: number; reviewCount?: number; } } | null;
  isSubscribed: boolean;
  spinsAvailable: number;
  wonPrize: { prizeId: string; prizeLabel: string; } | null;
  wheelModalDismissed: boolean;
  canSpinWheel: boolean;
  suggestedBooks: RecommendedBook[];
  dynamicExams: Exam[] | null;
  dynamicCategories: ExamProductCategory[] | null;
  isSpinWheelEnabled: boolean;
  loginWithToken: (token: string, isSyncOnly?: boolean) => Promise<void>;
  logout: () => void;
  useFreeAttempt: () => void;
  updateUserName: (name: string) => void;
  setWheelModalDismissed: (dismissed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [examPrices, setExamPrices] = useState<{ [id: string]: { price: number; regularPrice?: number; productId?: number; avgRating?: number; reviewCount?: number; } } | null>(() => {
    try {
        const storedPrices = localStorage.getItem('examPrices');
        return storedPrices ? JSON.parse(storedPrices) : null;
    } catch (error) {
        console.error("Failed to parse examPrices from localStorage", error);
        return null;
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
  const [spinsAvailable, setSpinsAvailable] = useState<number>(() => {
      try {
          const stored = localStorage.getItem('spinsAvailable');
          return stored ? JSON.parse(stored) : 0;
      } catch {
          return 0;
      }
  });
  const [wonPrize, setWonPrize] = useState<{ prizeId: string; prizeLabel: string; } | null>(() => {
    try {
        const stored = localStorage.getItem('wonPrize');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
  });
  const [wheelModalDismissed, setWheelModalDismissed] = useState<boolean>(() => {
      try {
        return sessionStorage.getItem('wheelModalDismissed') === 'true';
      } catch {
        return false;
      }
  });
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>(() => {
      try {
          const stored = localStorage.getItem('suggestedBooks');
          return stored ? JSON.parse(stored) : [];
      } catch {
          return [];
      }
  });
  const [dynamicExams, setDynamicExams] = useState<Exam[] | null>(() => {
    try {
        const stored = localStorage.getItem('dynamicExams');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
  });
  const [dynamicCategories, setDynamicCategories] = useState<ExamProductCategory[] | null>(() => {
      try {
          const stored = localStorage.getItem('dynamicCategories');
          return stored ? JSON.parse(stored) : null;
      } catch {
          return null;
      }
  });
  const [isSpinWheelEnabled, setIsSpinWheelEnabled] = useState<boolean>(() => {
      try {
          const stored = localStorage.getItem('isSpinWheelEnabled');
          return stored ? JSON.parse(stored) : false;
      } catch {
          return false;
      }
  });

  
  const canSpinWheel = useMemo(() => {
    if (!user || !isSpinWheelEnabled) return false;
    if (user.isAdmin) return true; // Admins can always spin for testing
    return spinsAvailable > 0;
  }, [user, spinsAvailable, isSpinWheelEnabled]);


  const logout = useCallback(() => {
    setUser(null);
    setPaidExamIds([]);
    setToken(null);
    setExamPrices(null);
    setIsSubscribed(false);
    setSpinsAvailable(0);
    setWonPrize(null);
    setSuggestedBooks([]);
    setDynamicExams(null);
    setDynamicCategories(null);
    setIsSpinWheelEnabled(false);
    localStorage.removeItem('examUser');
    localStorage.removeItem('paidExamIds');
    localStorage.removeItem('authToken');
    localStorage.removeItem('examPrices');
    localStorage.removeItem('isSubscribed');
    localStorage.removeItem('spinsAvailable');
    localStorage.removeItem('wonPrize');
    localStorage.removeItem('activeOrg');
    localStorage.removeItem('suggestedBooks');
    localStorage.removeItem('dynamicExams');
    localStorage.removeItem('dynamicCategories');
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
        
        if (payload.user && payload.paidExamIds) {
            setUser(payload.user);
            setPaidExamIds(payload.paidExamIds);
            setToken(jwtToken);
            localStorage.setItem('examUser', JSON.stringify(payload.user));
            localStorage.setItem('paidExamIds', JSON.stringify(payload.paidExamIds));
            localStorage.setItem('authToken', jwtToken);

            if (payload.examPrices) {
                setExamPrices(payload.examPrices);
                localStorage.setItem('examPrices', JSON.stringify(payload.examPrices));
            }

            if (payload.isSubscribed) {
                setIsSubscribed(payload.isSubscribed);
                localStorage.setItem('isSubscribed', JSON.stringify(payload.isSubscribed));
            } else {
                setIsSubscribed(false);
                localStorage.removeItem('isSubscribed');
            }
            
            if (payload.suggestedBooks) {
                setSuggestedBooks(payload.suggestedBooks);
                localStorage.setItem('suggestedBooks', JSON.stringify(payload.suggestedBooks));
            } else {
                setSuggestedBooks([]);
                localStorage.removeItem('suggestedBooks');
            }
            
            if (payload.exams && payload.examProductCategories) {
                setDynamicExams(payload.exams);
                setDynamicCategories(payload.examProductCategories);
                localStorage.setItem('dynamicExams', JSON.stringify(payload.exams));
                localStorage.setItem('dynamicCategories', JSON.stringify(payload.examProductCategories));
            } else {
                setDynamicExams(null);
                setDynamicCategories(null);
                localStorage.removeItem('dynamicExams');
                localStorage.removeItem('dynamicCategories');
            }

            const spins = payload.spinsAvailable ?? 0;
            setSpinsAvailable(spins);
            localStorage.setItem('spinsAvailable', JSON.stringify(spins));

            const spinWheelEnabled = payload.isSpinWheelEnabled ?? false;
            setIsSpinWheelEnabled(spinWheelEnabled);
            localStorage.setItem('isSpinWheelEnabled', JSON.stringify(spinWheelEnabled));

            if (payload.wonPrize) {
                setWonPrize(payload.wonPrize);
                localStorage.setItem('wonPrize', JSON.stringify(payload.wonPrize));
            } else {
                setWonPrize(null);
                localStorage.removeItem('wonPrize');
            }

            setWheelModalDismissed(false);
            sessionStorage.removeItem('wheelModalDismissed');

            try {
                await googleSheetsService.syncResults(payload.user, jwtToken);
                toast.success(isSyncOnly ? 'Exams synced successfully!' : 'Logged in successfully!');
            } catch (syncError: any) {
                console.error("Background sync on login failed:", syncError.message);
                const successPart = isSyncOnly ? 'Exams synhronized.' : 'Login successful.';
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

  const useFreeAttempt = useCallback(() => {
    console.log('User has started a free practice attempt.');
  }, []);

  const updateUserName = useCallback((name: string) => {
    if (user) {
      const updatedUser = { ...user, name };
      setUser(updatedUser);
      localStorage.setItem('examUser', JSON.stringify(updatedUser));
    }
  }, [user]);
  
  const updateWheelModalDismissed = useCallback((dismissed: boolean) => {
    setWheelModalDismissed(dismissed);
    try {
        sessionStorage.setItem('wheelModalDismissed', String(dismissed));
    } catch (e) {
        console.error("Could not set sessionStorage item.", e);
    }
  }, []);


  const value = useMemo(() => ({
    user,
    token,
    paidExamIds,
    examPrices,
    isSubscribed,
    spinsAvailable,
    wonPrize,
    wheelModalDismissed,
    canSpinWheel,
    suggestedBooks,
    dynamicExams,
    dynamicCategories,
    isSpinWheelEnabled,
    loginWithToken,
    logout,
    useFreeAttempt,
    updateUserName,
    setWheelModalDismissed: updateWheelModalDismissed
  }), [
    user, token, paidExamIds, examPrices, isSubscribed,
    spinsAvailable, wonPrize, wheelModalDismissed, canSpinWheel,
    suggestedBooks, dynamicExams, dynamicCategories, isSpinWheelEnabled, loginWithToken,
    logout, useFreeAttempt, updateUserName, updateWheelModalDismissed
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