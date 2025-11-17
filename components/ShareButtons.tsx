import React, { FC } from 'react';
import { Share2, Twitter, Linkedin, Facebook, Mail } from 'lucide-react';

// A simple SVG for WhatsApp as it's not in Lucide
const WhatsAppIcon: FC<{ size?: number }> = ({ size = 24 }) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor">
        <title>WhatsApp</title>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52s-.67-.816-.923-.816-.524-.025-.72.025c-.198.05-.471.222-.72.496-.249.274-.966.943-.966 2.302 0 1.36 1.043 2.67 1.192 2.869.149.198.966 1.54 2.33 2.059.347.133.58.213.784.263.297.075.568.05.77.025.249-.025.767-.312.867-.61.099-.297.099-.568.075-.619-.025-.05-.198-.1-.471-.248zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6c-5.3 0-9.6-4.3-9.6-9.6S6.7 2.4 12 2.4s9.6 4.3 9.6 9.6-4.3 9.6-9.6 9.6z"/>
    </svg>
);


interface ShareButtonsProps {
    shareUrl: string;
    shareText: string;
    shareTitle: string;
    size?: number;
}

const ShareButtons: FC<ShareButtonsProps> = ({ shareUrl, shareText, shareTitle, size = 20 }) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const encodedText = encodeURIComponent(shareText);

    const socialLinks = [
        { 
            name: 'Twitter', 
            icon: <Twitter size={size} />, 
            url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
        },
        { 
            name: 'LinkedIn', 
            icon: <Linkedin size={size} />, 
            url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedText}`
        },
        { 
            name: 'Facebook', 
            icon: <Facebook size={size} />, 
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        },
        { 
            name: 'WhatsApp', 
            icon: <WhatsAppIcon size={size} />, 
            url: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`
        },
        { 
            name: 'Email', 
            icon: <Mail size={size} />, 
            url: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`
        }
    ];

    return (
        <div className="flex items-center gap-2">
            {socialLinks.map(social => (
                <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Share on ${social.name}`}
                    className="text-[rgb(var(--color-text-muted-rgb))] hover:text-[rgb(var(--color-primary-rgb))] transition-colors"
                >
                    {social.icon}
                </a>
            ))}
        </div>
    );
};
export default ShareButtons;