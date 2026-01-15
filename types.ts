export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface SubscriptionInfo {
    status: 'active' | 'on-hold' | 'cancelled' | 'expired';
    nextPaymentDate?: string;
}

export interface TokenPayload {
  iss: string;
  iat: number;
  exp: number;
  user: User;
  paidExamIds: string[];
  isSubscribed: boolean;
  subscriptionInfo?: SubscriptionInfo | null;
  isBetaTester?: boolean;
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 1-based index
}

export interface UserAnswer {
  questionId: number;
  answer: number; // 0-based index
}

export interface TestResult {
  testId: string;
  userId: string;
  examId: string;
  answers: UserAnswer[];
  score: number;
  correctCount: number;
  totalQuestions: number;
  timestamp: number;
  review: {
    questionId: number;
    question: string;
    options: string[];
    userAnswer: number; // 0-based index, -1 if unanswered
    correctAnswer: number; // 0-based index
  }[];
  proctoringViolations: number;
}

export interface Exam {
  id: string;
  name: string;
  description: string;
  numberOfQuestions: number;
  durationMinutes: number;
  passScore: number;
  questionSourceUrl: string;
  isPractice: boolean;
  productSku: string;
  price: number;
  regularPrice: number;
  certificateEnabled: boolean;
  certificateTemplateId: string;
  isProctored: boolean;
  recommendedBookIds: string[];
  productSlug: string;
  // FIX: Added optional addonSku property to track linked bundles in management views.
  addonSku?: string;
}

export interface ExamProductCategory {
  id: string;
  name: string;
  description: string;
  practiceExamId: string;
  certificationExamId: string;
  questionSourceUrl?: string;
  thumbnailUrl?: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  signature1Name: string;
  signature1Title: string;
  signature1ImageUrl?: string;
  signature2Name?: string;
  signature2Title?: string;
  signature2ImageUrl?: string;
}

export interface RecommendedBook {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    permalink?: string;
    affiliateLinks: {
        com: string;
        in: string;
        ae: string;
    };
}

export interface Theme {
    id: string;
    name: string;
}

export interface Organization {
  id: string;
  name: string;
  logoUrl: string;
  website: string;
  address?: string;
  introVideoUrl?: string;
  exams: Exam[];
  examProductCategories: ExamProductCategory[];
  certificateTemplates: CertificateTemplate[];
  suggestedBooks: RecommendedBook[];
  availableThemes: Theme[];
  activeThemeId: string;
  certificateThemeId: string;
  subscriptionsEnabled?: boolean;
  bundlesEnabled?: boolean;
  purchaseNotifierEnabled?: boolean;
  purchaseNotifierDelay?: number;
  purchaseNotifierMinGap?: number;
  purchaseNotifierMaxGap?: number;
  disclaimerText?: string;
}

export interface ApiCertificateData {
    certificateNumber: string;
    candidateName: string;
    finalScore: number;
    date: string;
    examId: string;
    examName: string;
}

export interface CertificateData extends ApiCertificateData {
    totalQuestions: number;
    organization: Organization;
    template: CertificateTemplate;
}

export interface DebugData {
  user: User;
  purchases: string[];
  results: TestResult[];
  sheetTest: {
    success: boolean;
    message: string;
    data: any;
  };
}

export interface WordpressAuthor {
    ID: string;
    display_name: string;
}

export interface WordpressCategory {
    term_id: number;
    name: string;
    slug: string;
}

export interface PostCreationData {
    authors: WordpressAuthor[];
    categories: WordpressCategory[];
}

export interface ExamStat {
    id: string;
    name: string;
    isPractice: boolean;
    attempts: number;
    averageScore: number;
    passRate: number;
    engagements: number;
    totalSales?: number;
    totalRevenue?: number;
    passCount?: number;
    totalScoreSum?: number;
    ctr?: number;
    country?: string;
    programName?: string;
}

export interface InProgressExamInfo {
    examId: string;
    examName: string;
}

export interface ExamProgress {
  questions: Question[];
  answers: UserAnswer[];
  currentQuestionIndex: number;
}

export type ProductVariationType = 'simple' | 'subscription' | 'bundle';

export type BillingPeriod = 'day' | 'week' | 'month' | 'year';

export interface ProductVariation {
    id: string;
    name: string;
    sku: string;
    type: ProductVariationType;
    regularPrice: string;
    salePrice: string;
    subscriptionPeriod?: string;
    subscriptionPeriodInterval?: string;
    subscriptionLength?: string;
    isBundle?: boolean;
    bundledSkus?: string[];
}

export interface VerificationData {
    candidateName: string;
    examName: string;
    finalScore: number;
    date: string;
}

export interface FeedbackContext {
    examId: string;
    examName: string;
}

export interface BetaTester {
    id: string;
    name: string;
    email: string;
    country: string;
    registrationDate: string; 
    expiryTimestamp: number;
    tokenRedeemed: boolean;
}

export interface AppContextType {
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
  purchaseNotifierEnabled: boolean;
  purchaseNotifierDelay: number;
  purchaseNotifierMinGap: number;
  purchaseNotifierMaxGap: number;
  feedbackRequiredForExam: FeedbackContext | null;
  setFeedbackRequiredForExam: (context: FeedbackContext) => void;
  clearFeedbackRequired: () => void;
  userGeoCountryCode: string | null;
}