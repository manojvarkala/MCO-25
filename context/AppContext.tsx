import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, Exam, ExamProductCategory, InProgressExamInfo, RecommendedBook, Theme } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx';
import { getTenantConfig, TenantConfig } from '../services/apiConfig.ts';
import { googleSheetsService } from '../services/googleSheetsService.ts';

interface AppContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  isInitializing: boolean;
  setActiveOrgById: (orgId: string) => void;
  updateActiveOrg: (updatedOrg: Organization) => void;
  updateConfigData: (organizations: Organization[], examPrices: any) => void;
  updateExamInOrg: (examId: string, updatedExamData: Partial<Exam>) => void;
  inProgressExam: InProgressExamInfo | null;
  examPrices: { [key: string]: any } | null;
  suggestedBooks: RecommendedBook[];
  hitCount: number | null;
  availableThemes: Theme[];
  activeTheme: string;
  setActiveTheme: (themeId: string) => void;
  subscriptionsEnabled: boolean;
  bundlesEnabled: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

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


// This function processes a raw config object (either static or from the API)
// and prepares it for the application state by decoding entities and mapping data.
const processConfigData = (configData: any) => {
    if (!configData || !configData.organizations) return null;
    const processedOrgs: Organization[] = JSON.parse(JSON.stringify(configData.organizations));
    let allSuggestedBooks: RecommendedBook[] = [];

    processedOrgs.forEach((org: Organization) => {
        org.name = decodeHtmlEntities(org.name);
        
        const categoryUrlMap = new Map<string, string>();
        (org.examProductCategories || []).forEach((cat: ExamProductCategory) => {
            cat.name = decodeHtmlEntities(cat.name);
            cat.description = decodeHtmlEntities(cat.description);
            if (cat.questionSourceUrl) {
                if (cat.practiceExamId) categoryUrlMap.set(cat.practiceExamId, cat.questionSourceUrl);
                if (cat.certificationExamId) categoryUrlMap.set(cat.certificationExamId, cat.questionSourceUrl);
            }
        });

        org.exams = (org.exams || []).map((exam: Exam): Exam => {
            exam.name = decodeHtmlEntities(exam.name);
            exam.description = decodeHtmlEntities(exam.description);
            const questionSourceUrl = categoryUrlMap.get(exam.id) || exam.questionSourceUrl;

            return { ...exam, questionSourceUrl };
        });

        if (org.suggestedBooks) {
            org.suggestedBooks.forEach(book => {
                book.title = decodeHtmlEntities(book.title);
                book.description = decodeHtmlEntities(book.description);
            });
            allSuggestedBooks = [...allSuggestedBooks, ...org.suggestedBooks];
        }

        (org.certificateTemplates || []).forEach(template => {
            template.name = decodeHtmlEntities(template.name);
            template.title = decodeHtmlEntities(template.title);
            template.body = decodeHtmlEntities(template.body);
            template.signature1Name = decodeHtmlEntities(template.signature1Name);
            template.signature1Title = decodeHtmlEntities(template.signature1Title);
            template.signature2Name = decodeHtmlEntities(template.signature2Name);
            template.signature2Title = decodeHtmlEntities(template.signature2Title);
        });
    });

    return { 
        version: configData.version || '1.0.0',
        processedOrgs, 
        allSuggestedBooks
    };
};


