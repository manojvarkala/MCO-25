import React, { FC } from 'react';
import type { User, Exam, TestResult, Organization } from '../types';

interface ShareableResultProps {
    user: User | null;
    exam: Exam | null;
    result: TestResult | null;
    organization: Organization | null;
}

const ShareableResult: FC<ShareableResultProps> = ({ user, exam, result }) => {
    if (!user || !exam || !result) {
        return <div>Loading Shareable Result...</div>;
    }
    return (
        <div style={{ border: '2px dashed #ccc', padding: '1rem', width: '1200px', height: '630px', color: 'black', background: 'white' }}>
            <h4 style={{ margin: 0, fontWeight: 'bold' }}>Shareable Result for {exam.name}</h4>
            <p>User: {user.name}</p>
            <p>Score: {result.score.toFixed(0)}%</p>
            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '1rem' }}>[Placeholder: Original component file was missing]</p>
        </div>
    );
};
export default ShareableResult;