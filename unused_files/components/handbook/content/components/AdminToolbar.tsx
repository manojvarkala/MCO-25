import React, { FC, useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Bug, Users, Ghost, X } from 'lucide-react';

interface AdminToolbarProps {
    onToggleDebug: () => void;
}

const AdminToolbar: FC<AdminToolbarProps> = ({ onToggleDebug }) => {
    const { masqueradeAs, startMasquerade } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);

    const isMasquerading = masqueradeAs !== 'none';

    // Close the expanded menu if clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [toolbarRef]);

    if (isMasquerading) {
        // While masquerading, we don't show the toolbar, only the top banner.
        return null;
    }

    const mainButtonClass = "flex items-center justify-center w-14 h-14 rounded-full bg-[rgb(var(--color-primary-rgb))] text-white shadow-lg hover:bg-[rgb(var(--color-primary-hover-rgb))] transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--color-primary-rgb))]";

    return (
        <div ref={toolbarRef} className="fixed bottom-5 right-5 z-[100] flex flex-col items-center gap-3">
            {isExpanded && (
                <div className="flex flex-col items-center gap-3 bg-[rgb(var(--color-card-rgb))] p-3 rounded-lg shadow-2xl border border-[rgb(var(--color-border-rgb))]">
                    <button
                        onClick={onToggleDebug}
                        title="Launch Debug Sidebar"
                        className="flex w-full items-center gap-2 p-2 rounded-md text-sm font-semibold text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]"
                    >
                        <Bug size={18} /> <span>Debug</span>
                    </button>
                    <button
                        onClick={() => startMasquerade('user')}
                        title="View as a logged-in user"
                        className="flex w-full items-center gap-2 p-2 rounded-md text-sm font-semibold text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]"
                    >
                        <Users size={18} /> <span>View as User</span>
                    </button>
                    <button
                        onClick={() => startMasquerade('visitor')}
                        title="View as a visitor"
                        className="flex w-full items-center gap-2 p-2 rounded-md text-sm font-semibold text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]"
                    >
                        <Ghost size={18} /> <span>View as Visitor</span>
                    </button>
                </div>
            )}
            <button
                onClick={() => setIsExpanded(prev => !prev)}
                className={mainButtonClass}
                aria-label={isExpanded ? "Close Admin Tools" : "Open Admin Tools"}
            >
                {isExpanded ? <X size={28} /> : <Shield size={28} />}
            </button>
        </div>
    );
};

export default AdminToolbar;
