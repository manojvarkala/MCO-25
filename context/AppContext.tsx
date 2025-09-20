import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, FC, ReactNode } from 'react';
import type { Organization, RecommendedBook, Exam, ExamProductCategory, InProgressExamInfo } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext.tsx'; // Still need this for user id for progress key
import { googleSheetsService } from '../services/googleSheetsService.ts'; // For apiFetch

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
  // FIX: Add examPrices to the context type, as it's part of the global app configuration.
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
  const { user } = useAuth();
  const [isWheelModalOpen, setWheelModalOpen] = useState(false);
  const [inProgressExam, setInProgressExam] = useState<InProgressExamInfo | null>(null);
  // FIX: Add state to hold exam prices from the global configuration.
  const [examPrices, setExamPrices] = useState<{ [key: string]: any } | null>(null);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);


  // Effect 1: Fetch and process the entire application configuration from the API.
  useEffect(() => {
    const fetchAndProcessConfig = async () => {
        setIsInitializing(true);
        try {
            // FIX: Use the now-exposed `apiFetch` method. The token is null for this public endpoint.
            const configData = await googleSheetsService.apiFetch('/app-config', null);
            if (!configData || !configData.organizations) {
                 throw new Error(`Could not fetch valid app configuration from the API.`);
            }
            
            const fetchedOrgs: Organization[] = configData.organizations;
            const fetchedPrices = configData.examPrices;
            // FIX: Store the fetched exam prices in the context state.
            setExamPrices(fetchedPrices);

            // Deep copy to avoid mutating the base config state
            const processedOrgs = JSON.parse(JSON.stringify(fetchedOrgs));

            processedOrgs.forEach((org: Organization) => {
                const bookMap = new Map<string, RecommendedBook>();
                (org.suggestedBooks || []).forEach(book => bookMap.set(book.id, book));
                
                const categoryUrlMap = new Map<string, string>();
                (org.examProductCategories || []).forEach((cat: ExamProductCategory) => {
                    if (cat.questionSourceUrl) {
                        if (cat.practiceExamId) categoryUrlMap.set(cat.practiceExamId, cat.questionSourceUrl);
                        if (cat.certificationExamId) categoryUrlMap.set(cat.certificationExamId, cat.questionSourceUrl);
                    }
                });

                org.exams = (org.exams || []).map((exam: Exam): Exam => {
                    const priceData = fetchedPrices && exam.productSku ? fetchedPrices[exam.productSku] : null;
                    const recommendedBook = exam.recommendedBookId ? bookMap.get(exam.recommendedBookId) : undefined;
                    const questionSourceUrl = categoryUrlMap.get(exam.id) || exam.questionSourceUrl;

                    return {
                        ...exam,
                        questionSourceUrl,
                        price: priceData?.price ?? exam.price,
                        regularPrice: priceData?.regularPrice ?? exam.regularPrice,
                        productSlug: priceData ? exam.productSlug : undefined,
                        recommendedBook,
                    };
                });

                if (org.suggestedBooks) {
                    setSuggestedBooks(org.suggestedBooks);
                }
            });

            setOrganizations(processedOrgs);

            const currentActiveOrgId = activeOrg?.id;
            let newActiveOrg = currentActiveOrgId
              ? processedOrgs.find((o: Organization) => o.id === currentActiveOrgId)
              : processedOrgs[0] || null;

            if (newActiveOrg) {
                setActiveOrg(newActiveOrg);
                localStorage.setItem('activeOrg', JSON.stringify(newActiveOrg));
            }
        } catch (error: any) {
            console.error("Failed to fetch base app config:", error);
            toast.error(error.message || "Could not load application configuration.", { duration: 6000 });
        } finally {
            setIsInitializing(false);
        }
    };
    fetchAndProcessConfig();
  }, []);

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
    inProgressExam,
    // FIX: Expose examPrices through the context provider.
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
