
import React, { FC, ReactNode } from 'react';
import SuggestedBooksSidebar from './SuggestedBooksSidebar.tsx';

interface SidebarLayoutProps {
  children: ReactNode;
}

const SidebarLayout: FC<SidebarLayoutProps> = ({ children }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <main className="lg:col-span-3">
                {children}
            </main>
            <aside className="space-y-8">
                <SuggestedBooksSidebar />
            </aside>
        </div>
    );
};

export default SidebarLayout;
