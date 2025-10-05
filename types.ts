// types.ts

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface TokenPayload {
  user: User;
  paidExamIds: string[];
  isSubscribed: boolean;
  spinsAvailable: number;
  wonPrize: { prizeId: string; prizeLabel: string } | null;
  isSpinWheelEnabled: boolean;
  exp?: number;
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

export interface ReviewItem {
  questionId: number;
  question: string;
  options: string[];
  userAnswer: number; // 0-based index, -1 if unanswered
  correctAnswer: number; // 0-based index
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
  review: ReviewItem[];
}

export interface Exam {
  id: string;
  name: string;
  description: string;
  numberOfQuestions: number;
  durationMinutes: number;
  passScore: number;
  isPractice: boolean;
  productSku: string;
  productSlug?: string;
  price?: number;
  regularPrice?: number;
  questionSourceUrl?: string;
  certificateTemplateId: string;
  certificateEnabled: boolean;
  isProctored: boolean;
  recommendedBookIds: string[];
  imageUrl?: string;
}

export interface CertificateTemplate {
  id: string;
  name?: string; // name is optional now
  title: string;
  body: string;
  signature1Name: string;
  signature1Title: string;
  signature1ImageUrl: string;
  signature2Name?: string;
  signature2Title?: string;
  signature2ImageUrl?: string;
}

export interface RecommendedBook {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string | boolean;
    affiliateLinks: {
        com: string;
        in: string;
        ae: string;
    };
}

export interface ExamProductCategory {
    id: string;
    name: string;
    description: string;
    practiceExamId: string;
    certificationExamId: string;
    questionSourceUrl: string;
}

export interface Theme {
  id: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  website: string;
  logo: string;
  availableThemes: Theme[];
  activeThemeId: string;
  exams: Exam[];
  certificateTemplates: CertificateTemplate[];
  examProductCategories: ExamProductCategory[];
  suggestedBooks: RecommendedBook[];
}

export interface ApiCertificateData {
  certificateNumber: string;
  candidateName: string;
  examName: string;
  finalScore: number;
  date: string;
  examId: string;
}

export interface CertificateData extends ApiCertificateData {
  totalQuestions: number;
  organization: Organization;
  template: CertificateTemplate;
}

export interface DebugSheetTest {
    success: boolean;
    message: string;
    data?: any;
}

export interface DebugData {
  user: User;
  purchases: string[];
  results: TestResult[];
  sheetTest: DebugSheetTest;
}

export interface SpinWheelResult {
  prizeId: string;
  prizeLabel: string;
  newToken?: string;
}

export interface SearchedUser {
  id: string;
  name: string;
  email: string;
}

export interface ExamStat {
  examId: string;
  examName: string;
  totalSales: number;
  totalAttempts: number;
  passed: number;
  failed: number;
  passRate: number;
  averageScore: number;
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

// Types for Product Customizer
export type ProductVariationType = 'simple' | 'subscription' | 'bundle';
export type BillingPeriod = 'day' | 'week' | 'month' | 'year';

export interface ProductVariation {
  id: string;
  name: string;
  sku: string;
  type: ProductVariationType;
  regularPrice: string;
  salePrice: string;
  // Subscription fields
  subscriptionPrice?: string;
  subscriptionPeriod?: BillingPeriod;
  subscriptionPeriodInterval?: string; // e.g., 1, 2, 3
  subscriptionLength?: string; // 0 for renew indefinitely, or a number of periods
  // Bundle fields
  trialPeriodDays?: string;
}