export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);
  
  const { user } = useAuth();
  const [inProgressExam, setInProgressExam] = useState<InProgressExamInfo | null>(null);
  const [examPrices, setExamPrices] = useState<{ [key: string]: any } | null>(null);
  
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveThemeState] = useState<string>('default');
  
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState<boolean>(true);
  const [bundlesEnabled, setBundlesEnabled] = useState<boolean>(true);

  const setActiveTheme = (themeId: string) => {
      setActiveThemeState(themeId);
      try {
          localStorage.setItem('mco_active_theme', themeId);
      } catch(e) { console.error("Could not save theme to local storage", e); }
  };

  
  const [hitCount, setHitCount] = useState<number | null>(() => {
    try {
        const storedCount = sessionStorage.getItem('mco_site_hit_count');
        return storedCount ? parseInt(storedCount, 10) : null;
    } catch {
        return null;
    }
  });

  const setProcessedConfig = (config: any, processedData: any) => {
    if (processedData) {
      setOrganizations(processedData.processedOrgs);
      setExamPrices(config.examPrices || null);
      setSuggestedBooks(processedData.allSuggestedBooks);
      
      const newActiveOrg = processedData.processedOrgs[0] || null;
      setActiveOrg(newActiveOrg);

      if (newActiveOrg) {
          localStorage.setItem('activeOrgId', newActiveOrg.id);
          setAvailableThemes(newActiveOrg.availableThemes || []);
          
          setSubscriptionsEnabled(newActiveOrg.subscriptionsEnabled ?? true);
          setBundlesEnabled(newActiveOrg.bundlesEnabled ?? true);

          const savedTheme = localStorage.getItem('mco_active_theme');
          const defaultTheme = newActiveOrg.activeThemeId || 'default';
          setActiveThemeState(savedTheme || defaultTheme);
      }
    }
  };

  useEffect(() => {
    const loadAppConfig = async () => {
        setIsInitializing(true);
        const tenantConfig: TenantConfig = getTenantConfig();
        const cacheKey = `appConfigCache_${tenantConfig.apiBaseUrl}`;
        let activeConfig = null;
        let loadedFromCache = false;

        // Stage 1: Attempt to load from tenant-specific cache for an instant UI update.
        try {
            const cachedConfigJSON = localStorage.getItem(cacheKey);
            if (cachedConfigJSON) {
                const cachedConfig = JSON.parse(cachedConfigJSON);
                activeConfig = cachedConfig;
                const processedData = processConfigData(cachedConfig);
                setProcessedConfig(cachedConfig, processedData);
                loadedFromCache = true;
            }
        } catch (e) {
            console.warn("Could not load cached config:", e);
            localStorage.removeItem(cacheKey);
        }

        // Stage 2: Always try fetching the latest config from the API.
        try {
            const response = await fetch(`${tenantConfig.apiBaseUrl}/wp-json/mco-app/v1/config`);
            if (!response.ok) throw new Error(`Server returned status ${response.status}`);
            
            const liveConfig = await response.json();
            
            if (!activeConfig || activeConfig.version !== liveConfig.version) {
                localStorage.setItem(cacheKey, JSON.stringify(liveConfig));
                const processedData = processConfigData(liveConfig);
                setProcessedConfig(liveConfig, processedData);
                if (activeConfig) toast.success('Content and features have been updated!', { duration: 3000 });
            }
            setIsInitializing(false); // Success, we're done.
            return;
        } catch (apiError) {
            console.error("Failed to fetch live config:", apiError);
            if (loadedFromCache) {
                setIsInitializing(false); // We have cached data, so we can stop initializing.
                return;
            }
        }

        // Stage 3: API failed and no cache. Try loading static fallback file.
        try {
            toast.error("Could not connect to the server. Displaying default content which may be outdated.", { duration: 6000 });
            const response = await fetch(tenantConfig.staticConfigPath);
            if (!response.ok) throw new Error(`Static config file not found: ${response.status}`);
            const staticConfig = await response.json();
            const processedData = processConfigData(staticConfig);
            setProcessedConfig(staticConfig, processedData);
        } catch (staticError) {
            console.error("Failed to fetch static config:", staticError);
            toast.error("Could not load application configuration. Please check your connection and try again.", { duration: 10000 });
        } finally {
            setIsInitializing(false);
        }
    };
    loadAppConfig();
  }, []);

  // Effect to record a site hit once per session.
  useEffect(() => {
    const hitCountedInSession = sessionStorage.getItem('mco_hit_counted');

    // The goal is to show the hit counter for everyone, but only increment it once per session.
    // The previous logic prevented admins from seeing the count at all in a new session.
    // This revised logic ensures the count is fetched for everyone on a new session.
    // This will increment the counter for admins on their first hit of a session, which is an acceptable trade-off for UI consistency.
    if (!hitCountedInSession) {
        const recordHit = async () => {
            try {
                const data = await googleSheetsService.recordSiteHit();
                if (data && data.count) {
                    const newCount = data.count;
                    setHitCount(newCount);
                    
                    // Mark that a hit has been recorded for this session for EVERYONE.
                    // This prevents admins from incrementing the counter on every page navigation within the same session.
                    sessionStorage.setItem('mco_hit_counted', 'true');
                    sessionStorage.setItem('mco_site_hit_count', newCount.toString());
                }
            } catch (error) {
                console.error("Could not record or fetch site hit:", error);
            }
        };

        recordHit();
    }
  }, []); // Run only once on initial app mount.


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
  
  const updateConfigData = useCallback((newOrganizations: Organization[], newExamPrices: any) => {
        setOrganizations(newOrganizations);
        setExamPrices(newExamPrices);
        const newActiveOrg = newOrganizations.find(o => o.id === activeOrg?.id) || newOrganizations[0] || null;
        if (newActiveOrg) {
            setActiveOrg(newActiveOrg);
        }
    }, [activeOrg?.id]);

  const updateExamInOrg = useCallback((examId: string, updatedExamData: Partial<Exam>) => {
    setActiveOrg(prevOrg => {
        if (!prevOrg) return null;
        const newExams = prevOrg.exams.map(exam => 
            exam.id === examId ? { ...exam, ...updatedExamData } : exam
        );
        return { ...prevOrg, exams: newExams };
    });
  }, []);

  const value = useMemo(() => ({
    organizations,
    activeOrg,
    isLoading: isInitializing,
    isInitializing,
    setActiveOrgById,
    updateActiveOrg,
    updateConfigData,
    updateExamInOrg,
    inProgressExam,
    examPrices,
    suggestedBooks,
    hitCount,
    availableThemes,
    activeTheme,
    setActiveTheme,
    subscriptionsEnabled,
    bundlesEnabled,
  }), [
    organizations, activeOrg, isInitializing, setActiveOrgById,
    updateActiveOrg, updateConfigData, updateExamInOrg, inProgressExam, examPrices, suggestedBooks,
    hitCount, availableThemes, activeTheme, setActiveTheme, subscriptionsEnabled, bundlesEnabled
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};