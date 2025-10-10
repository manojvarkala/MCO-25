import React, { FC, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { chapters } from './chapters';

const Handbook: FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(0);
    const bookRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const hash = location.hash;
        if (hash) {
            const page = parseInt(hash.replace('#page/', ''), 10);
            if (!isNaN(page) && page >= 0 && page < chapters.length) {
                setCurrentPage(page);
            }
        }
    }, [location.hash]);

    useEffect(() => {
        if (bookRef.current) {
            bookRef.current.scrollTop = 0;
        }
        navigate(`#page/${currentPage}`);
    }, [currentPage, navigate]);

    const goToPage = (page: number) => {
        if (page >= 0 && page < chapters.length) {
            setCurrentPage(page);
        }
    };

    const activeChapter = chapters[currentPage];

    return (
        <div className="bg-slate-100 p-4 rounded-xl shadow-inner">
            <div className="flex justify-between items-center mb-4 px-4">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen /> Technical Handbook
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0}
                        className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-semibold text-slate-600">
                        Page {currentPage + 1} of {chapters.length}
                    </span>
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === chapters.length - 1}
                        className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div
                ref={bookRef}
                className="bg-white aspect-[8.5/11] w-full max-w-4xl mx-auto p-8 sm:p-12 shadow-lg overflow-y-auto border border-slate-200 rounded-lg"
            >
                <div
                    className={`prose max-w-none prose-slate ${activeChapter.isCover ? 'cover-page' : ''}`}
                    dangerouslySetInnerHTML={{ __html: activeChapter.content }}
                />
            </div>
            
            <div className="flex justify-center items-center mt-4 text-center">
                <p className="text-sm text-slate-500">
                    Chapter: {activeChapter.title}
                </p>
            </div>
            <style>{`
                .handbook-toc a { text-decoration: none; color: inherit; }
                .handbook-toc a:hover { color: rgb(var(--color-primary-rgb)); text-decoration: underline; }
                .cover-page { height: 100%; }
                .cover-page > div { height: 100%; }
            `}</style>
        </div>
    );
};

export default Handbook;
