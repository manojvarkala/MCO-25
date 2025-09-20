
import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, RecommendedBook, Exam, ExamProductCategory, InProgressExamInfo } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx';
import { getAppConfigPath, getApiBaseUrl } from '../services/apiConfig.ts';
import { googleSheetsService } from '../services/googleSheetsService.ts';

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

    return { processedOrgs, allPrices, allBooks };
};


export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { user } = useAuth();
  const [isWheelModalOpen, setWheelModalOpen] = useState(false);
  const [inProgressExam, setInProgressExam] = useState<InProgressExamInfo | null>(null);
  const [examPrices, setExamPrices] = useState<{ [key: string]: any } | null>(null);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);

  useEffect(() => {
    const initializeAndSyncConfig = async () => {
        setIsInitializing(true);
        let configToProcess: any | null = null;
        let localVersion = "0";
        const configCacheKey = `mco_app_config_${getApiBaseUrl()}`;

        // Step 1: Try loading from localStorage cache first for speed.
        try {
            const cachedConfig = localStorage.getItem(configCacheKey);
            if (cachedConfig) {
                configToProcess = JSON.parse(cachedConfig);
                localVersion = configToProcess.version || "0";
            }
        } catch (e) {
            console.error("Failed to parse cached config:", e);
        }

        // Step 2: If no cache, load the bundled static file as a fallback.
        if (!configToProcess) {
            try {
                const configPath = getAppConfigPath();
                const response = await fetch(configPath);
                if (!response.ok) throw new Error(`Could not fetch static config from ${configPath}.`);
                configToProcess = await response.json();
                localVersion = configToProcess.version || "0";
            } catch (error: any) {
                toast.error(error.message || "Could not load initial app configuration.");
                setIsInitializing(false);
                return;
            }
        }
        
        // At this point, we have some config to show, so we can process it and stop initializing.
        const processedInitialData = processConfigData(configToProcess);
        if (processedInitialData) {
            setOrganizations(processedInitialData.processedOrgs);
            setExamPrices(processedInitialData.allPrices);
            setSuggestedBooks(processedInitialData.allBooks);
            const currentOrgId = localStorage.getItem('activeOrgId') || processedInitialData.processedOrgs[0]?.id;
            const newActiveOrg = processedInitialData.processedOrgs.find((o: Organization) => o.id === currentOrgId) || processedInitialData.processedOrgs[0] || null;
            setActiveOrg(newActiveOrg);
        }
        setIsInitializing(false);

        // Step 3: Fetch the latest config from the live API and update if it's newer.
        try {
            const liveConfig = await googleSheetsService.apiFetch('app_config', null); // Public endpoint
            if (liveConfig && liveConfig.version && liveConfig.version > localVersion) {
                const processedLiveData = processConfigData(liveConfig);
                if (processedLiveData) {
                    setOrganizations(processedLiveData.processedOrgs);
                    setExamPrices(processedLiveData.allPrices);
                    setSuggestedBooks(processedLiveData.allBooks);
                    const currentOrgId = localStorage.getItem('activeOrgId') || processedLiveData.processedOrgs[0]?.id;
                    const newActiveOrg = processedLiveData.processedOrgs.find((o: Organization) => o.id === currentOrgId) || processedLiveData.processedOrgs[0] || null;
                    setActiveOrg(newActiveOrg);
                    localStorage.setItem(configCacheKey, JSON.stringify(liveConfig));
                    console.log("App content updated to latest version from server.");
                }
            }
        } catch (error) {
            console.warn("Could not sync with live server, using cached/local data.", error);
        }
    };

    initializeAndSyncConfig();
  }, []);


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
        localStorage.setItem('activeOrgId', org.id); // Store only ID now
    }
  }, [organizations]);

  const updateActiveOrg = useCallback((updatedOrg: Organization) => {
    // This is now primarily for client-side edits in the Admin panel.
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
