

import React, { FC } from 'react';
// FIX: Changed import of BookCover from default to named import to align with the module's export type.
import { BookCover } from './BookCover.tsx';
import { BookOpen, ExternalLink } from 'lucide-react';

interface ProgramRendererProps {
    program: {
        id: string;
        title: string;
        description: string;
        thumbnailUrl: string;
        permalink: string; // This is the React app's program URL, not WP permalink
    };
}

const ProgramRenderer: FC<ProgramRendererProps> = ({ program }) => {
    return (
        <div className="mco-single-book-card">
            <div className="mco-single-book-card__cover">
                <BookCover book={{
                    id: program.id,
                    title: program.title,
                    description: program.description,
                    thumbnailUrl: program.thumbnailUrl,
                    affiliateLinks: { com: '', in: '', ae: '' } // Affiliate links not relevant for program cover
                }} className="w-full h-full" />
            </div>
            <div className="mco-single-book-card__details">
                <h1>{program.title}</h1>
                <div className="mco-single-book-card__description" dangerouslySetInnerHTML={{ __html: program.description }} />
                
                <div className="mco-single-book-card__buttons">
                    <a href={program.permalink} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'auto', padding: '12px 30px', fontSize: '1.1rem' }} className="mco-book-btn mco-book-btn--primary">
                        View Program Details <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ProgramRenderer;