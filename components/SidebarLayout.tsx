
import * as React from 'react';
import { Outlet } from 'react-router-dom';
import SuggestedBooksSidebar from './SuggestedBooksSidebar.tsx';

const SidebarLayout: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <main className="lg:col-span-2">
                <Outlet />
            </main>
            <aside className="space-y-8">
                <SuggestedBooksSidebar />
            </aside>
        </div>
    );
};

export default SidebarLayout;
