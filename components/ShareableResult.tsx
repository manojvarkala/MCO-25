import React, { FC } from 'react';
import type { User, Exam, TestResult, Organization } from '../types.ts';
import Seal from '../assets/Seal.tsx';

interface ShareableResultProps {
    user: User | null;
    exam: Exam | null;
    result: TestResult | null;
    organization: Organization | null;
}

const ShareableResult: FC<ShareableResultProps> = ({ user, exam, result, organization }) => {
    if (!user || !exam || !result || !organization) {
        return null;
    }

    const isPassed = result.score >= exam.passScore;
    if (!isPassed) {
        return null; // Only generate artwork for passing results
    }
    
    const date = new Date(result.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div 
            style={{ width: '1200px', height: '630px' }} 
            className="p-12 bg-gradient-to-br from-green-500 to-emerald-700 text-white font-main flex flex-col justify-between"
        >
            {/* Header */}
            <header className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    {organization.logo && <img src={organization.logo} crossOrigin="anonymous" alt={`${organization.name} Logo`} className="h-20 w-20 object-contain" />}
                    <div>
                        <h1 className="text-3xl font-bold font-display">{organization.name}</h1>
                        <p className="text-lg text-white/80">www.{organization.website}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold">Verification of Achievement</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="text-center">
                <p className="text-2xl text-white/90">This is to certify that</p>
                <h2 className="text-7xl font-script my-4 py-2">{user.name}</h2>
                <p className="text-2xl text-white/90">has successfully passed the</p>
                <h3 className="text-4xl font-bold mt-3">{exam.name}</h3>
                <p className="text-2xl mt-4">with a score of <span className="font-bold">{result.score}%</span> on {date}</p>
            </main>

            {/* Footer */}
            <footer className="flex justify-between items-end">
                <div className="text-lg">
                    An <a href={`https://annapoornainfo.com`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">Annapoorna Infotech</a> Venture.
                </div>
                <Seal className="w-32 h-32" />
            </footer>
        </div>
    );
};

export default ShareableResult;
