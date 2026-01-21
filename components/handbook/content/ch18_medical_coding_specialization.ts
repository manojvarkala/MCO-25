export const ch18_medical_coding_specialization = `
    <h2 class="text-3xl font-bold font-display" id="ch18">Chapter 18: Medical Coding Specialization</h2>
    
    <h3 class="text-xl font-bold mt-6">18.1 Handling Multi-Part Coding Questions</h3>
    <p>Medical coding exams often require students to select multiple codes for a single scenario (e.g., a primary procedure and multiple modifiers). While our engine standardizes these as single-selection answers for simplicity, administrators should format questions to reflect realistic coding combinations.</p>

    <h3 class="text-xl font-bold mt-6">18.2 Tips for Coding Content Quality</h3>
    <p>To provide the best experience for students preparing for the CPC®, follow these content guidelines in your Google Sheets:</p>
    <ul>
        <li><strong>Rationale is Key:</strong> When the student gets a question wrong, our AI leverages the 'rationale' provided in your dataset to explain the logic behind the correct CPT® or ICD-10 code choice.</li>
        <li><strong>Distractor Plausibility:</strong> Use "near-miss" codes as distractors. For example, if the correct code is 99213, include 99212 and 99214 to test the student's ability to distinguish between levels of medical decision-making.</li>
        <li><strong>Scenario Formatting:</strong> Use the <code>&lt;pre&gt;</code> tag in your question content to format medical notes clearly, ensuring physical exam findings and history of present illness are easy to read.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">18.3 Leveraging AI for Coding Triage</h3>
    <p>The **AI Study Guide** feature is particularly powerful in medical coding. Because the AI understands the hierarchical structure of medical codes, it can explain to a student *why* a specific code in the 'Musculoskeletal System' section was inappropriate for a scenario involving the 'Integumentary System'.</p>

    <div class="bg-cyan-50 border-l-4 border-cyan-500 p-4 my-4">
        <p class="font-bold text-cyan-800">Proctoring for Coding Integrity</p>
        <p class="text-cyan-700">Since coding exams allow the use of physical code books, our "Tab Monitoring" proctoring is the student's best friend. It ensures they stay focused on the digital exam player while referencing their physical CPT® and ICD-10 manuals, mirroring the actual proctored testing environment.</p>
    </div>
`;