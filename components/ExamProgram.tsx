import React, { FC, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
// FIX: Imported googleSheetsService to resolve an undefined variable error.
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, TestResult, RecommendedBook, ExamProductCategory } from '../types.ts';
// FIX: Imported XCircle icon from lucide-react to resolve an undefined component error.
import { Award, BookOpen, CheckCircle, ChevronRight, Clock, History, Lock, Star, Zap, ShoppingCart, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LogoSpinner from './LogoSpinner.tsx';
import BookCover from '../assets/BookCover.tsx';

// Reusable card for either Practice or Certification exam options
const ExamOptionCard: FC<{ exam: Exam; results: TestResult[]; }> = ({ exam, results }) => {
    const navigate = useNavigate();
    const { paidExamIds, isSubscribed } = useAuth();

    const attempts = useMemo(() => results.filter(r => r.examId === exam.id), [results, exam.id]);
    const hasPassed = useMemo(() => attempts.some(r => r.score >= exam.passScore), [attempts, exam.passScore]);
    const bestScore = useMemo(() => attempts.length > 0 ? Math.max(...attempts.map(r => r.score)) : null, [attempts]);

    let cta: { text: string; disabled: boolean; action: () => void; reason: string; } = { text: 'Start Exam', disabled: false, action: () => navigate(`/test/${exam.id}`), reason: '' };

    if (exam.isPractice) {
        cta.text = 'Start Practice';
        if (!isSubscribed && attempts.length >= 10) {
            cta.disabled = true;
            cta.reason = 'You have used all 10 free attempts.';
        }
    } else { // Certification
        if (hasPassed) {
            cta.disabled = true;
            cta.reason = 'You have already passed this certification.';
        } else if (attempts.length >= 3) {
            cta.disabled = true;
            cta.reason = `You have used all 3 attempts.`;
        } else if (!paidExamIds.includes(exam.productSku) && !isSubscribed) {
            cta.disabled = true;
            cta.text = 'Purchase Exam';
// FIX: Fixed a type error by ensuring the action handler always returns void.
            cta.action = () => {
                if (exam.productSlug) {
                    navigate(`/checkout/${exam.productSlug}`);
                } else {
                    toast.error("Checkout not available.");
                }
            };
            cta.reason = 'Purchase required to begin.';
        }
    }

    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border ${exam.isPractice ? 'border-cyan-200' : 'border-purple-200'}`}>
            <div className="flex items-center gap-3 mb-4">
                {exam.isPractice ? <BookOpen className="h-8 w-8 text-cyan-500" /> : <Award className="h-8 w-8 text-purple-500" />}
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{exam.name}</h3>
                    <p className="text-sm text-slate-500">{exam.isPractice ? 'Practice Your Skills' : 'Official Certification'}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center my-6 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-bold text-lg text-slate-700">{exam.numberOfQuestions}</p>
                    <p className="text-slate-500">Questions</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-bold text-lg text-slate-700">{exam.durationMinutes}</p>
                    <p className="text-slate-500">Minutes</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-bold text-lg text-slate-700">{exam.passScore}%</p>
                    <p className="text-slate-500">Pass Mark</p>
                </div>
            </div>
            
            <div className="text-center text-sm text-slate-600 mb-6">
                <p>Attempts Taken: <strong>{attempts.length}</strong></p>
                {bestScore !== null && <p>Your Best Score: <strong className={bestScore >= exam.passScore ? 'text-green-600' : 'text-red-600'}>{bestScore.toFixed(0)}%</strong></p>}
            </div>

            <button onClick={cta.action} disabled={cta.disabled} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 ${
                cta.disabled ? 'bg-slate-400 cursor-not-allowed text-white' : 
                (exam.isPractice ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white')
            }`}>
                {cta.disabled && cta.reason !== 'Purchase required to begin.' ? <Lock size={16} /> : (exam.isPractice ? <Zap size={16} /> : <Award size={16} />) }
                <span>{cta.text}</span>
            </button>
            {cta.disabled && cta.reason && <p className="text-xs text-center text-red-600 mt-2">{cta.reason}</p>}
            
            {!exam.isPractice && !paidExamIds.includes(exam.productSku) && !isSubscribed && exam.price != null && (
                 <div className="text-center mt-4">
                    <span className="text-2xl font-bold text-slate-800">${exam.price.toFixed(2)}</span>
                    {exam.regularPrice && exam.regularPrice > exam.price && <span className="text-md line-through text-slate-500 ml-2">${exam.regularPrice.toFixed(2)}</span>}
                </div>
            )}
        </div>
    );
};

