import React, { FC, ReactNode } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { NavLink } = ReactRouterDOM as any;
import { useAuth } from '../context/AuthContext.tsx';
import { 
    LayoutDashboard, Settings, ShoppingCart, Code, 
    ArrowLeft, History, BarChart3, Sparkles, BookOpen, 
    TrendingUp, Users, FileCheck, Globe 
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
    const { isSuperAdmin } = useAuth();
    
    const baseClass = "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all border border-transparent";
    const activeClass = "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 border-cyan-400";
    const inactiveClass = "text-slate-400 hover:text-white hover:bg-slate-800/50 hover:border-slate-700";

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <aside className="md:col-span-1 lg:col-span-1 self-start sticky top-28">
                <nav className="space-y-2 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 shadow-2xl">
                    {isSuperAdmin && (
                        <div className="mb-6">
                            <p className="px-4 text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-3">Network Control</p>
                            <NavLink to="/admin/network" className={({ isActive }: any) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
                                <Globe size={18} />
                                <span>Network Hub</span>
                            </NavLink>
                        </div>
                    )}

                    <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">System Admin</p>
                    <div className="space-y-1">
                        {[
                            { to: "/admin", icon: <LayoutDashboard size={18} />, label: "Health Center", end: true },
                            { to: "/admin/analytics", icon: <BarChart3 size={18} />, label: "Sales & Revenue" },
                            { to: "/admin/exam-analytics", icon: <TrendingUp size={18} />, label: "Usage Data" },
                            { to: "/admin/user-results", icon: <FileCheck size={18} />, label: "Result Audits" },
                            { to: "/admin/beta-analytics", icon: <Users size={18} />, label: "Beta Testers" },
                            { to: "/admin/programs", icon: <Settings size={18} />, label: "Exam Master" },
                            { to: "/admin/products", icon: <ShoppingCart size={18} />, label: "Inventory" },
                            { to: "/admin/content-engine", icon: <Sparkles size={18} />, label: "AI Post Engine" },
                            { to: "/admin/integration", icon: <Code size={18} />, label: "Integrations" },
                            { to: "/admin/history", icon: <History size={18} />, label: "Logs" },
                            { to: "/admin/handbook", icon: <BookOpen size={18} />, label: "Admin Manual" },
                        ].map((link) => (
                            <NavLink 
                                key={link.to}
                                to={link.to} 
                                end={link.end}
                                className={({ isActive }: any) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}
                            >
                                {link.icon}
                                <span>{link.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <NavLink to="/dashboard" className={`${baseClass} ${inactiveClass}`}>
                            <ArrowLeft size={18} />
                            <span>Return to Portal</span>
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