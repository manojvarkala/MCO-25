import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, RecommendedBook, Exam, ExamProductCategory, InProgressExamInfo } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx';
import { getTenantConfig } from '../services/apiConfig.ts';

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
  examPrices: { [key: string]: any } | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// This function processes a raw config object (either static or from the API)
// and prepares it for the application state.
const processConfigData = (configData: any) => {
    if (!configData || !configData.organizations) return null;
    const processedOrgs: Organization[] = JSON.parse(JSON.stringify(configData.organizations));
    const allPrices: { [key: string]: any } = {};
    let allBooks: RecommendedBook[] = [];

    processedOrgs.forEach((org: Organization) => {
        const bookMap = new Map<string, RecommendedBook>();
        (org.suggestedBooks || []).forEach(book => bookMap.set(book.id, book));
        if (org.suggestedBooks) allBooks.push(...org.suggestedBooks);
        
        const categoryUrlMap = new Map<string, string>();
        (org.examProductCategories || []).forEach((cat: ExamProductCategory) => {
            if (cat.questionSourceUrl) {
                if (cat.practiceExamId) categoryUrlMap.set(cat.practiceExamId, cat.questionSourceUrl);
                if (cat.certificationExamId) categoryUrlMap.set(cat.certificationExamId, cat.questionSourceUrl);
            }
        });

        org.exams = (org.exams || []).map((exam: Exam): Exam => {
            if (exam.productSku) {
                allPrices[exam.productSku] = {
                    price: exam.price,
                    regularPrice: exam.regularPrice,
                };
            }
            const recommendedBook = exam.recommendedBookId ? bookMap.get(exam.recommendedBookId) : undefined;
            const questionSourceUrl = categoryUrlMap.get(exam.id) || exam.questionSourceUrl;

            return { ...exam, questionSourceUrl, recommendedBook };
        });
    });

    return { 
        version: configData.version || '1.0.0',
        processedOrgs, 
        allPrices, 
        allBooks 
    };
};


export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { user } = useAuth();
  const [isWheelModalOpen, setWheelModalOpen] = useState(false);
  const [inProgressExam, setInProgressExam] = useState<InProgressExamInfo | null>(null);
  // FIX: Corrected syntax for useState generic type and initial value.
  const [examPrices, setExamPrices] = useState<{ [key: string]: any } | null>(null);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);

  const setProcessedConfig = (processedData: any) => {
    if (processedData) {
      setOrganizations(processedData.processedOrgs);
      setExamPrices(processedData.allPrices);
      setSuggestedBooks(processedData.allBooks);
      const newActiveOrg = processedData.processedOrgs[0] || null;
      setActiveOrg(newActiveOrg);
      if (newActiveOrg) {
          localStorage.setItem('activeOrgId', newActiveOrg.id);
      }
    }
  };

  useEffect(() => {
    const loadAppConfig = async () => {
        setIsInitializing(true);
        const tenantConfig = getTenantConfig();
        let activeConfig = null;

        // Stage 1: Attempt to load from cache for an instant UI update.
        try {
            const cachedConfigJSON = localStorage.getItem('appConfigCache');
            if (cachedConfigJSON) {
                const cachedConfig = JSON.parse(cachedConfigJSON);
                activeConfig = cachedConfig;
                const processedData = processConfigData(cachedConfig);
                setProcessedConfig(processedData);
            }
        } catch (e) {
            console.warn("Could not load cached config:", e);
            localStorage.removeItem('appConfigCache'); // Clear corrupted cache
        }

        // Stage 2: Always fetch the latest config from the API in the background.
        try {
            const response = await fetch(`${tenantConfig.apiBaseUrl}/wp-json/mco-app/v1/config`);
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            const liveConfig = await response.json();

            // Update state and cache only if the version is new or cache was empty.
            if (!activeConfig || activeConfig.version !== liveConfig.version) {
                localStorage.setItem('appConfigCache', JSON.stringify(liveConfig));
                const processedData = processConfigData(liveConfig);
                setProcessedConfig(processedData);

                if (activeConfig) { // Only toast on an update, not initial load
                    toast.success('Content and features have been updated!', { duration: 3000 });
                }
            }
        } catch (error) {
            console.error("Failed to fetch live config:", error);
            if (!activeConfig) { // Show error only if there's no cached data to run on
                toast.error("Could not load application configuration. Please check your connection.", { duration: 10000 });
            }
        } finally {
            setIsInitializing(false);
        }
    };
    loadAppConfig();
  }, []);


  // Effect 2: Check for in-progress exams when user logs in or active org changes.
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
        localStorage.setItem('activeOrgId', org.id);
    }
  }, [organizations]);

  const updateActiveOrg = useCallback((updatedOrg: Organization) => {
    const updatedOrganizations = organizations.map(org => org.id === updatedOrg.id ? updatedOrg : org);
    setOrganizations(updatedOrganizations);
    setActiveOrg(updatedOrg);
  }, [organizations]);

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
    inProgressExam,
    examPrices
  }), [
    organizations, activeOrg, isInitializing, setActiveOrgById,
    updateActiveOrg, suggestedBooks, isWheelModalOpen, setWheelModalOpen, inProgressExam, examPrices
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};