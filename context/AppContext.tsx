import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, Exam, ExamProductCategory, InProgressExamInfo, RecommendedBook, Theme, FeedbackContext, AppContextType } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx';
import { getTenantConfig, TenantConfig } from '../services/apiConfig.ts';
import { googleSheetsService } from '../services/googleSheetsService.ts';

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
            certificationExamId: getField(cat, ['certificationExamId', 'certification_exam_id'], '').toString(),
            questionSourceUrl: getField(cat, ['questionSourceUrl', 'question_source_url'], '')
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
            description: decodeHtmlEntities(getField(book, ['description', 'post_content'])),
            affiliateLinks: getField(book, ['affiliateLinks'], { com: '', in: '', ae: '' })
        }));

        allSuggestedBooks = [...allSuggestedBooks, ...books];

        processedOrgs.push({
            ...rawOrg,
            id: getField(rawOrg, ['id', 'ID']).toString(),
            name: decodeHtmlEntities(getField(rawOrg, ['name', 'post_title'])),
            website: getField(rawOrg, ['website', 'url']),
            logoUrl: getField(rawOrg, ['logoUrl', 'logo', 'logo_url', 'custom_logo_url']), 
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
  const [purchaseNotifierEnabled, setPurchaseNotifierEnabled] = useState<boolean>(true);
  const [purchaseNotifierDelay, setPurchaseNotifierDelay] = useState<number>(7);
  const [purchaseNotifierMinGap, setPurchaseNotifierMinGap] = useState<number>(8);
  const [purchaseNotifierMaxGap, setPurchaseNotifierMaxGap] = useState<number>(23);
  const [feedbackRequiredForExam, setFeedbackRequiredForExamState] = useState<FeedbackContext | null>(null);
  const [userGeoCountryCode, setUserGeoCountryCode] = useState<string | null>(() => localStorage.getItem('mco_user_geo_country_code') || null);
  
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

  const applyConfigToState = useCallback((config: any, processedData: any) => {
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
          setPurchaseNotifierEnabled(newActiveOrg.purchaseNotifierEnabled ?? true);
          setPurchaseNotifierDelay(newActiveOrg.purchaseNotifierDelay ?? 7);
          setPurchaseNotifierMinGap(newActiveOrg.purchaseNotifierMinGap ?? 8);
          setPurchaseNotifierMaxGap(newActiveOrg.purchaseNotifierMaxGap ?? 23);
          const savedTheme = localStorage.getItem('mco_active_theme');
          const defaultTheme = newActiveOrg.activeThemeId || 'default';
          setActiveThemeState(savedTheme || defaultTheme);
      }
      return true;
    }
    return false;
  }, []);

    const fetchGeoLocation = useCallback(async () => {
        const GEO_CACHE_KEY = 'mco_user_geo_country_code';
        const GEO_CACHE_EXPIRY_KEY = 'mco_user_geo_country_code_expiry';
        const now = Date.now();
        try {
            const cachedCode = localStorage.getItem(GEO_CACHE_KEY);
            const cachedExpiry = localStorage.getItem(GEO_CACHE_EXPIRY_KEY);
            if (cachedCode && cachedExpiry && now < parseInt(cachedExpiry, 10)) {
                setUserGeoCountryCode(cachedCode);
                return;
            }
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                const countryCode = data.country_code;
                if (countryCode) {
                    setUserGeoCountryCode(countryCode);
                    localStorage.setItem(GEO_CACHE_KEY, countryCode);
                    localStorage.setItem(GEO_CACHE_EXPIRY_KEY, (now + 3600 * 1000).toString());
                    document.cookie = `mco_user_geo_country_code=${countryCode}; path=/; max-age=3600; SameSite=Lax`;
                }
            }
        } catch (error) { console.error("Geo lookup error:", error); }
    }, []);

  const loadAppConfig = useCallback(async (forceRefresh = false) => {
    setIsInitializing(true);
    let configFound = false;
    const tenantConfig = getTenantConfig();
    const cacheKey = `appConfigCache_${tenantConfig.apiBaseUrl}`;

    try {
        if (!forceRefresh) {
            try {
                const storedConfig = localStorage.getItem(cacheKey);
                if (storedConfig) {
                    const cachedConfig = JSON.parse(storedConfig);
                    const processed = processConfigData(cachedConfig);
                    if (processed) {
                        applyConfigToState(cachedConfig, processed);
                        configFound = true;
                    }
                }
            } catch (e) { localStorage.removeItem(cacheKey); }
        }

        const apiUrl = tenantConfig.apiBaseUrl ? `${tenantConfig.apiBaseUrl}/wp-json/mco-app/v1/config` : '/wp-json/mco-app/v1/config';
        try {
            const response = await fetch(apiUrl, { mode: 'cors' });
            if (response.ok) {
                const liveConfig = await response.json();
                const processed = processConfigData(liveConfig);
                if (processed) {
                    applyConfigToState(liveConfig, processed);
                    localStorage.setItem(cacheKey, JSON.stringify(liveConfig));
                    configFound = true;
                }
            }
        } catch (fetchErr) {
            console.warn("AppContext: Live API fetch failed. Falling back to static JSON.", fetchErr);
        }

        if (!configFound) {
            try {
                const staticResponse = await fetch(tenantConfig.staticConfigPath);
                if (staticResponse.ok) {
                    const staticConfig = await staticResponse.json();
                    const processed = processConfigData(staticConfig);
                    if (processed) {
                        applyConfigToState(staticConfig, processed);
                        configFound = true;
                    }
                }
            } catch (staticErr) {
                console.error("AppContext: Static configuration load failed.", staticErr);
            }
        }
    } catch (error: any) {
        console.error("AppContext: Fatal error loading app configuration:", error);
    } finally {
        setIsInitializing(false);
    }
}, [applyConfigToState]);

  useEffect(() => {
    loadAppConfig();
    fetchGeoLocation();
    googleSheetsService.recordSiteHit().then(data => {
        if (data && data.count) setHitCount(data.count);
    }).catch(() => {});
  }, [fetchGeoLocation, loadAppConfig]);

  const refreshConfig = async () => {
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
        if (newActiveOrg) setActiveOrg(newActiveOrg);
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
    organizations, activeOrg, isLoading: isInitializing, isInitializing,
    refreshConfig, setActiveOrgById, updateActiveOrg, updateConfigData,
    updateExamInOrg, inProgressExam: null, examPrices, suggestedBooks,
    hitCount, availableThemes, activeTheme, setActiveTheme,
    subscriptionsEnabled, bundlesEnabled, purchaseNotifierEnabled,
    purchaseNotifierDelay, purchaseNotifierMinGap, purchaseNotifierMaxGap,
    feedbackRequiredForExam, setFeedbackRequiredForExam, clearFeedbackRequired,
    userGeoCountryCode,
  }), [
    organizations, activeOrg, isInitializing, refreshConfig, setActiveOrgById,
    updateActiveOrg, updateConfigData, updateExamInOrg, examPrices, suggestedBooks,
    hitCount, availableThemes, activeTheme, subscriptionsEnabled, bundlesEnabled,
    purchaseNotifierEnabled, purchaseNotifierDelay, purchaseNotifierMinGap, purchaseNotifierMaxGap,
    feedbackRequiredForExam, userGeoCountryCode
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};