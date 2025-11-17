import React, { FC } from 'react';
import type { User, Exam, TestResult, Organization } from '../types';
import { Award, CheckCircle } from 'lucide-react';

interface ShareableResultProps {
    user: User | null;
    exam: Exam | null;
    result: TestResult | null;
    organization: Organization | null;
}

const ShareableResult: FC<ShareableResultProps> = ({ user, exam, result, organization }) => {
    if (!user || !exam || !result || !organization) {
        return <div style={{width: '1200px', height: '630px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>;
    }

    const isPassed = result.score >= exam.passScore;

    return (
        <div style={{
            width: '1200px',
            height: '630px',
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            color: '#0f172a',
        }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px', borderBottom: '2px solid #e2e8f0' }}>
                {organization.logo && (
                    <img src={organization.logo} alt={`${organization.name} Logo`} style={{ height: '70px', objectFit: 'contain' }} />
                )}
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>{organization.name}</h1>
                    <p style={{ fontSize: '16px', margin: '4px 0 0', color: '#64748b' }}>{organization.website}</p>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px' }}>
                <Award size={80} style={{ color: '#0891b2' }} />
                <p style={{ fontSize: '24px', color: '#475569', marginTop: '20px' }}>This is to certify that</p>
                <h2 style={{ fontSize: '64px', fontWeight: 'bold', color: '#1e293b', margin: '10px 0', lineHeight: 1.2 }}>
                    {user.name}
                </h2>
                <p style={{ fontSize: '28px', color: '#475569' }}>
                    has successfully passed the
                </p>
                <h3 style={{ fontSize: '40px', fontWeight: 'bold', color: '#0e7490', margin: '10px 0' }}>
                    {exam.name}
                </h3>
            </main>

            {/* Footer */}
            <footer style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '30px 40px',
                borderTop: '2px solid #e2e8f0',
                backgroundColor: 'rgba(255,255,255,0.5)'
            }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                     <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', color: '#64748b', margin: 0 }}>Final Score</p>
                        <p style={{ fontSize: '40px', fontWeight: 'bold', margin: 0, color: isPassed ? '#10b981' : '#ef4444' }}>
                            {result.score.toFixed(0)}%
                        </p>
                    </div>
                     <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', color: '#64748b', margin: 0 }}>Status</p>
                         <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '40px', fontWeight: 'bold', margin: 0, color: isPassed ? '#10b981' : '#ef4444' }}>
                            <CheckCircle size={32}/> {isPassed ? 'Passed' : 'Failed'}
                        </p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '18px', color: '#64748b', margin: 0 }}>Date Issued</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 0' }}>{new Date(result.timestamp).toLocaleDateString()}</p>
                </div>
            </footer>
        </div>
    );
};
export default ShareableResult;