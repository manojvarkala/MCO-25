import React, { FC, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, ShoppingCart, Code, ArrowLeft, History, BarChart3, Sparkles, BookOpen, TrendingUp } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
    const navLinkClass = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]";
    const activeNavLinkClass = "bg-[rgba(var(--color-primary-rgb),0.1)] text-[rgb(var(--color-primary-rgb))]";

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <aside className="md:col-span-1 lg:col-span-1 bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] self-start sticky top-28">
                <nav className="space-y-2">
                    {/* FIX: Replaced react-router-dom v5 `exact` and `activeClassName` props with v6 syntax. The `end` prop ensures this link is only active on the exact path. */}
                    <NavLink to="/admin" end className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <LayoutDashboard size={18} />
                        <span>Admin Dashboard</span>
                    </NavLink>
                    {/* FIX: Replaced react-router-dom v5 `activeClassName` prop with v6 className function. */}
                    <NavLink to="/admin/analytics" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <BarChart3 size={18} />
                        <span>Sales Analytics</span>
                    </NavLink>
                    <NavLink to="/admin/exam-analytics" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <TrendingUp size={18} />
                        <span>Exam Analytics</span>
                    </NavLink>
                    {/* FIX: Replaced react-router-dom v5 `activeClassName` prop with v6 className function. */}
                    <NavLink to="/admin/programs" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <Settings size={18} />
                        <span>Exam Programs</span>
                    </NavLink>
                    {/* FIX: Replaced react-router-dom v5 `activeClassName` prop with v6 className function. */}
                    <NavLink to="/admin/products" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <ShoppingCart size={18} />
                        <span>Product Customizer</span>
                    </NavLink>
                    {/* FIX: Replaced react-router-dom v5 `activeClassName` prop with v6 className function. */}
                    <NavLink to="/admin/content-engine" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <Sparkles size={18} />
                        <span>Content Engine</span>
                    </NavLink>
                    {/* FIX: Replaced react-router-dom v5 `activeClassName` prop with v6 className function. */}
                    <NavLink to="/admin/integration" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <Code size={18} />
                        <span>Integration</span>
                    </NavLink>
                    {/* FIX: Replaced react-router-dom v5 `activeClassName` prop with v6 className function. */}
                    <NavLink to="/admin/history" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <History size={18} />
                        <span>Dev History</span>
                    </NavLink>
                    {/* FIX: Replaced react-router-dom v5 `activeClassName` prop with v6 className function. */}
                    <NavLink to="/admin/handbook" className={({ isActive }) => `${navLinkClass} ${isActive ? activeNavLinkClass : ''}`}>
                        <BookOpen size={18} />
                        <span>Handbook</span>
                    </NavLink>
                    <div className="pt-4 mt-4 border-t border-[rgb(var(--color-border-rgb))]">
                        <NavLink to="/dashboard" className={navLinkClass}>
                            <ArrowLeft size={18} />
                            <span>Back to App</span>
                        </NavLink>
                    </div>
                </nav>
            </aside>
            <main className="md:col-span-3 lg:col-span-4">
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;