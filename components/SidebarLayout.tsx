import React, { FC, ReactNode } from 'react';
import SuggestedBooksSidebar from './SuggestedBooksSidebar.tsx';

const SidebarLayout: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <main className="lg:col-span-2">
                {children}
            </main>
            <aside className="space-y-8">
                <SuggestedBooksSidebar />
            </aside>
        </div>
    );
};

export default SidebarLayout;