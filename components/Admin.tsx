import React, { FC, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Settings, ExternalLink, Edit, Save, X, Book, FileSpreadsheet, Award, Type, Lightbulb, Users, Gift, PlusCircle, Trash2, RotateCcw, Search, UserCheck, Paintbrush, ShoppingCart, Code, BarChart3, RefreshCw, FileText, Percent, BadgeCheck, BadgeX, BarChart, TrendingUp, Cpu, Video, DownloadCloud, Loader, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { Exam, SearchedUser, ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';

type HealthStatus = 'idle' | 'success' | 'failed' | 'loading';

interface HealthCheckItemProps {
    status: HealthStatus;
    title: string;
    message: string | ReactNode;
    troubleshooting?: ReactNode;
}

interface HealthCheckState {
    connectivity: { status: HealthStatus; message: ReactNode };
    apiEndpoint: { status: HealthStatus; message: ReactNode };
    authentication: { status: HealthStatus; message: ReactNode };
}

const decodeHtmlEntities = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return text;
    }
};

const HealthCheckItem: FC<HealthCheckItemProps> = ({ status, title, message, troubleshooting }) => {
    const StatusIcon = {
        idle: <div className="w-5 h-5 bg-slate-300 rounded-full flex-shrink-0"></div>,
        loading: <Loader size={20} className="text-blue-500 animate-spin flex-shrink-0" />,
        success: <CheckCircle size={20} className="text-green-500 flex-shrink-0" />,
        failed: <XCircle size={20} className="text-red-500 flex-shrink-0" />,
    }[status];

    const statusColorClass = {
        idle: 'text-slate-500',
        loading: 'text-blue-600',
        success: 'text-green-600',
        failed: 'text-red-600',
    }[status];

    return (
        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            {StatusIcon}
            <div className="flex-grow">
                <h4 className={`font-bold ${statusColorClass}`}>{title}</h4>
                <div className="text-sm text-slate-600">{message}</div>
                {status === 'failed' && troubleshooting && (
                    <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
                        <h5 className="font-bold mb-1">Troubleshooting Tip</h5>
                        {troubleshooting}
                    </div>
                )}
            </div>
        </div>
    );
};

