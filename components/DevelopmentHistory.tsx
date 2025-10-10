import React, { FC } from 'react';
import { GitCommit, Tag } from 'lucide-react';

interface Version {
  version: string;
  date: string;
  changes: string[];
}

const history: Version[] = [
  {
    version: '2.1.0',
    date: '2024-07-15',
    changes: [
      'Added AI Content Engine for automated blog post creation.',
      'Introduced Admin Panel Sales Analytics dashboard.',
      'Implemented Bulk Edit functionality for Exam Programs.',
      'Enhanced multi-tenancy configuration and theming.',
    ],
  },
  {
    version: '2.0.0',
    date: '2024-06-20',
    changes: [
      'Major UI overhaul with a new, cleaner design system.',
      'Introduced the in-app Admin Panel for managing content.',
      'Added the "Spin & Win" gamification feature.',
      'Integrated Google Gemini for AI-powered feedback.',
    ],
  },
  {
    version: '1.5.0',
    date: '2024-05-10',
    changes: [
      'Implemented WooCommerce Subscriptions and Bundle product support.',
      'Added the "Book Store" with affiliate links.',
      'Enhanced certificate generation with more customization.',
    ],
  },
  {
    version: '1.0.0',
    date: '2024-04-01',
    changes: [
      'Initial launch of the Headless React Examination Engine.',
      'Core features: SSO with WordPress, exam player, results page.',
      'Basic multi-tenancy support via static configuration.',
    ],
  },
];

const DevelopmentHistory: FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display mb-4">Development History</h1>
            <p className="text-lg text-[rgb(var(--color-text-muted-rgb))] mb-8">
                A timeline of major features and updates to the Examination Engine platform.
            </p>

            <div className="relative border-l-2 border-slate-200 ml-4 pl-8">
                {history.map((item) => (
                    <div key={item.version} className="mb-12">
                        <span className="absolute -left-5 flex items-center justify-center bg-white w-10 h-10 rounded-full ring-4 ring-slate-200">
                            <Tag className="h-5 w-5 text-cyan-600" />
                        </span>
                        <div className="ml-4">
                            <time className="block mb-1 text-sm font-normal leading-none text-slate-400">{item.date}</time>
                            <h3 className="text-2xl font-semibold text-slate-800">{`Version ${item.version}`}</h3>
                            <ul className="mt-2 space-y-2 list-disc pl-5 text-slate-600">
                                {item.changes.map((change, i) => (
                                    <li key={i}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
                <span className="absolute -left-5 flex items-center justify-center bg-slate-800 w-10 h-10 rounded-full ring-4 ring-slate-200">
                    <GitCommit className="h-5 w-5 text-white" />
                </span>
            </div>
        </div>
    );
};

export default DevelopmentHistory;