const AttemptHistory: FC<{ results: TestResult[]; exams: Exam[] }> = ({ results, exams }) => {
    if (results.length === 0) {
        return <p className="text-center text-slate-500 py-6">You have not attempted any exams in this program yet.</p>;
    }
    
    const navigate = useNavigate();

    return (
        <div className="space-y-3">
            {results.map(result => {
                const exam = exams.find(e => e.id === result.examId);
                if (!exam) return null;
                const isPass = result.score >= exam.passScore;
                return (
                    <div key={result.testId} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center gap-2 border border-slate-200">
                        <div>
                            <p className="font-semibold text-slate-800">{exam.name}</p>
                            <p className="text-xs text-slate-500">{new Date(result.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {isPass ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                            <span className={`font-bold text-lg ${isPass ? 'text-green-600' : 'text-red-600'}`}>{result.score}%</span>
                            <button onClick={() => navigate(`/results/${result.testId}`)} className="text-sm font-semibold text-cyan-600 hover:underline flex items-center">
                                Details <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const RecommendedBooksSection: FC<{ bookIds: string[]; }> = ({ bookIds }) => {
    const { suggestedBooks } = useAppContext();
    const books = useMemo(() => suggestedBooks.filter(book => bookIds.includes(book.id)), [bookIds, suggestedBooks]);
    
    if (books.length === 0) return null;

    const getPrimaryLink = (book: RecommendedBook) => {
        // Simple geo-targeting logic
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timeZone.includes('Asia/Kolkata') && book.affiliateLinks.in) return { url: book.affiliateLinks.in, name: 'Amazon.in'};
        if (timeZone.includes('Asia/Dubai') && book.affiliateLinks.ae) return { url: book.affiliateLinks.ae, name: 'Amazon.ae'};
        return { url: book.affiliateLinks.com, name: 'Amazon.com' };
    }

    return (
        <div className="flex flex-wrap gap-6 justify-center">
            {books.map(book => {
                const link = getPrimaryLink(book);
                return (
                     <div key={book.id} className="bg-white rounded-lg overflow-hidden border border-slate-200 w-full sm:w-60 flex-shrink-0 shadow-sm">
                        <BookCover book={book} className="w-full h-36"/>
                        <div className="p-4">
                            <h4 className="font-bold text-slate-800 text-sm mb-3 leading-tight h-10 overflow-hidden">{book.title}</h4>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center text-sm text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-3 py-2 transition-colors">
                                <ShoppingCart size={16} className="mr-2"/> Buy on {link.name}
                            </a>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const ExamProgram: FC = () => {
    const { programId } = useParams<{ programId: string }>();
    const { user } = useAuth();
    const { activeOrg, suggestedBooks, isInitializing } = useAppContext();

    const programData = useMemo(() => {
        if (!activeOrg || !programId) return null;

        const programCategory = activeOrg.examProductCategories.find(cat => cat.id === programId);
        if (!programCategory) return null;

        const practiceExam = activeOrg.exams.find(e => e.id === programCategory.practiceExamId);
        const certExam = activeOrg.exams.find(e => e.id === programCategory.certificationExamId);

        if (!practiceExam || !certExam) return null;

        const results = user ? googleSheetsService.getLocalTestResultsForUser(user.id) : [];
        const programResults = results
            .filter(r => r.examId === practiceExam.id || r.examId === certExam.id)
            .sort((a, b) => b.timestamp - a.timestamp);

        const recommendedBookIds = Array.from(new Set([...(practiceExam.recommendedBookIds || []), ...(certExam.recommendedBookIds || [])]));

        return { programCategory, practiceExam, certExam, programResults, recommendedBookIds };

    }, [programId, activeOrg, user]);
    
    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
                <p className="mt-4 text-slate-500">Loading Program...</p>
            </div>
        );
    }

    if (!programData) {
        return <p className="text-center text-slate-500">Exam program not found.</p>;
    }

    const { programCategory, practiceExam, certExam, programResults, recommendedBookIds } = programData;

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {certExam.imageUrl && (
                <div className="w-full h-64 bg-slate-200 rounded-xl overflow-hidden shadow-lg">
                    <img src={certExam.imageUrl} alt={programCategory.name} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="text-center">
                <h1 className="text-4xl font-extrabold text-slate-900">{programCategory.name}</h1>
                <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">{programCategory.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ExamOptionCard exam={practiceExam} results={programResults} />
                <ExamOptionCard exam={certExam} results={programResults} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <History className="mr-3 text-cyan-500" />
                    Attempt History
                </h2>
                <AttemptHistory results={programResults} exams={[practiceExam, certExam]} />
            </div>

            {recommendedBookIds.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-6 text-center justify-center">
                        <Star className="mr-3 text-yellow-400" />
                        Recommended Study Materials
                    </h2>
                    <RecommendedBooksSection bookIds={recommendedBookIds} />
                </div>
            )}
        </div>
    );
};

export default ExamProgram;