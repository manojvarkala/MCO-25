
import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, Exam, ExamProductCategory, InProgressExamInfo, RecommendedBook, Theme, FeedbackContext } from '../types.ts';
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
  feedbackRequiredForExam: FeedbackContext | null;
  setFeedbackRequiredForExam: (context: FeedbackContext) => void;
  clearFeedbackRequired: () => void;
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

const ensureArray = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') return Object.values(data);
    return [];
};

const processConfigData = (configData: any) => {
    if (!configData || !configData.organizations || !Array.isArray(configData.organizations) || configData.organizations.length === 0) return null;
    
    let processedOrgs: Organization[] = [];
    try {
        processedOrgs = JSON.parse(JSON.stringify(configData.organizations));
    } catch (e) {
        console.error("Error parsing config organizations", e);
        return null;
    }

    let allSuggestedBooks: RecommendedBook[] = [];

    processedOrgs.forEach((org: Organization) => {
        if (!org) return;
        org.name = decodeHtmlEntities(org.name);
        
        const categories = ensureArray<ExamProductCategory>(org.examProductCategories);
        categories.forEach((cat) => {
            if (!cat) return;
            cat.name = decodeHtmlEntities(cat.name);
            cat.description = decodeHtmlEntities(cat.description);
        });
        org.examProductCategories = categories;

        const rawExams = ensureArray<Exam>(org.exams);
        org.exams = rawExams.map((exam: Exam): Exam | null => {
            if (!exam || !exam.id) return null;
            const category = categories.find(c => c && (c.certificationExamId === exam.id || c.practiceExamId === exam.id));
            const categoryUrl = category ? category.questionSourceUrl : undefined;

            return {
                ...exam,
                name: decodeHtmlEntities(exam.name),
                description: decodeHtmlEntities(exam.description),
                questionSourceUrl: exam.questionSourceUrl || categoryUrl,
            };
        }).filter(Boolean) as Exam[];

        if (org.suggestedBooks) {
            const books = ensureArray<RecommendedBook>(org.suggestedBooks);
            books.forEach(book => {
                if (!book) return;
                book.title = decodeHtmlEntities(book.title);
                book.description = decodeHtmlEntities(book.description);
            });
            org.suggestedBooks = books;
            allSuggestedBooks = [...allSuggestedBooks, ...books];
        } else {
            org.suggestedBooks = [];
        }

        const templates = ensureArray<any>(org.certificateTemplates);
        templates.forEach(template => {
            if (!template) return;
            template.name = decodeHtmlEntities(template.name);
            template.title = decodeHtmlEntities(template.title);
            template.body = decodeHtmlEntities(template.body);
            template.signature1Name = decodeHtmlEntities(template.signature1Name);
            template.signature1Title = decodeHtmlEntities(template.signature1Title);
            template.signature2Name = decodeHtmlEntities(template.signature2Name);
            template.signature2Title = decodeHtmlEntities(template.signature2Title);
        });
        org.certificateTemplates = templates;
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

  const [feedbackRequiredForExam, setFeedbackRequiredForExamState] = useState<FeedbackContext | null>(null);
  
  const setActiveTheme = (themeId: string) => {
      setActiveThemeState(themeId);
      try {
          localStorage.setItem('mco_active_theme', themeId);
      } catch(e) {}
  };

  const setFeedbackRequiredForExam = (context: FeedbackContext) => {
    setFeedbackRequiredForExamState(context);
    localStorage.setItem('feedbackRequiredForExam', JSON.stringify(context));
  };
  const clearFeedbackRequired = () => {
    setFeedbackRequiredForExamState(null);
    localStorage.removeItem('feedbackRequiredForExam');
  };
  
  const [hitCount, setHitCount] = useState<number | null>(null);

  const setProcessedConfig = (config: any, processedData: any) => {
    if (processedData && processedData.processedOrgs && processedData.processedOrgs.length > 0) {
      setOrganizations(processedData.processedOrgs);
      setExamPrices(config.examPrices || null);
      setSuggestedBooks(processedData.allSuggestedBooks);
      
      const newActiveOrg = processedData.processedOrgs[0];
      setActiveOrg(newActiveOrg);

      if (newActiveOrg) {
          localStorage.setItem('activeOrgId', newActiveOrg.id);
          const themes = ensureArray<Theme>(newActiveOrg.availableThemes);
          setAvailableThemes(themes);
          
          setSubscriptionsEnabled(newActiveOrg.subscriptionsEnabled ?? true);
          setBundlesEnabled(newActiveOrg.bundlesEnabled ?? true);

          const savedTheme = localStorage.getItem('mco_active_theme');
          const defaultTheme = newActiveOrg.activeThemeId || 'default';
          setActiveThemeState(savedTheme || defaultTheme);
      }
    } else {
        console.error("setProcessedConfig called with invalid or empty data");
    }
  };

  useEffect(() => {
    const loadAppConfig = async () => {
        setIsInitializing(true);
        const tenantConfig: TenantConfig = getTenantConfig();
        const cacheKey = `appConfigCache_${tenantConfig.apiBaseUrl}`;
        let activeConfig = null;
        let loadedFromCache = false;

        try {
            const cachedConfigJSON = localStorage.getItem(cacheKey);
            if (cachedConfigJSON) {
                const cachedConfig = JSON.parse(cachedConfigJSON);
                const processedData = processConfigData(cachedConfig);
                if (processedData) {
                    activeConfig = cachedConfig;
                    setProcessedConfig(cachedConfig, processedData);
                    loadedFromCache = true;
                }
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }

        try {
            const response = await fetch(`${tenantConfig.apiBaseUrl}/wp-json/mco-app/v1/config`);
            if (!response.ok) throw new Error(`Server returned status ${response.status}`);
            
            const liveConfig = await response.json();
            const processedData = processConfigData(liveConfig);
            
            if (processedData) {
                if (!activeConfig || activeConfig.version !== liveConfig.version) {
                    localStorage.setItem(cacheKey, JSON.stringify(liveConfig));
                    setProcessedConfig(liveConfig, processedData);
                    if (activeConfig) toast.success('Content updated!');
                }
                setIsInitializing(false);
                return;
            }
        } catch (apiError) {
            if (loadedFromCache) {
                setIsInitializing(false); 
                return;
            }
        }

        try {
            const response = await fetch(tenantConfig.staticConfigPath);
            if (response.ok) {
                const staticConfig = await response.json();
                const processedData = processConfigData(staticConfig);
                if (processedData) {
                    setProcessedConfig(staticConfig, processedData);
                }
            }
        } catch (staticError) {} finally {
            setIsInitializing(false);
        }
    };
    loadAppConfig();
  }, []);

  useEffect(() => {
    const hitCountedInSession = sessionStorage.getItem('mco_hit_counted');
    if (!hitCountedInSession) {
        const recordHit = async () => {
            try {
                const data = await googleSheetsService.recordSiteHit();
                if (data && data.count) {
                    setHitCount(data.count);
                    sessionStorage.setItem('mco_hit_counted', 'true');
                }
            } catch (error) {}
        };
        recordHit();
    }
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
                const examDetails = ensureArray<Exam>(activeOrg.exams).find(e => e.id === examId);
                if (examDetails) {
                    foundExam = { examId: examDetails.id, examName: examDetails.name };
                    break; 
                }
            }
        }
    } catch (error) {}
    setInProgressExam(foundExam);
  }, [user, activeOrg]);

  useEffect(() => {
    const storedFeedback = localStorage.getItem('feedbackRequiredForExam');
    if (storedFeedback) {
        try {
            setFeedbackRequiredForExamState(JSON.parse(storedFeedback));
        } catch (e) {
            localStorage.removeItem('feedbackRequiredForExam');
        }
    }
  }, []);


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
        const exams = ensureArray<Exam>(prevOrg.exams);
        const newExams = exams.map(exam => 
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
    feedbackRequiredForExam,
    setFeedbackRequiredForExam,
    clearFeedbackRequired,
  }), [
    organizations, activeOrg, isInitializing, setActiveOrgById,
    updateActiveOrg, updateConfigData, updateExamInOrg, inProgressExam, examPrices, suggestedBooks,
    hitCount, availableThemes, activeTheme, setActiveTheme, subscriptionsEnabled, bundlesEnabled,
    feedbackRequiredForExam, setFeedbackRequiredForExam, clearFeedbackRequired
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