const Admin: FC = () => {
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();
    
    // State for health check
    const [healthCheckStatus, setHealthCheckStatus] = useState<HealthCheckState>({
        connectivity: { status: 'idle', message: '' },
        apiEndpoint: { status: 'idle', message: '' },
        authentication: { status: 'idle', message: '' },
    });
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    // State for CSV downloads
    const [isGeneratingWooCsv, setIsGeneratingWooCsv] = useState(false);

    const certificateTemplates = activeOrg?.certificateTemplates || [];

    const handleRunHealthCheck = async () => {
        setIsCheckingHealth(true);
        const baseUrl = getApiBaseUrl();
        const initialStatus: HealthCheckState = {
            connectivity: { status: 'loading', message: 'Pinging server...' },
            apiEndpoint: { status: 'idle', message: '' },
            authentication: { status: 'idle', message: '' },
        };
        setHealthCheckStatus(initialStatus);
    
        // Check 1: Basic Connectivity
        try {
            const response = await fetch(`${baseUrl}/wp-json/`);
            if (!response.ok) throw new Error(`Server responded with HTTP status ${response.status}`);
            setHealthCheckStatus(prev => ({ ...prev, connectivity: { status: 'success', message: <>Server is reachable at <code className="bg-slate-200 px-1 rounded">{baseUrl}</code></> } }));
    
            // Check 2: API Endpoint
            setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'loading', message: 'Checking for plugin API...' } }));
            try {
                const apiResponse = await fetch(`${baseUrl}/wp-json/mco-app/v1/config`);
                if (!apiResponse.ok) throw new Error(`Server responded with HTTP status ${apiResponse.status}`);
                setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'success', message: 'Plugin API endpoint is active.' } }));
    
                // Check 3: Authentication
                setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'loading', message: 'Testing authentication...' } }));
                try {
                    if (!token) throw new Error('No admin token available in the app.');
                    await googleSheetsService.getDebugDetails(token);
                    setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'success', message: 'Authentication and CORS are correctly configured.' } }));
                } catch (authError: any) {
                    setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'failed', message: authError.message } }));
                }
    
            } catch (apiError: any) {
                setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'failed', message: apiError.message }, authentication: { status: 'idle', message: '' } }));
            }
    
        } catch (connError: any) {
            setHealthCheckStatus(prev => ({
                ...prev,
                connectivity: { status: 'failed', message: connError.message },
                apiEndpoint: { status: 'idle', message: '' },
            }));
        } finally {
            setIsCheckingHealth(false);
        }
    };
    
    const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) return '';
        if (typeof field === 'boolean') return field ? '1' : '0';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const createCsvContent = (headers: string[], data: any[][]): string => {
        const headerRow = headers.map(escapeCsvField).join(',');
        const dataRows = data.map(row => row.map(escapeCsvField).join(','));
        return [headerRow, ...dataRows].join('\n');
    };

    const downloadCsv = (csvContent: string, filename: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handleGenerateWooCsv = () => {
        if (!activeOrg?.examProductCategories || !activeOrg.exams) {
            toast.error("Exam data not loaded.");
            return;
        }
        setIsGeneratingWooCsv(true);
        const toastId = toast.loading('Generating WooCommerce products CSV...', { id: 'generate-woo-csv' });

        try {
            const headers = ['Type', 'SKU', 'Name', 'Published', 'Virtual', 'Regular price', 'Sale price'];
            const data = activeOrg.examProductCategories
                .map(category => {
                    const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);
                    if (certExam) {
                        return [
                            'simple',
                            certExam.productSku,
                            category.name,
                            1,
                            1,
                            certExam.regularPrice ?? '',
                            certExam.price ?? ''
                        ];
                    }
                    return null;
                })
                .filter(row => row !== null);

            if (data.length === 0) {
                toast.error('No certification exams found to generate products for.', { id: toastId });
                return;
            }

            const csvContent = createCsvContent(headers, data as any[][]);
            downloadCsv(csvContent, 'woo_products_from_programs.csv');
            toast.success('WooCommerce products CSV generated!', { id: toastId });
        } catch (error: any) {
            console.error("Failed to generate WooCommerce products CSV", error);
            toast.error('Failed to generate products CSV.', { id: toastId });
        } finally {
            setIsGeneratingWooCsv(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Admin Dashboard</h1>

            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                    <Cpu className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    System Health Check
                </h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                    If you are experiencing "No route found" errors when saving, or other connection issues, run this health check. It will test the connection to your WordPress backend and provide troubleshooting steps for common server configuration problems.
                </p>
                <button
                    onClick={handleRunHealthCheck}
                    disabled={isCheckingHealth}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
                >
                    {isCheckingHealth ? <Spinner size="sm" /> : <RefreshCw size={20} />}
                    <span className="ml-2">{isCheckingHealth ? 'Running Checks...' : 'Run System Health Check'}</span>
                </button>
                {healthCheckStatus.connectivity.status !== 'idle' && (
                    <div className="mt-6 space-y-4">
                        <HealthCheckItem status={healthCheckStatus.connectivity.status} title="Server Connectivity" message={healthCheckStatus.connectivity.message} />
                        <HealthCheckItem status={healthCheckStatus.apiEndpoint.status} title="Plugin API Endpoint" message={healthCheckStatus.apiEndpoint.message} />
                        <HealthCheckItem 
                            status={healthCheckStatus.authentication.status} 
                            title="Authentication & CORS" 
                            message={healthCheckStatus.authentication.message}
                            troubleshooting={
                                <div className="space-y-3">
                                    <p>This error almost always means your server is stripping the "Authorization" header from API requests.</p>
                                    <div>
                                        <strong className="text-amber-900">Primary Solution (for Apache/LiteSpeed servers):</strong>
                                        <p>Add the following code to the <strong>very top</strong> of your <code>.htaccess</code> file in the WordPress root directory (before the <code># BEGIN WordPress</code> block):</p>
                                        <pre className="whitespace-pre-wrap bg-slate-100 p-2 rounded my-1 text-xs"><code>
{`<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
</IfModule>`}
                                        </code></pre>
                                        <p>After adding this, clear any server or plugin caches.</p>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                )}
            </div>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                    <FileSpreadsheet className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    Bulk Data Management
                </h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                    Streamline your content creation with this three-step workflow for bulk importing exam programs and their corresponding WooCommerce products.
                </p>

                <div className="space-y-4 p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                    <ol className="list-decimal list-inside space-y-4 text-[rgb(var(--color-text-muted-rgb))]">
                        <li>
                            <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 1: Upload Exam Programs CSV</strong><br />
                            Download the template, fill it with your exam program data, then upload it in your WordPress admin under <a href={`${getApiBaseUrl()}/wp-admin/admin.php?page=mco-exam-engine&tab=bulk_import`} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary-rgb))] font-semibold hover:underline">Exam App Engine &rarr; Bulk Import</a>.
                            <div className="flex flex-wrap gap-2 mt-2">
                                <a href="/template-exam-programs.csv" download className="inline-flex items-center justify-center px-3 py-1.5 border border-[rgb(var(--color-border-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-text-default-rgb))] bg-[rgb(var(--color-card-rgb))] hover:bg-[rgb(var(--color-muted-rgb))]">
                                    <DownloadCloud size={16} className="mr-2"/> Download Exam Program Template
                                </a>
                            </div>
                        </li>
                        <li>
                            <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 2: Generate WooCommerce Products CSV</strong><br />
                            Once your programs are uploaded, click the button below. This will generate a new CSV file, pre-filled with the product details for each of your new certification exams.
                             <div className="flex flex-wrap gap-2 mt-2">
                                <button
                                    onClick={handleGenerateWooCsv}
                                    disabled={isGeneratingWooCsv}
                                    className="inline-flex items-center justify-center px-3 py-1.5 border border-[rgb(var(--color-primary-rgb))] text-sm font-medium rounded-md text-[rgb(var(--color-primary-rgb))] bg-[rgba(var(--color-primary-rgb),0.1)] hover:bg-[rgba(var(--color-primary-rgb),0.2)] disabled:opacity-50"
                                >
                                    {isGeneratingWooCsv ? <Spinner size="sm" /> : <FileText size={16} className="mr-2"/>}
                                    {isGeneratingWooCsv ? 'Generating...' : 'Generate & Download WooCommerce Products CSV'}
                                </button>
                            </div>
                        </li>
                        <li>
                            <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 3: Upload WooCommerce Products CSV</strong><br />
                            Review the generated CSV (you can adjust pricing here). Then, upload it in your WordPress admin under <a href={`${getApiBaseUrl()}/wp-admin/edit.php?post_type=product&page=product_importer`} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--color-primary-rgb))] font-semibold hover:underline">WooCommerce &rarr; Products &rarr; Import</a>.
                        </li>
                    </ol>
                </div>
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                    <Award className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    Certificate Templates Overview
                </h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                    This is a read-only overview of the certificate templates configured in your WordPress backend. To edit these, go to <strong>Exam App Engine &rarr; Certificate Templates</strong> in your WP admin dashboard.
                </p>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                    {certificateTemplates.map(template => (
                        <div key={template.id} className="bg-[rgb(var(--color-muted-rgb))] p-3 rounded-md border border-[rgb(var(--color-border-rgb))]">
                            <p className="font-semibold text-[rgb(var(--color-text-strong-rgb))]">{template.name || `ID: ${template.id}`}</p>
                            <p className="text-xs text-[rgb(var(--color-text-muted-rgb))] truncate" title={template.title}>Title: "{template.title}"</p>
                        </div>
                    ))}
                    {certificateTemplates.length === 0 && (
                        <p className="text-[rgb(var(--color-text-muted-rgb))] text-center py-4">No certificate templates found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Admin;