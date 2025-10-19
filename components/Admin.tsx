import React, { FC, useState, useCallback, ReactNode } from 'react';
import { Settings, Award, Lightbulb, PlusCircle, Trash2, RefreshCw, FileText, Cpu, Loader, CheckCircle, XCircle, Trash, Bug, Paintbrush, FileSpreadsheet, DownloadCloud, DatabaseZap, Check, Sparkles, UploadCloud } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { DebugData, Organization } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';
import DebugSidebar from './DebugSidebar.tsx';

// ... (HealthCheckItem, other utility components remain the same) ...

const Admin: FC = () => {
    // ... (All existing state and handlers for health check, CSV downloads, etc. remain the same) ...
    const { activeOrg, availableThemes, activeTheme, setActiveTheme, updateConfigData } = useAppContext();
    const { token } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingWooCsv, setIsGeneratingWooCsv] = useState(false);
    const [isGeneratingProgramsCsv, setIsGeneratingProgramsCsv] = useState(false);
    
    const handleGenerateWooCsv = () => { /* ... existing logic ... */ };
    const handleGenerateProgramsCsv = () => { /* ... existing logic ... */ };
    
    const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            toast.error("File size cannot exceed 50MB.");
            return;
        }

        if (!token) {
            toast.error("Authentication session has expired.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Uploading and processing video...');

        try {
            const result = await googleSheetsService.adminUploadIntroVideo(token, file);
            if (result.organizations && result.examPrices) {
                updateConfigData(result.organizations, result.examPrices);
            }
            toast.success('Intro video updated successfully!', { id: toastId });
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload video.', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <>
            {/* ... (DebugSidebar and other top-level elements remain) ... */}
            <div className="space-y-8">
                {/* ... (Existing sections: Admin Dashboard, System Health Check) ... */}

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <Paintbrush className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Branding &amp; Media
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Manage your portal's visual identity. Changes saved here will be reflected on your WordPress backend and require a cache clear to update in the app.
                    </p>
                    <table className="form-table">
                        <tbody>
                            <tr>
                                <th scope="row">Intro Video</th>
                                <td>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            id="video-upload"
                                            className="hidden"
                                            accept="video/mp4,video/quicktime"
                                            onChange={handleVideoUpload}
                                            disabled={isUploading}
                                        />
                                        <label
                                            htmlFor="video-upload"
                                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                                        >
                                            {isUploading ? <Spinner size="sm" /> : <UploadCloud size={16} />}
                                            <span className="ml-2">{isUploading ? 'Uploading...' : 'Upload New Video'}</span>
                                        </label>
                                        <p className="text-xs text-slate-500">MP4 or MOV format, max 50MB.</p>
                                    </div>
                                    {activeOrg?.introVideoUrl && (
                                        <div className="mt-4">
                                            <p className="text-sm font-semibold">Current Video:</p>
                                            <video src={activeOrg.introVideoUrl} controls className="mt-2 rounded-lg max-w-sm" />
                                        </div>
                                    )}
                                </td>
                            </tr>
                            {/* ... (Existing theme selector logic) ... */}
                        </tbody>
                    </table>
                </div>

                {/* ... (Existing sections: Cache & Data, Google Sheet Tester, Bulk Data) ... */}

                 <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                        <FileSpreadsheet className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                        Bulk Data Management
                    </h2>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                        Streamline your content creation by exporting existing data for bulk editing, or downloading empty templates.
                    </p>
                    <div className="space-y-3">
                        <div>
                            <button
                                onClick={handleGenerateProgramsCsv}
                                disabled={isGeneratingProgramsCsv}
                                className="inline-flex items-center justify-center px-4 py-2 border border-[rgb(var(--color-border-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-text-default-rgb))] bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] disabled:opacity-50"
                            >
                                {isGeneratingProgramsCsv ? <Spinner size="sm" /> : <DownloadCloud size={16} className="mr-2"/>}
                                {isGeneratingProgramsCsv ? 'Generating...' : 'Generate Exam Programs CSV from Data'}
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={handleGenerateWooCsv}
                                disabled={isGeneratingWooCsv}
                                className="inline-flex items-center justify-center px-4 py-2 border border-[rgb(var(--color-border-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-text-default-rgb))] bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] disabled:opacity-50"
                            >
                                {isGeneratingWooCsv ? <Spinner size="sm" /> : <DownloadCloud size={16} className="mr-2"/>}
                                {isGeneratingWooCsv ? 'Generating...' : 'Generate WooCommerce Products CSV from Programs'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ... (Existing Certificate Templates Overview section) ... */}
            </div>
        </>
    );
};
export default Admin;