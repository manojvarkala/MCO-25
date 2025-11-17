import React, { FC } from 'react';

interface ShareButtonsProps {
    shareUrl: string;
    shareText: string;
    shareTitle: string;
    size?: number;
}

const ShareButtons: FC<ShareButtonsProps> = () => {
    return (
        <div style={{ fontSize: '0.8rem', color: 'rgb(var(--color-text-muted-rgb))' }}>
            [Share Buttons Placeholder]
        </div>
    );
};
export default ShareButtons;