import * as React from 'react';
import { Cpu, Zap, Share2, Globe, FileJson, Settings, ExternalLink, HardDrive, ArrowRight, Dna, Rocket } from 'lucide-react';

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
            {icon}
            <span className="ml-3">{title}</span>
        </h2>
        <div className="space-y-4 text-slate-600">{children}</div>
    </div>
);

const FlowStep: React.FC<{ number: number; title: string; children: React.ReactNode; isLast?: boolean }> = ({ number, title, children, isLast = false }) => (
    <div className="flex">
        <div className="flex flex-col items-center mr-4">
            <div>
                <div className="flex items-center justify-center w-10 h-10 border rounded-full bg-cyan-500 text-white font-bold">
                    {number}
                </div>
            </div>
            {!isLast && <div className="w-px h-full bg-slate-300" />}
        </div>
        <div className="pb-8">
            <p className="mb-2 text-xl font-bold text-slate-700">{title}</p>
            <div className="text-slate-600">{children}</div>
        </div>
    </div>
);

const SuperAdminBlueprint: React.FC = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center">
                <Cpu className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-4xl font-extrabold text-slate-900 mt-4">Annapoorna Examination App</h1>
                <p className="mt-2 text-xl text-slate-500">Superadmin Architectural Blueprint & Onboarding Guide</p>
            </div>

            <Section title="The Multi-Tenant Vision: Engine vs. Fuel" icon={<Dna className="text-cyan-500" />}>
                <p>
                    Our platform is built on a powerful multi-tenant architecture. This separates the core application logic (the <strong>Engine</strong>) from the subject-specific content (the <strong>Fuel</strong>). This design allows us to launch new, white-labeled exam portals for different clients with minimal effort and no changes to the main codebase.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2"><Settings /> The Platform (Engine)</h4>
                        <p className="text-sm mt-2">The single, reusable application hosted on Vercel. It includes the user system, exam player, results engine, and admin panels.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2"><Zap /> The Content (Fuel)</h4>
                        <p className="text-sm mt-2">Client-specific data stored in external JSON configuration files. This includes branding, exam lists, question sources, and book recommendations.</p>
                    </div>
                </div>
            </Section>

            <Section title="Architectural Flowchart" icon={<Share2 className="text-cyan-500" />}>
                <p>This diagram shows how a user request to a client's custom domain is resolved and served by our single application engine.</p>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-center font-sans">
                    <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 text-sm">
                        <div className="p-3 bg-white rounded shadow border"><strong>User Request</strong><br /><span className="text-cyan-600 font-mono">exams.client.com</span></div>
                        <ArrowRight className="text-slate-400 my-2 md:my-0" />
                        <div className="p-3 bg-white rounded shadow border"><strong>DNS</strong><br />(CNAME Record)</div>
                        <ArrowRight className="text-slate-400 my-2 md:my-0" />
                        <div className="p-3 bg-white rounded shadow border"><strong>Vercel Platform</strong><br />(Single App Engine)</div>
                        <ArrowRight className="text-slate-400 my-2 md:my-0" />
                        <div className="p-3 bg-white rounded shadow border"><strong>React App Loads</strong><br /><span>Detects Hostname</span></div>
                        <ArrowRight className="text-slate-400 my-2 md:my-0" />
                        <div className="p-3 bg-white rounded shadow border"><strong>Fetches Config</strong><br /><span className="text-cyan-600 font-mono">client-config.json</span></div>
                        <ArrowRight className="text-slate-400 my-2 md:my-0" />
                        <div className="p-3 bg-green-100 rounded shadow border border-green-300 text-green-800"><strong>Themed App is Served</strong><br />(Client's Branding)</div>
                    </div>
                </div>
            </Section>

            <Section title="Guide: Onboarding a New Tenant (Client)" icon={<Rocket className="text-cyan-500" />}>
                <FlowStep number={1} title="Create the Configuration File">
                    <p>Copy the existing <code>public/medical-coding-config.json</code> file and rename it for the new tenant (e.g., <code>public/law-school-config.json</code>). This file is the "Fuel" for the new client.</p>
                    <p className="mt-2"><strong>Customize the following sections:</strong></p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                        <li><strong>Organization Details:</strong> Update the <code>id</code>, <code>name</code>, <code>website</code>, and <code>logo</code>.</li>
                        <li><strong>Exams:</strong> Define all practice and certification exams. Ensure each exam has a unique <code>id</code> and a correct <code>questionSourceUrl</code> pointing to a Google Sheet.</li>
                        <li><strong>Product Categories:</strong> Link practice exams to their corresponding certification exams.</li>
                        <li><strong>Certificate Templates & Suggested Books:</strong> Customize as needed for the new subject matter.</li>
                    </ul>
                </FlowStep>
                <FlowStep number={2} title="Host the Configuration File">
                    <p>Place the new JSON configuration file inside the <code>/public</code> directory of the application repository. This makes it publicly accessible via a URL (e.g., <code>https://your-app-domain.com/law-school-config.json</code>).</p>
                    <p className="mt-2 text-sm text-slate-500">
                        <strong>Future State:</strong> This process will be managed through a Superadmin UI that uploads and stores these files in a dedicated cloud storage solution like Amazon S3.
                    </p>
                </FlowStep>
                <FlowStep number={3} title="Configure the Client's Domain on Vercel">
                    <p>You need to link the client's desired custom domain (e.g., <code>exams.lawschool.edu</code>) to our Vercel project.</p>
                     <ol className="list-decimal pl-5 mt-2 space-y-1">
                        <li>Go to the Annapoorna Examination App project dashboard on Vercel.</li>
                        <li>Navigate to the <strong>Settings &rarr; Domains</strong> tab.</li>
                        <li>Enter the client's full domain or subdomain and click "Add".</li>
                        <li>Vercel will provide you with a <strong>CNAME record value</strong> (e.g., <code>cname.vercel-dns.com</code>). Copy this value.</li>
                    </ol>
                </FlowStep>
                 <FlowStep number={4} title="Instruct the Client on DNS Setup">
                    <p>The client must update the DNS records for their domain. Send them the following instructions with the CNAME value you copied from Vercel:</p>
                    <div className="mt-2 p-4 bg-slate-100 border-l-4 border-cyan-500 text-sm">
                        <p>
                            "To point your domain to the exam platform, please log in to your domain registrar (e.g., GoDaddy, Cloudflare) and add the following CNAME record:"
                        </p>
                        <ul className="list-disc pl-5 mt-2">
                            <li><strong>Type:</strong> <code>CNAME</code></li>
                            <li><strong>Name / Host:</strong> <code>exams</code> (or the relevant subdomain)</li>
                            <li><strong>Value / Target:</strong> <code>cname.vercel-dns.com</code></li>
                        </ul>
                        <p className="mt-2">
                           "It may take a few hours for these changes to take effect. Vercel will automatically provision a free SSL certificate once the domain is pointing correctly."
                        </p>
                    </div>
                </FlowStep>
                 <FlowStep number={5} title="Link Domain to Config File (Future)" isLast>
                    <p>The final step is to create a mapping that tells our application which config file to load for which domain.</p>
                    <p className="mt-2 text-sm text-slate-500">
                        <strong>Current State:</strong> This is not yet automated. The app currently only loads the default medical coding config.
                    </p>
                     <p className="mt-2 text-sm text-slate-500">
                        <strong>Future State:</strong> A Superadmin dashboard will have a section to map a hostname (e.g., <code>exams.lawschool.edu</code>) to a config file URL (e.g., <code>/law-school-config.json</code>). The application will then dynamically load the correct "Fuel" based on the domain the user is visiting.
                    </p>
                </FlowStep>
            </Section>
        </div>
    );
};

export default SuperAdminBlueprint;