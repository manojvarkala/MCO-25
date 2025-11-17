import React, { FC } from 'react';
import type { Exam, Organization } from '../types';

interface ExamBundleCardProps {
    certExam: Exam;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
    type: 'practice' | 'subscription';
}

const ExamBundleCard: FC<ExamBundleCardProps> = ({ certExam, type }) => {
    return (
        <div style={{ border: '2px dashed #ccc', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: 0, fontWeight: 'bold', color: 'rgb(var(--color-text-strong-rgb))' }}>{certExam.name} Bundle</h4>
            <p style={{ fontSize: '0.9rem', color: 'rgb(var(--color-text-muted-rgb))' }}>({type} bundle)</p>
            <p style={{ fontSize: '0.8rem', color: 'rgb(var(--color-text-muted-rgb))', marginTop: '1rem' }}>[Placeholder: Original component file was missing]</p>
        </div>
    );
};
export default ExamBundleCard;