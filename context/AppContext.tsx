
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
  refreshConfig: () => Promise<void>;
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
        return text;
    }
};

const ensureArray = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') return Object.values(data);
    return [];
};

const getField = (obj: any, keys: string[], defaultValue: any = '') => {
    if (!obj) return defaultValue;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    }
    return defaultValue;
};

const processConfigData = (configData: any) => {
    if (!configData || !configData.organizations) return null;
    
    const rawOrgs = ensureArray<any>(configData.organizations);
    if (rawOrgs.length === 0) return null;

    let processedOrgs: Organization[] = [];
    let allSuggestedBooks: RecommendedBook[] = [];

    rawOrgs.forEach((rawOrg: any) => {
        if (!rawOrg) return;

        const categories = ensureArray<any>(rawOrg.examProductCategories).map(cat => ({
            ...cat,
            id: getField(cat, ['id', 'ID', 'term_id']).toString(),
            name: decodeHtmlEntities(getField(cat, ['name', 'post_title', 'title'])),
            description: decodeHtmlEntities(getField(cat, ['description', 'post_content', 'content'])),
            practiceExamId: getField(cat, ['practiceExamId', 'practice_exam_id'], '').toString(),
            certificationExamId: getField(cat, ['certificationExamId', 'certification_exam_id'], '').toString()
        }));

        const exams = ensureArray<any>(rawOrg.exams).map((exam: any) => {
            const rawId = getField(exam, ['id', 'ID', 'post_id']);
            if (!rawId) return null;
            const id = rawId.toString();
            
            const category = categories.find(c => c.certificationExamId === id || c.practiceExamId === id);
            const categoryUrl = category ? category.questionSourceUrl : undefined;

            return {
                ...exam,
                id,
                name: decodeHtmlEntities(getField(exam, ['name', 'post_title', 'title'])),
                description: decodeHtmlEntities(getField(exam, ['description', 'post_content', 'content'])),
                numberOfQuestions: parseInt(getField(exam, ['numberOfQuestions', 'number_of_questions', 'questions_count']), 10) || 0,
                durationMinutes: parseInt(getField(exam, ['durationMinutes', 'duration_minutes', 'duration']), 10) || 0,
                passScore: parseInt(getField(exam, ['passScore', 'pass_score']), 10) || 70,
                price: parseFloat(getField(exam, ['price'])) || 0,
                regularPrice: parseFloat(getField(exam, ['regularPrice', 'regular_price'])) || 0,
                isPractice: exam.isPractice ?? (category ? category.practiceExamId === id : false),
                productSku: getField(exam, ['productSku', 'product_sku', 'sku']),
                questionSourceUrl: getField(exam, ['questionSourceUrl', 'question_source_url'], categoryUrl)
            };
        }).filter(Boolean) as Exam[];

        const books = ensureArray<any>(rawOrg.suggestedBooks || []).map(book => ({
            ...book,
            id: getField(book, ['id', 'book_id']).toString(),
            title: decodeHtmlEntities(getField(book, ['title', 'post_title'])),
            description: decodeHtmlEntities(getField(book, ['description', 'post_content']))
        }));

        allSuggestedBooks = [...allSuggestedBooks, ...books];

        processedOrgs.push({
            ...rawOrg,
            id: getField(rawOrg, ['id', 'ID']).toString(),
            name: decodeHtmlEntities(getField(rawOrg, ['name', 'post_title'])),
            website: getField(rawOrg, ['website', 'url']),
            logo: getField(rawOrg, ['logo', 'logo_url', 'custom_logo_url']),
            exams,
            examProductCategories: categories,
            suggestedBooks: books,
            certificateTemplates: ensureArray<any>(rawOrg.certificateTemplates || [])
        });
    });

    return { 
        version: configData.version || Date.now().toString(),
        processedOrgs, 
        allSuggestedBooks
    };
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);
  const [hitCount, setHitCount] = useState<number | null>(null);
  const [examPrices, setExamPrices] = useState<{ [key: string]: any } | null>(null);
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveThemeState] = useState<string>('default');
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState<boolean>(true);
  const [bundlesEnabled, setBundlesEnabled] = useState<boolean>(true);
  const [feedbackRequiredForExam, setFeedbackRequiredForExamState] = useState<FeedbackContext | null>(null);
  
  const { user } = useAuth();
  
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

  const setProcessedConfig = (config: any, processedData: any) => {
    if (processedData && processedData.processedOrgs && processedData.processedOrgs.length > 0) {
      setOrganizations(processedData.processedOrgs);
      setExamPrices(config.examPrices || null);
      setSuggestedBooks(processedData.allSuggestedBooks);
      
      const newActiveOrg = processedData.processedOrgs.find(o => o.id === localStorage.getItem('activeOrgId')) || processedData.processedOrgs[0];
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
      return true;
    }
    return false;
  };

  const loadAppConfig = async (bypassCache: boolean = false) => {
    const tenantConfig: TenantConfig = getTenantConfig();
    const cacheKey = `appConfigCache_${tenantConfig.apiBaseUrl}`;
    
    if (!bypassCache) {
        try {
            const cachedConfigJSON = localStorage.getItem(cacheKey);
            if (cachedConfigJSON) {
                const cachedConfig = JSON.parse(cachedConfigJSON);
                const processedData = processConfigData(cachedConfig);
                if (processedData) {
                    setProcessedConfig(cachedConfig, processedData);
                }
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const response = await fetch(`${tenantConfig.apiBaseUrl}/wp-json/mco-app/v1/config`);
        if (response.ok) {
            const liveConfig = await response.json();
            const processedData = processConfigData(liveConfig);
            if (processedData) {
                const changed = setProcessedConfig(liveConfig, processedData);
                if (changed) {
                    localStorage.setItem(cacheKey, JSON.stringify(liveConfig));
                }
            }
        }
    } catch (apiError) {
        if (organizations.length === 0) {
            try {
                const response = await fetch(tenantConfig.staticConfigPath);
                if (response.ok) {
                    const staticConfig = await response.json();
                    const processedData = processConfigData(staticConfig);
                    if (processedData) setProcessedConfig(staticConfig, processedData);
                }
            } catch (staticError) {}
        }
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    loadAppConfig();
    googleSheetsService.recordSiteHit().then(data => {
        if (data && data.count) setHitCount(data.count);
    }).catch(() => {});
  }, []);

  const refreshConfig = async () => {
      setIsInitializing(true);
      await loadAppConfig(true);
  };

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
    }, [activeOrg?.id, organizations]);

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
    refreshConfig,
    setActiveOrgById,
    updateActiveOrg,
    updateConfigData,
    updateExamInOrg,
    inProgressExam: null,
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
    organizations, activeOrg, isInitializing, refreshConfig, setActiveOrgById,
    updateActiveOrg, updateConfigData, updateExamInOrg, examPrices, suggestedBooks,
    hitCount, availableThemes, activeTheme, subscriptionsEnabled, bundlesEnabled,
    feedbackRequiredForExam
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
