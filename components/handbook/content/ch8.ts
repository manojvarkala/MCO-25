export const ch8Content = `
    <h3 class="text-xl font-bold">8.1 Frontend-First AI Architecture</h3>
    <p>The AI Content Engine was architected with a "frontend-first" approach to maximize security. The sensitive Google Gemini API key is stored exclusively as an environment variable in the React app and is never exposed to or stored in the WordPress backend.</p>
    <ol>
        <li>The admin uses the "Content Engine" UI in the React app to select parameters.</li>
        <li>The React app makes a direct, client-side call to the Google Gemini API using the secure API key.</li>
        <li>Once the AI generates the content, the React app sends this completed text to a secure, admin-only API endpoint in WordPress.</li>
        <li>The WordPress backend's only job is to receive the pre-generated content and use <code>wp_insert_post</code> to create and schedule the post.</li>
    </ol>
    <p>This ensures the API key remains confidential and leverages the secure environment of the frontend hosting platform.</p>

    <h3 class="text-xl font-bold mt-6">8.2 The AI Prompts</h3>
    <p>The quality of AI-generated content is entirely dependent on the quality of the prompt. We use a two-part prompt structure: a "System Instruction" to define the AI's persona and a "User Prompt" to provide the specific task.</p>
    
    <div class="bg-slate-50 border border-slate-200 p-4 rounded-lg my-4">
        <p class="font-bold text-slate-800">System Instruction:</p>
        <pre class="text-xs bg-slate-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono"><code>You are an expert SEO content writer specializing in educational and certification-based websites. Your task is to generate an engaging, well-structured, and SEO-friendly blog post. The output must be formatted using WordPress block editor syntax (Gutenberg blocks).</code></pre>
    </div>

    <div class="bg-slate-50 border border-slate-200 p-4 rounded-lg my-4">
        <p class="font-bold text-slate-800">Example User Prompt:</p>
        <pre class="text-xs bg-slate-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono"><code>Generate a blog post based on the following details:

Program Title: "CPC Certification Exam"
Program Description: "This comprehensive exam tests your mastery of CPT, HCPCS Level II, and ICD-10-CM coding for physician services."

The blog post should include these sections:
1. An engaging introduction.
2. "Why This Certification Matters"
3. "What You'll Learn"
4. "Career Opportunities"
5. A strong concluding paragraph.

Ensure all text is wrapped in appropriate WordPress block syntax.</code></pre>
    </div>
    
    <p>This structured approach ensures that the AI consistently produces well-organized, relevant, and properly formatted content that is ready to be published.</p>
`;
