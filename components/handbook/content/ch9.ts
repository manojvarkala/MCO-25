export const ch9Content = `
    <h3 class="text-xl font-bold">9.1 Core Technologies</h3>
    <p>The frontend application is built on a modern, high-performance technology stack designed for rapid development, type safety, and an excellent user experience.</p>
    <ul>
        <li><strong>Vite:</strong> A next-generation frontend tooling system that provides an extremely fast development server with Hot Module Replacement (HMR) and an optimized build process for production.</li>
        <li><strong>React:</strong> The core UI library for building the component-based user interface.</li>
        <li><strong>TypeScript:</strong> A superset of JavaScript that adds static typing. This is crucial for a large application, as it helps prevent common errors, improves code readability, and makes refactoring safer.</li>
        <li><strong>Tailwind CSS:</strong> A utility-first CSS framework that allows for rapid UI development by composing complex designs from a set of low-level utility classes directly in the markup.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">9.2 Key Dependencies</h3>
    <p>The project relies on a curated set of high-quality libraries to handle common tasks:</p>
    <ul>
        <li><strong><code>react-router-dom</code>:</strong> Manages all client-side routing, allowing for a fast, single-page application (SPA) experience.</li>
        <li><strong><code>lucide-react</code>:</strong> Provides a comprehensive library of clean, lightweight SVG icons.</li>
        <li><strong><code>@google/genai</code>:</strong> The official Google AI SDK for interacting with the Gemini API to power the AI feedback and content generation features.</li>
        <li><strong><code>jspdf</code> & <code>html2canvas</code>:</strong> Used in combination to generate high-quality, downloadable PDF certificates and documents directly in the browser.</li>
        <li><strong><code>react-hot-toast</code>:</strong> A lightweight and customizable library for showing notifications and feedback to the user.</li>
        <li><strong><code>jszip</code>:</strong> A library for creating, reading, and editing .zip files on the client-side, used for the dynamic WordPress plugin generator.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">9.3 Environment Variables</h3>
    <p>The application requires a <code>.env</code> file in the project root for configuration. This file is ignored by version control to keep sensitive information secure.</p>
    <pre class="text-xs bg-slate-100 p-3 rounded my-2 whitespace-pre-wrap font-mono"><code># The URL of your local or staging WordPress backend for API proxying in development
VITE_API_TARGET_URL=http://your-local-wordpress.site

# Your API key for Google Gemini, used for AI features
GEMINI_API_KEY=your-gemini-api-key-goes-here
</code></pre>
    <p>The Vite build process securely injects these variables into the application, ensuring that the <code>GEMINI_API_KEY</code> is available for client-side API calls while keeping it out of the public source code.</p>
`;
