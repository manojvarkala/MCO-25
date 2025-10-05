import React, { FC } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Settings, ShoppingCart, Code, ArrowLeft, History } from 'lucide-react';

const AdminLayout: FC = () => {
    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive
                ? 'bg-[rgba(var(--color-primary-rgb),0.1)] text-[rgb(var(--color-primary-rgb))]'
                : 'text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]'
        }`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <aside className="md:col-span-1 lg:col-span-1 bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] self-start sticky top-28">
                <nav className="space-y-2">
                    <NavLink to="/admin" end className={navLinkClass}>
                        <LayoutDashboard size={18} />
                        <span>Admin Dashboard</span>
                    </NavLink>
                    <NavLink to="/admin/programs" className={navLinkClass}>
                        <Settings size={18} />
                        <span>Exam Programs</span>
                    </NavLink>
                    <NavLink to="/admin/products" className={navLinkClass}>
                        <ShoppingCart size={18} />
                        <span>Product Customizer</span>
                    </NavLink>
                    <NavLink to="/admin/integration" className={navLinkClass}>
                        <Code size={18} />
                        <span>Integration</span>
                    </NavLink>
                    <NavLink to="/admin/history" className={navLinkClass}>
                        <History size={18} />
                        <span>Development History</span>
                    </NavLink>
                     <hr className="my-4 border-[rgb(var(--color-border-rgb))]" />
                    <NavLink to="/dashboard" className={navLinkClass}>
                        <ArrowLeft size={18} />
                        <span>Back to Main Site</span>
                    </NavLink>
                </nav>
            </aside>
            <main className="md:col-span-3 lg:col-span-4">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;