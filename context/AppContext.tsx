import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { appData } from '../assets/appData.ts';
import type { Organization, RecommendedBook, Exam } from '../types.ts';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);
  const { examPrices } = useAuth();
  const [isWheelModalOpen, setWheelModalOpen] = useState(false);

  useEffect(() => {
    const initializeApp = () => {
        try {
            const baseOrgs = JSON.parse(JSON.stringify(appData));
            
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
                    
                    return {
                        ...exam,
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
    <AppContext.Provider value={{ organizations, activeOrg, isLoading: isInitializing, isInitializing, setActiveOrgById, updateActiveOrg, suggestedBooks, isWheelModalOpen, setWheelModalOpen }}>
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