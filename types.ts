export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface UserAnswer {
  questionId: number;
  answer: number; // The index of the selected option
}

export interface AnswerReview {
    questionId: number;
    question: string;
    options: string[];
    userAnswer: number; // index of user's answer
    correctAnswer: number; // index of correct answer
}

export interface TestResult {
  testId: string;
  userId: string;
  examId: string; // Link back to the specific exam configuration
  answers: UserAnswer[];
  score: number; // Percentage
  correctCount: number;
  totalQuestions: number;
  timestamp: number;
  review: AnswerReview[];
}

// The structure of the JWT payload coming from the main site
export interface TokenPayload {
    user: User;
    paidExamIds: string[];
    examPrices?: { [examId: string]: { price: number; regularPrice?: number; productId?: number; avgRating?: number; reviewCount?: number; } };
    isSubscribed?: boolean;
    spinsAvailable?: number;
    wonPrize?: { prizeId: string; prizeLabel: string; };
    suggestedBooks?: RecommendedBook[];
    isSpinWheelEnabled?: boolean;
    // Add dynamic data from the new plugin version for backward compatibility
    exams?: Exam[];
    examProductCategories?: ExamProductCategory[];
    iat?: number;
    exp?: number;
}

// Result from the spin wheel endpoint
export interface SpinWheelResult {
    prizeId: string;
    prizeLabel: string;
    newToken?: string;
}


// =================================================================
// DYNAMIC CONFIGURATION TYPES
// =================================================================

export interface CertificateTemplate {
    id: string;
    title: string;
    body: string;
    signature1Name: string;
    signature1Title: string;
    signature1ImageBase64?: string;
    signature2Name: string;
    signature2Title: string;
    signature2ImageBase64?: string;
}

export interface RecommendedBook {
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    affiliateLinks: { // These should be the full, final affiliate URLs
        com: string;
        in: string;
        ae: string;
    };
}

export interface Exam {
    id: string;
    name: string;
    description: string;
    price: number;
    regularPrice?: number;
    questionSourceUrl: string; // This will be populated from the category
    numberOfQuestions: number;
    passScore: number;
    certificateTemplateId: string;
    recommendedBook?: RecommendedBook;
    recommendedBookId?: string;
    isPractice: boolean;
    isProctored?: boolean;
    durationMinutes: number;
    productSku: string;
    productSlug?: string;
}

export interface ExamProductCategory {
    id: string;
    name: string;
    description: string;
    practiceExamId: string;
    certificationExamId: string;
    questionSourceUrl: string;
}

export interface Organization {
    id: string;
    name: string;
    website: string;
    logo: string;
    exams: Exam[];
    examProductCategories: ExamProductCategory[];
    certificateTemplates: CertificateTemplate[];
    suggestedBooks: RecommendedBook[];
}

// The structure returned from the /certificate-data/{testId} endpoint
export interface ApiCertificateData {
    certificateNumber: string;
    candidateName: string;
    finalScore: number;
    date: string;
    examId: string;
}

export interface CertificateData {
    certificateNumber: string;
    candidateName: string;
    finalScore: number;
    date: string;
    totalQuestions: number;
    // Dynamic fields from template
    organization: Organization;
    template: CertificateTemplate;
}

// Data for the Admin Debug Sidebar
export interface DebugData {
    user: {
        id: string;
        name: string;
        email: string;
    };
    purchases: string[];
    results: TestResult[];
    sheetTest: {
        success: boolean;
        message: string;
        data?: any;
    };
}

// User data from admin search
export interface SearchedUser {
    id: string;
    name: string;
    email: string;
}

// Data structure for saving exam progress
export interface ExamProgress {
    questions: Question[];
    answers: UserAnswer[];
    currentQuestionIndex: number;
}

// Information about an exam the user has started but not finished
export interface InProgressExamInfo {
    examId: string;
    examName: string;
}

// Data for the new Exam Statistics panel
export interface ExamStat {
    examId: string;
    examName: string;
    totalSales: number;
    totalAttempts: number;
    passRate: number; // Percentage
    averageScore: number;
    passed: number;
    failed: number;
}
