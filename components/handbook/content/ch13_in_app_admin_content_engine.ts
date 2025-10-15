export const ch13_in_app_admin_content_engine = `
    <h2 class="text-3xl font-bold font-display text-slate-800" id="ch13">Chapter 13: AI Content Engine</h2>

    <h3 class="text-xl font-bold mt-6">13.1 The Power of Automated SEO Content</h3>
    <p>The AI Content Engine is a transformative tool designed to automate your content marketing efforts. Located at <strong>Admin → Content Engine</strong>, it leverages the Google Gemini API to turn your existing Exam Programs into unique, well-structured, and SEO-friendly blog posts. This allows you to consistently publish relevant content to your main WordPress site, driving organic traffic and building your brand's authority with minimal effort.</p>
    <p>The engine is designed to create a "drip-feed" of content, scheduling posts for future publication to create a steady stream of new articles for search engines and readers.</p>

    <h3 class="text-xl font-bold mt-6">13.2 How It Works: Prompts & Process</h3>
    <p>The engine uses a sophisticated prompting strategy to ensure high-quality output. For each post, it:</p>
    <ol>
        <li>Selects an eligible Exam Program (one with a description).</li>
        <li>Constructs a detailed prompt for the Gemini API, instructing it to act as an expert SEO writer and to structure the article with specific sections like "Why This Certification Matters" and "Career Opportunities."</li>
        <li>Receives the generated content, which is pre-formatted with WordPress block editor syntax (Gutenberg blocks).</li>
        <li>Adds a dynamic, pre-styled Call-To-Action (CTA) block at the end of the post, which links directly back to the specific Exam Program page in the React app.</li>
        <li>Sends the complete post content, along with your chosen scheduling parameters, to the WordPress backend to be created as a new "future-dated" post.</li>
    </ol>

    <h3 class="text-xl font-bold mt-6">13.3 Step-by-Step Guide to Generating Content</h3>
    <p>Using the Content Engine is a simple, five-field process:</p>
    <ol>
        <li><strong>Posts to Create:</strong> Enter the number of unique blog posts you want to generate in this batch. The engine will randomly select from your eligible Exam Programs.</li>
        <li><strong>Start Date:</strong> Choose the publication date for the first post in the series.</li>
        <li><strong>Interval (Days):</strong> Set the number of days between each scheduled post. For example, an interval of '7' will schedule one post per week.</li>
        <li><strong>Author:</strong> Select the WordPress author to attribute the posts to.</li>
        <li><strong>Category:</strong> Assign a WordPress category to all the generated posts.</li>
    </ol>
    <p>After configuring these options, click <strong>"Generate & Schedule Posts"</strong>. The engine will begin the process, showing you a live progress log. Once complete, you will see a list of the newly created posts with direct links to edit them in your WordPress admin before they go live.</p>
`;