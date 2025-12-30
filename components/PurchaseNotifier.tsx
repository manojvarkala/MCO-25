
import React from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';

export default function PurchaseNotifier() {
    const { activeOrg } = useAppContext();

    const examNames = activeOrg?.exams
        .filter(e => !e.isPractice && e.price > 0 && e.name)
        .map(e => e.name)
        .slice(0, 6) // Limit to a reasonable number for variety
        || [
            'CPC Certification Exam',
            'CCA Certification Exam',
            'Medical Billing Certification',
            'CPB Certification Exam',
            'CRC Certification Exam',
            'Risk Adjustment Certification'
        ];
    
    const examsArrayString = JSON.stringify(examNames);

    const standaloneCode = `
<!-- START: MCO Live Purchase Notifier -->
<div id="mco-purchase-notifier" style="display: none; position: fixed; bottom: 1.5rem; left: 1.5rem; z-index: 9999; background-color: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1); border: 1px solid #e5e7eb; width: 100%; max-width: 320px; font-family: sans-serif;">
    <div style="display: flex; align-items: flex-start;">
        <div style="background-color: #dcfce7; padding: 0.5rem; border-radius: 9999px; margin-right: 1rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
        <div style="flex: 1;">
            <p id="mco-notifier-text" style="font-weight: bold; color: #1f2937; margin: 0;"></p>
            <p id="mco-notifier-subtext" style="font-size: 0.875rem; color: #4b5563; margin: 0;"></p>
            <p id="mco-notifier-time" style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;"></p>
        </div>
    </div>
</div>

<style>
    @keyframes mco-slide-in-up {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes mco-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    #mco-purchase-notifier.visible {
        display: block !important;
        animation: mco-slide-in-up 0.5s ease-out forwards;
    }
    #mco-purchase-notifier.hiding {
        animation: mco-fade-out 0.5s ease-in forwards;
    }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const notifierElement = document.getElementById('mco-purchase-notifier');
    if (!notifierElement) return;

    const notificationData = {
        names: ['John', 'Maria', 'David', 'Sarah', 'Michael', 'Jessica', 'Chris', 'Emily', 'Daniel', 'Laura'],
        locations: ['New York, NY', 'London, UK', 'Sydney, AU', 'Toronto, CA', 'Mumbai, IN', 'Los Angeles, CA', 'Chicago, IL', 'Dubai, AE'],
        exams: ${examsArrayString}
    };

    function getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function showNotification() {
        const name = getRandomItem(notificationData.names);
        const location = getRandomItem(notificationData.locations);
        const exam = getRandomItem(notificationData.exams);
        const time = (Math.floor(Math.random() * 10) + 1) + " minutes ago";

        document.getElementById('mco-notifier-text').innerText = name + ' from ' + location;
        document.getElementById('mco-notifier-subtext').innerText = 'Just purchased the "' + exam + '"';
        document.getElementById('mco-notifier-time').innerText = time;

        notifierElement.classList.remove('hiding');
        notifierElement.classList.add('visible');

        setTimeout(() => {
            notifierElement.classList.remove('visible');
            notifierElement.classList.add('hiding');
        }, 5000); // Visible for 5 seconds

        setTimeout(() => {
            if (!notifierElement.classList.contains('visible')) {
               notifierElement.style.display = 'none';
            }
        }, 5500); // Hide after animation
    }

    function startNotifier() {
        // Delay before showing the next notification
        const randomDelay = Math.random() * 15000 + 8000; // 8 to 23 seconds
        setTimeout(() => {
            showNotification();
            startNotifier();
        }, randomDelay);
    }
    
    // Start the loop after an initial delay
    setTimeout(startNotifier, 7000);
});
</script>
<!-- END: MCO Live Purchase Notifier -->
    `;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(standaloneCode.trim())
            .then(() => toast.success('Notifier code copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Could not copy code.');
            });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-800">Live Purchase Notifier Script</h1>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-2">Enhance Social Proof on Your Website</h2>
                <p className="mb-4">
                    This standalone script creates a small notification pop-up that displays fake, randomized purchase data. It helps create a sense of activity and social proof on your main website, encouraging new visitors to make a purchase.
                </p>
                <p className="mb-4">
                    To use this on your WordPress site, simply copy the code below and paste it into a "Custom HTML" block in your site's footer, or use a plugin that allows you to add scripts to your pages. It has no external dependencies and will start working immediately.
                </p>
                
                <div className="bg-slate-800 text-white p-4 rounded-lg relative font-mono text-sm">
                    <button 
                        onClick={copyToClipboard} 
                        className="absolute top-2 right-2 p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition"
                        title="Copy to clipboard"
                    >
                        <Copy size={16} />
                    </button>
                    <pre><code className="language-html">{standaloneCode.trim()}</code></pre>
                </div>
            </div>
        </div>
    );
}
