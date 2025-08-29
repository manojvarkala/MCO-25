import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, RecommendedBook, Exam, ExamProductCategory, InProgressExamInfo } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx';

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

const getConfigFile = (): string => {
    const hostname = window.location.hostname;

    // Vercel preview URLs, localhost, and the main production domain for MCO
    if (hostname.endsWith('vercel.app') || hostname === 'exams.coding-online.net' || hostname === 'localhost') {
        return 'medical-coding-config.json';
    }

    const domainMap: { [key: string]: string } = {
        'exams.annapoornainfo.com': 'annapoorna-config.json',
        // --- Placeholder domains for future tenants ---
        'exams.lawprep.com': 'law-school-config.json',
        'exams.civil-certs.com': 'civil-engineering-config.json',
        'exams.tech-exams.com': 'it-certs-config.json',
        'exams.finance-prep.com': 'finance-certs-config.json',
        'exams.management-certs.com': 'management-config.json'
    };
    
    // Fallback to default if no specific domain is matched
    return domainMap[hostname] || 'medical-coding-config.json';
};


export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { user, examPrices, suggestedBooks, dynamicExams, dynamicCategories } = useAuth();
  const [isWheelModalOpen, setWheelModalOpen] = useState(false);
  const [inProgressExam, setInProgressExam] = useState<InProgressExamInfo | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
        setIsInitializing(true);
        try {
            const configFile = getConfigFile();
            // Create a robust URL to the config file, handling any subdirectory deployments.
            const configUrl = new URL(configFile, document.baseURI).href;
            const response = await fetch(configUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! Could not fetch ${configFile}. Status: ${response.status}`);
            }
            const configData = await response.json();
            
            const baseOrgs = JSON.parse(JSON.stringify(configData.organizations || []));
            
            const bookMap = new Map<string, RecommendedBook>();
            if (suggestedBooks) {
                suggestedBooks.forEach(book => bookMap.set(book.id, book));
            }

            const processedOrgs = baseOrgs.map((org: Organization) => {
                // Check if dynamic data exists from the JWT. If so, it's the source of truth for exams/categories.
                const isDynamic = !!(dynamicExams && dynamicCategories);
                const examsSource = isDynamic ? dynamicExams : org.exams;
                const categoriesSource = isDynamic ? dynamicCategories : org.examProductCategories;

                const processedExams = examsSource.map((exam: Exam): Exam => {
                    const priceData = examPrices && exam.productSku ? examPrices[exam.productSku] : null;
                    const recommendedBook = exam.recommendedBookId ? bookMap.get(exam.recommendedBookId) : undefined;
                    
                    let questionSourceUrl = exam.questionSourceUrl;
                    
                    // For static configs (old plugin), we still need to look up the question source URL from the category.
                    if (!isDynamic) {
                         const category = categoriesSource.find(
                            (cat: ExamProductCategory) => cat.practiceExamId === exam.id || cat.certificationExamId === exam.id
                        );
                        if (!category || !category.questionSourceUrl) {
                            console.error(`Static Config error: No question source URL for exam "${exam.name}" (ID: ${exam.id}).`);
                            questionSourceUrl = '';
                        } else {
                            questionSourceUrl = category.questionSourceUrl;
                        }
                    }
                    
                    return {
                        ...exam,
                        questionSourceUrl,
                        ...(priceData && { price: priceData.price, regularPrice: priceData.regularPrice }),
                        ...(recommendedBook && { recommendedBook }),
                    };
                });
                
                // Overwrite the static lists from the config file with the dynamic ones if they exist.
                return { 
                    ...org, 
                    exams: processedExams, 
                    examProductCategories: categoriesSource,
                    suggestedBooks: suggestedBooks || [] 
                };
            });
            
            setOrganizations(processedOrgs);

            const currentActiveOrgId = activeOrg?.id;
            const newActiveOrg = currentActiveOrgId
              ? processedOrgs.find(o => o.id === currentActiveOrgId)
              : (processedOrgs[0] || null);
            
            if (newActiveOrg) {
              setActiveOrg(newActiveOrg);
            } else {
              setActiveOrg(null);
            }

        } catch (error) {
            console.error("Failed to initialize app config from external JSON:", error);
            toast.error("Could not load application configuration.");
        } finally {
            setIsInitializing(false);
        }
    };

    initializeApp();
  }, [examPrices, suggestedBooks, dynamicExams, dynamicCategories]);

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
    }
  }, [organizations]);

  const updateActiveOrg = useCallback((updatedOrg: Organization) => {
    setOrganizations(prevOrgs => 
        prevOrgs.map(org => org.id === updatedOrg.id ? updatedOrg : org)
    );
    setActiveOrg(updatedOrg);
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