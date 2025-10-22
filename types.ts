// FIX: This file contained incorrect code. It has been replaced with the application's type definitions.
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
  user: User;
  paidExamIds: string[];
  isSubscribed: boolean;
  subscriptionInfo?: SubscriptionInfo | null;
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

export interface ExamSection {
  id: string;
  name: string;
  startQuestion: number;
  endQuestion: number;
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
  sections?: ExamSection[];
}

export interface ExamProductCategory {
  id: string;
  name: string;
  description: string;
  practiceExamId: string;
  certificationExamId: string;
  questionSourceUrl?: string;
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
  logo: string;
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
}

export interface PostCreationData {
    authors: WordpressAuthor[];
    categories: WordpressCategory[];
}

export interface ExamStat {
    id: string;
    name: string;
    attempts: number;
    averageScore: number;
    passRate: number;
    totalSales: number;
    totalRevenue: number;
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
    subscriptionPrice?: string;
    subscriptionPeriod?: BillingPeriod;
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