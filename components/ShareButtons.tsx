import React, { FC } from 'react';
import { Twitter, Linkedin, Facebook } from 'lucide-react';

interface ShareButtonsProps {
    shareUrl: string;
    shareText: string;
    shareTitle?: string;
    size?: number;
}

const ShareButtons: FC<ShareButtonsProps> = ({ shareUrl, shareText, shareTitle, size = 16 }) => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    
    // LinkedIn's 'shareArticle' endpoint is more likely to accept title and summary than 'share-offsite'.
    const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle || '')}&summary=${encodeURIComponent(shareText)}`;
    
    // Facebook's sharer uses the 'quote' parameter to pre-populate text.
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;

    const openShareWindow = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    };

    return (
        <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs font-semibold text-[rgb(var(--color-text-muted-rgb))] hidden sm:inline mr-1">Share:</span>
            <button 
                onClick={() => openShareWindow(twitterUrl)} 
                title="Share on X" 
                className="p-1.5 rounded-full text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))] transition"
                aria-label="Share on X"
            >
                <Twitter size={size} />
            </button>
            <button 
                onClick={() => openShareWindow(linkedinUrl)} 
                title="Share on LinkedIn" 
                className="p-1.5 rounded-full text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))] transition"
                aria-label="Share on LinkedIn"
            >
                <Linkedin size={size} />
            </button>
            <button 
                onClick={() => openShareWindow(facebookUrl)} 
                title="Share on Facebook" 
                className="p-1.5 rounded-full text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))] transition"
                aria-label="Share on Facebook"
            >
                <Facebook size={size} />
            </button>
        </div>
    );
};

export default ShareButtons;