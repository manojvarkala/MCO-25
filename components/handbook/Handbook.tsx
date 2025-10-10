import React, { FC, useState, useEffect } from 'react';
import { chapters } from './chapters';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Handbook: FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        const hash = location.hash;
        if (hash) {
            const page = parseInt(hash.replace('#page/', ''), 10);
            if (!isNaN(page) && page >= 0 && page < chapters.length) {
                setCurrentPage(page);
            }
        }
    }, [location.hash]);

    const navigateToPage = (page: number) => {
        const newPage = Math.max(0, Math.min(chapters.length - 1, page));
        setCurrentPage(newPage);
        navigate(`#page/${newPage}`);
    };

    const handleInternalLink = (e: React.MouseEvent) => {
        const target = e.target as HTMLAnchorElement;
        if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#page/')) {
            e.preventDefault();
            const page = parseInt(target.getAttribute('href')!.replace('#page/', ''), 10);
            navigateToPage(page);
        }
    };

    const leftPage = chapters[currentPage];
    const rightPage = currentPage + 1 < chapters.length ? chapters[currentPage + 1] : null;

    if (!leftPage) {
        return <div>Chapter not found.</div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <BookOpen />
                Technical Handbook
            </h1>

            <div className="aspect-[2/1.414] bg-[rgb(var(--color-card-rgb))] p-4 sm:p-6 rounded-lg shadow-2xl border border-[rgb(var(--color-border-rgb))]">
                <div className="h-full w-full flex gap-4 sm:gap-6">
                    {/* Left Page */}
                    <div 
                        className={`w-1/2 h-full bg-white rounded-l-md shadow-inner overflow-y-auto p-6 sm:p-8 handbook-page ${leftPage.isCover ? 'is-cover' : ''}`}
                        onClick={handleInternalLink}
                        dangerouslySetInnerHTML={{ __html: leftPage.content }}
                    />

                    {/* Right Page */}
                    <div className="w-1/2 h-full bg-white rounded-r-md shadow-inner overflow-y-auto p-6 sm:p-8 handbook-page"
                         onClick={handleInternalLink}
                         dangerouslySetInnerHTML={{ __html: rightPage ? rightPage.content : '' }}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigateToPage(currentPage - 2)}
                    disabled={currentPage === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-muted-rgb))] rounded-lg font-semibold hover:bg-[rgb(var(--color-border-rgb))] disabled:opacity-50"
                >
                    <ChevronLeft /> Previous
                </button>
                <div className="text-sm text-[rgb(var(--color-text-muted-rgb))]">
                    Page {currentPage + 1} {rightPage ? `- ${currentPage + 2}` : ''} of {chapters.length}
                </div>
                <button
                    onClick={() => navigateToPage(currentPage + 2)}
                    disabled={!rightPage || currentPage + 2 >= chapters.length}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-muted-rgb))] rounded-lg font-semibold hover:bg-[rgb(var(--color-border-rgb))] disabled:opacity-50"
                >
                    Next <ChevronRight />
                </button>
            </div>
        </div>
    );
};

export default Handbook;
