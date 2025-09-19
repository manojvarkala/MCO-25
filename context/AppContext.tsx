import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, RecommendedBook, Exam, ExamProductCategory, InProgressExamInfo } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx';
import { getApiEndpoint } from '../services/apiConfig.ts';

interface AppContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  isInitializing: boolean;
  setActiveOrgById: (orgId: string) => void;
  updateActiveOrg: (updatedOrg: Organization) => void;
  suggestedBooks: RecommendedBook[];
  isWheelModalOpen: boolean;
  setWheelModalOpen: (isOpen: boolean) => void;
  inProgressExam: InProgressExamInfo | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(() => {
    try {
        const storedOrg = localStorage.getItem('activeOrg');
        return storedOrg ? JSON.parse(storedOrg) : null;
    } catch (e) {
        console.error("Failed to parse activeOrg from localStorage", e);
        return null;
    }
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const { user, examPrices } = useAuth();
  const [isWheelModalOpen, setWheelModalOpen] = useState(false);
  const [inProgressExam, setInProgressExam] = useState<InProgressExamInfo | null>(null);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);

  useEffect(() => {
    const initializeApp = async () => {
        setIsInitializing(true);
        try {
            // FIX: Load configuration from a local static file instead of a remote API
            // to ensure the app can run in a standalone environment.
            const response = await fetch('/medical-coding-config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! Could not fetch app configuration. Status: ${response.status}`);
            }
            const configData = await response.json();
            
            const baseOrgs = JSON.parse(JSON.stringify(configData.organizations || []));
            
            const processedOrgs = baseOrgs.map((org: Organization) => {
                const examsSource = org.exams;
                const categoriesSource = org.examProductCategories;
                const booksSource = org.suggestedBooks || [];
                
                setSuggestedBooks(booksSource);

                const bookMap = new Map<string, RecommendedBook>();
                booksSource.forEach(book => bookMap.set(book.id, book));
                
                const processedExams = examsSource.map((exam: Exam): Exam => {
                    const priceData = examPrices && exam.productSku ? examPrices[exam.productSku] : null;
                    const recommendedBook = exam.recommendedBookId ? bookMap.get(exam.recommendedBookId) : undefined;
                    
                    return {
                        ...exam,
                        ...(priceData && { price: priceData.price, regularPrice: priceData.regularPrice }),
                        ...(recommendedBook && { recommendedBook }),
                    };
                });
                
                return { 
                    ...org, 
                    exams: processedExams, 
                    examProductCategories: categoriesSource,
                    suggestedBooks: booksSource 
                };
            });
            
            setOrganizations(processedOrgs);

            const currentActiveOrgId = activeOrg?.id;
            const newActiveOrg = currentActiveOrgId
              ? processedOrgs.find(o => o.id === currentActiveOrgId)
              : (processedOrgs[0] || null);
            
            if (newActiveOrg) {
              setActiveOrg(newActiveOrg);
              localStorage.setItem('activeOrg', JSON.stringify(newActiveOrg));
            } else {
              setActiveOrg(null);
              localStorage.removeItem('activeOrg');
            }

        } catch (error) {
            console.error("Failed to initialize app config:", error);
            toast.error("Could not load application configuration.");
        } finally {
            setIsInitializing(false);
        }
    };

    initializeApp();
  }, [examPrices]);

  // Effect to detect in-progress exams
  useEffect(() => {
    if (!user || !activeOrg) {
        setInProgressExam(null);
        return;
    }
    
    let foundExam: InProgressExamInfo | null = null;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`exam_progress_`) && key.endsWith(`_${user.id}`)) {
                const examId = key.split('_')[2];
                const examDetails = activeOrg.exams.find(e => e.id === examId);
                if (examDetails) {
                    foundExam = { examId: examDetails.id, examName: examDetails.name };
                    break; 
                }
            }
        }
    } catch (error) {
        console.error("Failed to check for in-progress exams:", error);
    }
    setInProgressExam(foundExam);

  }, [user, activeOrg]);


  const setActiveOrgById = useCallback((orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
        setActiveOrg(org);
        localStorage.setItem('activeOrg', JSON.stringify(org));
    }
  }, [organizations]);

  const updateActiveOrg = useCallback((updatedOrg: Organization) => {
    setOrganizations(prevOrgs => 
        prevOrgs.map(org => org.id === updatedOrg.id ? updatedOrg : org)
    );
    setActiveOrg(updatedOrg);
    localStorage.setItem('activeOrg', JSON.stringify(updatedOrg));
  }, []);

  const value = useMemo(() => ({
    organizations,
    activeOrg,
    isLoading: isInitializing,
    isInitializing,
    setActiveOrgById,
    updateActiveOrg,
    suggestedBooks,
    isWheelModalOpen,
    setWheelModalOpen,
    inProgressExam
  }), [
    organizations, activeOrg, isInitializing, setActiveOrgById,
    updateActiveOrg, suggestedBooks, isWheelModalOpen, setWheelModalOpen, inProgressExam
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
