import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { appData } from '@/assets/appData.ts';
import type { Organization, RecommendedBook, Exam } from '@/types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext.tsx';

interface AppContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  isInitializing: boolean;
  setActiveOrgById: (orgId: string) => void;
  updateActiveOrg: (updatedOrg: Organization) => void;
  suggestedBooks: RecommendedBook[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);
  const { examPrices } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
        try {
            // Data is now imported locally instead of fetched for reliability.
            const initialOrgsFromDataFile = JSON.parse(JSON.stringify(appData)); // Deep copy to avoid mutation issues
            
            const bookMap = new Map<string, RecommendedBook>();
            initialOrgsFromDataFile.forEach((org: Organization) => {
                if (org.suggestedBooks) {
                    org.suggestedBooks.forEach(book => {
                        if (!bookMap.has(book.id)) {
                            bookMap.set(book.id, book);
                        }
                    });
                }
            });

            const processOrgs = (orgs: Organization[]): Organization[] => {
                return orgs.map(org => {
                    const processedExams = org.exams.map((exam: any): Exam => {
                        let finalExam: Exam = { ...exam };

                        if (examPrices && exam.productSku) {
                            const syncedPriceData = examPrices[exam.productSku];
                            if (syncedPriceData) {
                                finalExam.price = syncedPriceData.price;
                                finalExam.regularPrice = syncedPriceData.regularPrice;
                            }
                        }

                        if (exam.recommendedBookId && bookMap.has(exam.recommendedBookId)) {
                            finalExam.recommendedBook = bookMap.get(exam.recommendedBookId);
                        }
                        return finalExam;
                    });
                    
                    return { ...org, exams: processedExams };
                });
            };
            
            const finalOrgs = processOrgs(initialOrgsFromDataFile);
            setOrganizations(finalOrgs);

            if (finalOrgs.length > 0) {
                const currentOrg = finalOrgs[0];
                setActiveOrg(currentOrg);
                if (currentOrg.suggestedBooks) {
                    setSuggestedBooks(currentOrg.suggestedBooks);
                }
            }
        } catch (error) {
            console.error("Failed to initialize app config from local data:", error);
            toast.error("Could not load application configuration.");
        } finally {
            setIsInitializing(false);
        }
    };

    initializeApp();
  }, [examPrices]);


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
    <AppContext.Provider value={{ organizations, activeOrg, isLoading: isInitializing, isInitializing, setActiveOrgById, updateActiveOrg, suggestedBooks }}>
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