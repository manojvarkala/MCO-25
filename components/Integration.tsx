import React from 'react';
import toast from 'react-hot-toast';

const Integration: React.FC = () => {

    const phpCode = `<?php
/**
 * Plugin Name:       Question Bank Test Display
 * Description:       Fetches a single question from a Google Sheet and displays it on a page via a shortcode for testing purposes.
 * Version:           1.1.0
 * Author:            Your World-Class Senior Frontend Engineer
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// 1. Add Admin Menu for Settings
add_action('admin_menu', 'mco_question_test_add_admin_menu');
add_action('admin_init', 'mco_question_test_settings_init');

function mco_question_test_add_admin_menu() {
    add_options_page(
        'Question Bank Settings',
        'Question Bank Test',
        'manage_options',
        'mco_question_bank_test',
        'mco_question_test_options_page'
    );
}

function mco_question_test_settings_init() {
    register_setting('mcoQuestionTestPage', 'mco_question_test_settings');

    add_settings_section(
        'mco_question_test_page_section',
        __('Google Sheet Configuration', 'wordpress'),
        null,
        'mcoQuestionTestPage'
    );

    add_settings_field(
        'mco_question_sheet_url',
        __('Question Source URL', 'wordpress'),
        'mco_question_sheet_url_render',
        'mcoQuestionTestPage',
        'mco_question_test_page_section'
    );
}

function mco_question_sheet_url_render() {
    $options = get_option('mco_question_test_settings');
    $url = isset($options['mco_question_sheet_url']) ? $options['mco_question_sheet_url'] : 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing';
    ?>
    <input type='text' name='mco_question_test_settings[mco_question_sheet_url]' value="<?php echo esc_attr($url); ?>" style="width: 100%; max-width: 600px;">
    <p class="description">Enter the full URL of the public Google Sheet. The sheet must have columns: <strong>question</strong>, <strong>options</strong> (pipe-separated, e.g., "Opt A|Opt B"), and <strong>correct_answer</strong> (the exact text of the correct option).</p>
    <?php
}

function mco_question_test_options_page() {
    ?>
    <div class="wrap">
        <h1>Question Bank API Test</h1>
        <form action='options.php' method='post'>
            <?php
            settings_fields('mcoQuestionTestPage');
            do_settings_sections('mcoQuestionTestPage');
            submit_button();
            ?>
        </form>
        <hr />
        <?php mco_run_question_source_test(); ?>
    </div>
    <?php
}

// 2. Function to fetch and parse questions (Improved for new format)
function mco_fetch_and_parse_questions() {
    $options = get_option('mco_question_test_settings');
    $sheet_url = isset($options['mco_question_sheet_url']) ? $options['mco_question_sheet_url'] : '';

    if (empty($sheet_url)) {
        return new WP_Error('no_url', 'Google Sheet URL is not configured in Settings > Question Bank Test.');
    }

    // Convert share URL to CSV export URL
    if (preg_match('/\\/d\\/([a-zA-Z0-9-_]+)/', $sheet_url, $matches)) {
        $sheet_id = $matches[1];
        $csv_url = "https://docs.google.com/spreadsheets/d/{$sheet_id}/export?format=csv";
    } else {
        return new WP_Error('invalid_url', 'The provided URL does not appear to be a valid Google Sheet URL.');
    }

    $response = wp_remote_get($csv_url, ['timeout' => 20]);

    if (is_wp_error($response)) {
        return new WP_Error('fetch_failed', 'Failed to fetch data from Google Sheets. Error: ' . $response->get_error_message());
    }
    
    $http_code = wp_remote_retrieve_response_code($response);
    if ($http_code != 200) {
        return new WP_Error('fetch_failed_http', "Failed to fetch data from Google Sheets. Server responded with status code: {$http_code}. Please ensure the sheet is public ('Anyone with the link can view').");
    }

    $csv_data = wp_remote_retrieve_body($response);
    if (empty($csv_data)) {
        return new WP_Error('empty_response', 'The Google Sheet returned no data. It might be empty.');
    }

    $lines = explode("\\n", trim($csv_data));
    $header_line = array_shift($lines);
    $header = array_map('strtolower', array_map('trim', str_getcsv($header_line)));

    $questions = [];
    foreach ($lines as $line) {
        $trimmed_line = trim($line);
        if (empty($trimmed_line)) continue;

        $row_data = str_getcsv($trimmed_line);
        if (count($row_data) < count($header)) {
            $row_data = array_pad($row_data, count($header), '');
        }
        if(count($header) != count($row_data)){
            continue;
        }
        
        $row = array_combine($header, $row_data);

        // Basic validation for a valid question row
        if (empty($row['question']) || empty($row['options']) || empty($row['correct_answer'])) {
            continue;
        }

        // Explode options string into an array
        $options = array_map('trim', explode('|', $row['options']));

        if (count($options) < 2) continue; // Must have at least two options

        $correct_answer_text = trim($row['correct_answer']);
        $correct_index = array_search($correct_answer_text, $options);

        // The correct answer must be one of the options
        if ($correct_index === false) {
            continue;
        }

        $questions[] = [
            'question' => trim($row['question']),
            'options'  => $options,
            'correct'  => $correct_index, // 0-based index
        ];
    }
    
    if (empty($questions)) {
        return new WP_Error('parsing_failed', 'No valid questions could be parsed from the source. Check formatting. Ensure headers are correct (question, options, correct_answer), options are pipe-separated, and correct_answer matches one of the options exactly.');
    }

    return $questions;
}

// 3. Test function for admin page
function mco_run_question_source_test() {
    echo '<h3>Data Source Test</h3>';
    $questions = mco_fetch_and_parse_questions();
    if (is_wp_error($questions)) {
        echo '<p style="color:red; border: 1px solid red; padding: 10px;"><strong>Failed to load questions.</strong><br>' . esc_html($questions->get_error_message()) . '</p>';
    } else {
        echo '<p style="color:green; border: 1px solid green; padding: 10px;"><strong>Success!</strong> ' . count($questions) . ' questions loaded successfully.</p>';
        echo '<h4>Sample Question:</h4>';
        $sample_question = $questions[array_rand($questions)];
        echo '<div style="border: 1px solid #ccc; padding: 15px;">';
        echo '<p><strong>Q:</strong> ' . esc_html($sample_question['question']) . '</p>';
        echo '<ul>';
        foreach ($sample_question['options'] as $index => $option) {
            $style = ($index === $sample_question['correct']) ? ' style="font-weight:bold; color:green;"' : '';
            echo '<li' . $style . '>' . esc_html($option) . ($style ? ' (Correct)' : '') . '</li>';
        }
        echo '</ul>';
        echo '</div>';
    }
}

// 4. Shortcode to display a question
function mco_question_test_shortcode_handler($atts) {
    $questions = mco_fetch_and_parse_questions();

    if (is_wp_error($questions)) {
        return '<p style="color:red;">Error loading question: ' . esc_html($questions->get_error_message()) . '</p>';
    }

    $question = $questions[array_rand($questions)];
    $question_id = uniqid('mco_q_');

    ob_start();
    ?>
    <style>
        .mco-question-container { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; background-color: #f9f9f9; font-family: sans-serif; }
        .mco-question-text { font-size: 1.1em; font-weight: bold; margin-bottom: 15px; }
        .mco-options-list { list-style: none; padding: 0; margin: 0; }
        .mco-options-list li { margin-bottom: 10px; }
        .mco-options-list label { display: flex; align-items: center; cursor: pointer; padding: 10px; border: 1px solid #ccc; border-radius: 5px; transition: background-color 0.2s, border-color 0.2s; }
        .mco-options-list label:hover { background-color: #f0f0f0; }
        .mco-options-list input[type="radio"] { margin-right: 10px; }
        .mco-check-btn { background-color: #0891b2; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin-top: 10px; }
        .mco-check-btn:hover { background-color: #06b6d4; }
        .mco-feedback { padding: 10px; margin-top: 15px; border-radius: 5px; text-align: center; font-weight: bold; display: none; }
        .mco-feedback.correct { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .mco-feedback.incorrect { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    </style>
    <div class="mco-question-container" id="<?php echo esc_attr($question_id); ?>">
        <p class="mco-question-text"><?php echo esc_html($question['question']); ?></p>
        <ul class="mco-options-list">
            <?php foreach ($question['options'] as $index => $option): ?>
                <li>
                    <label>
                        <input type="radio" name="<?php echo esc_attr($question_id); ?>" value="<?php echo esc_attr($index); ?>">
                        <span><?php echo esc_html($option); ?></span>
                    </label>
                </li>
            <?php endforeach; ?>
        </ul>
        <button class="mco-check-btn" onclick="mcoCheckAnswer_<?php echo esc_js($question_id); ?>()">Check Answer</button>
        <div class="mco-feedback"></div>
    </div>
    <script type="text/javascript">
        function mcoCheckAnswer_<?php echo esc_js($question_id); ?>() {
            var container = document.getElementById('<?php echo esc_js($question_id); ?>');
            var selected = container.querySelector('input[name="<?php echo esc_js($question_id); ?>"]:checked');
            var feedback = container.querySelector('.mco-feedback');
            
            if (!selected) {
                alert('Please select an answer.');
                return;
            }

            var correctAnswerIndex = <?php echo esc_js($question['correct']); ?>;
            feedback.style.display = 'block';

            if (parseInt(selected.value, 10) === correctAnswerIndex) {
                feedback.textContent = 'Correct!';
                feedback.className = 'mco-feedback correct';
            } else {
                feedback.textContent = 'Incorrect. The correct answer is highlighted below.';
                feedback.className = 'mco-feedback incorrect';
                // Highlight correct answer
                var labels = container.querySelectorAll('.mco-options-list label');
                if(labels[correctAnswerIndex]) {
                    labels[correctAnswerIndex].style.backgroundColor = '#d1fae5';
                    labels[correctAnswerIndex].style.borderColor = '#a7f3d0';
                }
            }
        }
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('mco_question_test', 'mco_question_test_shortcode_handler');
?>`;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Question Bank Test Plugin Guide</h1>
            <div className="prose max-w-none text-slate-600">
                <p>This plugin allows you to fetch questions from a public Google Sheet and display a random one on any WordPress page or post for testing purposes.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Setup Instructions</h2>
                <ol>
                    <li><strong>Plugin Installation:</strong> Copy the full PHP code below into a new file named <code>mco-question-test-plugin.php</code> inside your <code>/wp-content/plugins/</code> directory.</li>
                    <li><strong>Activate Plugin:</strong> Go to your WordPress admin dashboard, navigate to "Plugins", find "Question Bank Test Display", and click "Activate".</li>
                    <li>
                        <strong>Configure Data Source:</strong> In your WordPress admin, go to <strong>Settings &gt; Question Bank Test</strong>. Paste the URL to your public Google Sheet. The sheet must have these exact, lowercase column headers: 
                        <code>question</code>, <code>options</code> (with options separated by a pipe `|`), and <code>correct_answer</code> (where the value is the exact text of the correct option).
                    </li>
                    <li>
                        <strong>Test the Connection:</strong> The settings page includes a test section that will try to fetch and parse the questions from your sheet, immediately showing you if it's working correctly and displaying a sample question. This will help you resolve any formatting issues.
                    </li>
                    <li><strong>Display a Question:</strong> Create or edit a WordPress page/post and add the following shortcode to the content:
                        <pre className="bg-slate-200 p-2 rounded text-sm"><code>[mco_question_test]</code></pre>
                    </li>
                </ol>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Plugin Code</h2>
                <p>Copy the code below into <code>mco-question-test-plugin.php</code>.</p>
                <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto relative">
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(phpCode);
                            toast.success('Code copied to clipboard!');
                        }}
                        className="absolute top-2 right-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold py-1 px-2 rounded"
                    >
                        Copy Code
                    </button>
                    <code>{phpCode}</code>
                </pre>
            </div>
        </div>
    );
};

export default Integration;