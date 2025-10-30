




import React, { FC, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, ShoppingCart, Code, ArrowLeft, History, BarChart3, Sparkles, BookOpen } from 'lucide-react';

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
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin" end className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
                        <LayoutDashboard size={18} />
                        <span>Admin Dashboard</span>
                    </NavLink>
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin/analytics" className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
                        <BarChart3 size={18} />
                        <span>Sales Analytics</span>
                    </NavLink>
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin/programs" className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
                        <Settings size={18} />
                        <span>Exam Programs</span>
                    </NavLink>
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin/products" className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
                        <ShoppingCart size={18} />
                        <span>Product Customizer</span>
                    </NavLink>
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin/content-engine" className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
                        <Sparkles size={18} />
                        <span>Content Engine</span>
                    </NavLink>
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin/integration" className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
                        <Code size={18} />
                        <span>Integration</span>
                    </NavLink>
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin/history" className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
                        <History size={18} />
                        <span>Dev History</span>
                    </NavLink>
                    {/* FIX: Updated NavLink for react-router-dom v6 */}
                    <NavLink to="/admin/handbook" className={({ isActive }) => isActive ? `${navLinkClass} ${activeNavLinkClass}` : navLinkClass}>
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