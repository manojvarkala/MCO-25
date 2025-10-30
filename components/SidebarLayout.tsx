import React, { FC } from 'react';
import { Outlet } from 'react-router-dom';
import SuggestedBooksSidebar from './SuggestedBooksSidebar.tsx';

const SidebarLayout: FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <main className="lg:col-span-3">
                <Outlet />
            </main>
            <aside className="space-y-8">
                <SuggestedBooksSidebar />
            </aside>
        </div>
    );
};

export default SidebarLayout;
