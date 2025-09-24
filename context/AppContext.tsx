







import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, RecommendedBook, Exam, ExamProductCategory, InProgressExamInfo } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx';
import { getAppConfigPath } from '../services/apiConfig.ts';

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

        // Resolve signature references
        if (org.signatureAssets) {
            org.certificateTemplates = (org.certificateTemplates || []).map(template => {
                const newTemplate = { ...template };
                if (template.signature1ImageBase64Ref && org.signatureAssets?.[template.signature1ImageBase64Ref]) {
                    newTemplate.signature1ImageBase64 = org.signatureAssets[template.signature1ImageBase64Ref];
                }
                if (template.signature2ImageBase64Ref && org.signatureAssets?.[template.signature2ImageBase64Ref]) {
                    newTemplate.signature2ImageBase64 = org.signatureAssets[template.signature2ImageBase64Ref];
                }
                return newTemplate;
            });
        }

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
  // FIX: Corrected syntax for useState generic type and initial value.
  const [examPrices, setExamPrices] = useState<{ [key: string]: any } | null>(null);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);

  // Effect 1: Load static config from bundled JSON file on startup.
  useEffect(() => {
    const loadStaticConfig = async () => {
        setIsInitializing(true);
        try {
            const configPath = getAppConfigPath();
            const response = await fetch(configPath);
            if (!response.ok) throw new Error(`Could not fetch static config from ${configPath}.`);
            const configData = await response.json();
            
            const processedData = processConfigData(configData);
            if (processedData) {
                setOrganizations(processedData.processedOrgs);
                setExamPrices(processedData.allPrices);
                setSuggestedBooks(processedData.allBooks);
                
                const currentOrgId = localStorage.getItem('activeOrgId') || processedData.processedOrgs[0]?.id;
                const newActiveOrg = processedData.processedOrgs.find((o: Organization) => o.id === currentOrgId) || processedData.processedOrgs[0] || null;
                setActiveOrg(newActiveOrg);
            }

        } catch (error: any) {
            toast.error(error.message || "Could not load application configuration.");
        } finally {
            setIsInitializing(false);
        }
    };
    loadStaticConfig();
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