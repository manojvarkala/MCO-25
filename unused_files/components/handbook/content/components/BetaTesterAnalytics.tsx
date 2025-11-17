import React, { FC, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { BetaTester } from '../types.ts';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';
import { Users, ArrowUp, ArrowDown, CheckCircle, XCircle, Send } from 'lucide-react';

const BetaTesterAnalytics: FC = () => {
    const { token } = useAuth();
    const [testers, setTesters] = useState<BetaTester[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: keyof BetaTester | 'status'; direction: 'asc' | 'desc' }>({ key: 'registrationDate', direction: 'desc' });
    const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTesters = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const fetchedTesters = await googleSheetsService.adminGetBetaTesters(token);
                setTesters(fetchedTesters);
            } catch (error: any) {
                toast.error("Could not load beta tester data: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTesters();
    }, [token]);

    const handleSort = (key: keyof BetaTester | 'status' | 'tokenRedeemed') => {
        setSortConfig(currentConfig => {
            if (currentConfig.key === key) {
                return { key, direction: currentConfig.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const handleResendEmail = async (testerId: string, testerEmail: string) => {
        if (!token) return;
        setResendingEmailId(testerId);
        try {
            await googleSheetsService.adminResendBetaEmail(token, testerId);
            toast.success(`Welcome email resent to ${testerEmail}`);
        } catch (error: any) {
            toast.error(`Failed to resend email: ${error.message}`);
        } finally {
            setResendingEmailId(null);
        }
    };
    
    const sortedTesters = useMemo(() => {
        if (!sortConfig.key) return testers;

        const sortableData = [...testers];
        sortableData.sort((a, b) => {
            let aValue, bValue;
            
            if (sortConfig.key === 'status') {
                aValue = a.tokenRedeemed ? (new Date(a.expiryTimestamp * 1000) > new Date() ? 2 : 1) : 0;
                bValue = b.tokenRedeemed ? (new Date(b.expiryTimestamp * 1000) > new Date() ? 2 : 1) : 0;
            } else {
                 aValue = a[sortConfig.key as keyof BetaTester];
                 bValue = b[sortConfig.key as keyof BetaTester];
            }

            if (typeof aValue === 'number' || typeof aValue === 'boolean') {
                return sortConfig.direction === 'asc' ? (aValue as any) - (bValue as any) : (bValue as any) - (aValue as any);
            }
            
            const strA = aValue?.toString() || '';
            const strB = bValue?.toString() || '';
            
            return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });
        return sortableData;
    }, [testers, sortConfig]);

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <Users />
                Beta Tester Analytics
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                An overview of all users who have registered for the beta testing program.
            </p>
            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Spinner /></div>
                ) : testers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[rgb(var(--color-text-muted-rgb))] uppercase bg-[rgb(var(--color-muted-rgb))]">
                                <tr>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('name')}>Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('email')}>Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('country')}>Country {sortConfig.key === 'country' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('registrationDate')}>Reg. Date {sortConfig.key === 'registrationDate' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('tokenRedeemed')}>Redeemed {sortConfig.key === 'tokenRedeemed' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('expiryTimestamp')}>Expiry Date {sortConfig.key === 'expiryTimestamp' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                                    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('status')}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>)}</th>
                                    <th scope="col" className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTesters.map(tester => {
                                    const hasRedeemed = tester.tokenRedeemed;
                                    const isExpired = hasRedeemed && new Date(tester.expiryTimestamp * 1000) < new Date();
                                    
                                    let statusText = 'Pending';
                                    let statusClass = 'bg-yellow-100 text-yellow-800';
                                    let statusIcon = <XCircle size={12} />;

                                    if (hasRedeemed) {
                                        if (isExpired) {
                                            statusText = 'Expired';
                                            statusClass = 'bg-red-100 text-red-800';
                                        } else {
                                            statusText = 'Active';
                                            statusClass = 'bg-green-100 text-green-800';
                                            statusIcon = <CheckCircle size={12} />;
                                        }
                                    }
                                    
                                    return (
                                        <tr key={tester.id} className="border-b border-[rgb(var(--color-border-rgb))]">
                                            <td className="px-6 py-4 font-medium text-[rgb(var(--color-text-strong-rgb))]">{tester.name}</td>
                                            <td className="px-6 py-4">{tester.email}</td>
                                            <td className="px-6 py-4">{tester.country || 'N/A'}</td>
                                            <td className="px-6 py-4">{new Date(tester.registrationDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                {hasRedeemed ? <CheckCircle className="text-green-500 mx-auto" /> : <XCircle className="text-slate-400 mx-auto" />}
                                            </td>
                                            <td className="px-6 py-4">{hasRedeemed ? new Date(tester.expiryTimestamp * 1000).toLocaleDateString() : 'Pending'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                                                    {statusIcon}
                                                    {statusText}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {!hasRedeemed && (
                                                    <button 
                                                        onClick={() => handleResendEmail(tester.id, tester.email)} 
                                                        disabled={resendingEmailId === tester.id}
                                                        className="flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:text-cyan-800 disabled:opacity-50"
                                                    >
                                                        {resendingEmailId === tester.id ? <Spinner size="sm"/> : <Send size={14}/>}
                                                        Resend Email
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center p-8 text-[rgb(var(--color-text-muted-rgb))]">No beta testers have registered yet.</p>
                )}
            </div>
        </div>
    );
};

export default BetaTesterAnalytics;