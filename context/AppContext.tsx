import * as React from 'react';
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

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = React.useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [suggestedBooks, setSuggestedBooks] = React.useState<RecommendedBook[]>([]);
  const { user, examPrices } = useAuth();
  const [isWheelModalOpen, setWheelModalOpen] = React.useState(false);
  const [inProgressExam, setInProgressExam] = React.useState<InProgressExamInfo | null>(null);

  React.useEffect(() => {
    const initializeApp = async () => {
        setIsInitializing(true);
        try {
            const response = await fetch('/medical-coding-config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const configData = await response.json();
            
            // FIX: Access the 'organizations' array from the fetched JSON object
            const baseOrgs = JSON.parse(JSON.stringify(configData.organizations || []));
            
            const bookMap = new Map<string, RecommendedBook>();
            baseOrgs.forEach((org: Organization) => {
                if (org.suggestedBooks) {
                    org.suggestedBooks.forEach(book => {
                        if (!bookMap.has(book.id)) bookMap.set(book.id, book);
                    });
                }
            });

            const processedOrgs = baseOrgs.map((org: Organization) => {
                const processedExams = org.exams.map((exam: Exam): Exam => {
                    const priceData = examPrices && exam.productSku ? examPrices[exam.productSku] : null;
                    const recommendedBook = exam.recommendedBookId ? bookMap.get(exam.recommendedBookId) : undefined;
                    
                    const category = org.examProductCategories.find(
                        (cat: ExamProductCategory) => cat.practiceExamId === exam.id || cat.certificationExamId === exam.id
                    );

                    if (!category || !category.questionSourceUrl) {
                        console.error(`Configuration error: No question source URL found for exam "${exam.name}" (ID: ${exam.id}). Please check your config file.`);
                        return {
                            ...exam,
                            questionSourceUrl: '', // Set to empty to prevent runtime errors on property access
                            ...(priceData && { price: priceData.price, regularPrice: priceData.regularPrice }),
                            ...(recommendedBook && { recommendedBook }),
                        };
                    }
                    
                    const questionSourceUrl = category.questionSourceUrl;

                    return {
                        ...exam,
                        questionSourceUrl,
                        ...(priceData && { price: priceData.price, regularPrice: priceData.regularPrice }),
                        ...(recommendedBook && { recommendedBook }),
                    };
                });
                return { ...org, exams: processedExams };
            });
            
            setOrganizations(processedOrgs);

            const currentActiveOrgId = activeOrg?.id;
            const newActiveOrg = currentActiveOrgId
              ? processedOrgs.find(o => o.id === currentActiveOrgId)
              : (processedOrgs[0] || null);
            
            if (newActiveOrg) {
              setActiveOrg(newActiveOrg);
              setSuggestedBooks(newActiveOrg.suggestedBooks || []);
            } else {
              setActiveOrg(null);
              setSuggestedBooks([]);
            }

        } catch (error) {
            console.error("Failed to initialize app config from external JSON:", error);
            toast.error("Could not load application configuration.");
        } finally {
            setIsInitializing(false);
        }
    };

    initializeApp();
  }, [examPrices]);

  // Effect to detect in-progress exams
  React.useEffect(() => {
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


  const setActiveOrgById = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
        setActiveOrg(org);
        if (org.suggestedBooks) {
            setSuggestedBooks(org.suggestedBooks);
        }
    }
  };

  const updateActiveOrg = (updatedOrg: Organization) => {
    setOrganizations(prevOrgs => 
        prevOrgs.map(org => org.id === updatedOrg.id ? updatedOrg : org)
    );
    setActiveOrg(updatedOrg);
    if (updatedOrg.suggestedBooks) {
        setSuggestedBooks(updatedOrg.suggestedBooks);
    }
  };

  return (
    <AppContext.Provider value={{ organizations, activeOrg, isLoading: isInitializing, isInitializing, setActiveOrgById, updateActiveOrg, suggestedBooks, isWheelModalOpen, setWheelModalOpen, inProgressExam }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};