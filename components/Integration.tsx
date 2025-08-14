
import React from 'react';
import toast from 'react-hot-toast';

const Integration: React.FC = () => {

    const phpCode = `<?php
/**
 * Plugin Name:       Annapoorna Exam Test Question Display
 * Description:       Fetches a single question from a Google Sheet and displays it on a page via a shortcode for testing purposes.
 * Version:           1.2.0
 * Author:            Your World-Class Senior Frontend Engineer
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// 1. Add Admin Menu for Settings
if ( ! function_exists( 'aet_add_admin_menu' ) ) {
    add_action('admin_menu', 'aet_add_admin_menu');
    function aet_add_admin_menu() {
        add_options_page(
            'Question Bank Settings',
            'Question Bank Test',
            'manage_options',
            'aet_question_bank_test',
            'aet_options_page_html'
        );
    }
}

if ( ! function_exists( 'aet_settings_init' ) ) {
    add_action('admin_init', 'aet_settings_init');
    function aet_settings_init() {
        register_setting('aetQuestionTestPage', 'aet_settings');
        add_settings_section(
            'aet_page_section',
            __('Google Sheet Configuration', 'wordpress'),
            null,
            'aetQuestionTestPage'
        );
        add_settings_field(
            'aet_question_sheet_url',
            __('Question Source URL', 'wordpress'),
            'aet_sheet_url_render',
            'aetQuestionTestPage',
            'aet_page_section'
        );
    }
}

if ( ! function_exists( 'aet_sheet_url_render' ) ) {
    function aet_sheet_url_render() {
        $options = get_option('aet_settings');
        $url = isset($options['aet_question_sheet_url']) ? $options['aet_question_sheet_url'] : 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing';
        ?>
        <input type='text' name='aet_settings[aet_question_sheet_url]' value="<?php echo esc_attr($url); ?>" style="width: 100%; max-width: 600px;">
        <p class="description">Enter the full URL of the public Google Sheet. The sheet must have columns: <strong>question</strong>, <strong>options</strong> (pipe-separated, e.g., "Opt A|Opt B"), and <strong>correct_answer</strong> (the exact text of the correct option).</p>
        <?php
    }
}

if ( ! function_exists( 'aet_options_page_html' ) ) {
    function aet_options_page_html() {
        ?>
        <div class="wrap">
            <h1>Question Bank API Test</h1>
            <form action='options.php' method='post'>
                <?php
                settings_fields('aetQuestionTestPage');
                do_settings_sections('aetQuestionTestPage');
                submit_button();
                ?>
            </form>
            <hr />
            <?php aet_run_question_source_test(); ?>
        </div>
        <?php
    }
}

// 2. Function to fetch and parse questions
if ( ! function_exists( 'aet_fetch_and_parse_questions' ) ) {
    function aet_fetch_and_parse_questions() {
        $options = get_option('aet_settings');
        $sheet_url = isset($options['aet_question_sheet_url']) ? $options['aet_question_sheet_url'] : '';

        if (empty($sheet_url)) {
            return new WP_Error('no_url', 'Google Sheet URL is not configured in Settings > Question Bank Test.');
        }

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

            if (empty($row['question']) || empty($row['options']) || !isset($row['correct_answer'])) {
                continue;
            }

            $options = array_map('trim', explode('|', $row['options']));
            if (count($options) < 2) continue;

            $correct_answer_text = trim($row['correct_answer']);
            $correct_index = array_search($correct_answer_text, $options);

            if ($correct_index === false) {
                continue;
            }

            $questions[] = [
                'question' => trim($row['question']),
                'options'  => $options,
                'correct'  => $correct_index,
            ];
        }
        
        if (empty($questions)) {
            return new WP_Error('parsing_failed', 'No valid questions could be parsed from the source. Check formatting. Ensure headers are correct (question, options, correct_answer), options are pipe-separated, and correct_answer matches one of the options exactly.');
        }
        return $questions;
    }
}

// 3. Test function for admin page
if ( ! function_exists( 'aet_run_question_source_test' ) ) {
    function aet_run_question_source_test() {
        echo '<h3>Data Source Test</h3>';
        $questions = aet_fetch_and_parse_questions();
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
            echo '</ul></div>';
        }
    }
}

// 4. Shortcode to display a question
if ( ! function_exists( 'aet_shortcode_handler' ) ) {
    function aet_shortcode_handler($atts) {
        $questions = aet_fetch_and_parse_questions();

        if (is_wp_error($questions)) {
            return '<p style="color:red;">Error loading question: ' . esc_html($questions->get_error_message()) . '</p>';
        }

        $question = $questions[array_rand($questions)];
        $question_id = 'aet_q_' . uniqid();

        ob_start();
        ?>
        <style>
            .aet-question-container { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; background-color: #f9f9f9; font-family: sans-serif; }
            .aet-options-list { list-style: none; padding: 0; margin: 0; }
            .aet-options-list label { display: flex; align-items: center; cursor: pointer; padding: 10px; border: 1px solid #ccc; border-radius: 5px; transition: background-color 0.2s; }
            .aet-options-list input[type="radio"] { margin-right: 10px; }
            .aet-check-btn { background-color: #0891b2; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin-top: 10px; }
            .aet-feedback { padding: 10px; margin-top: 15px; border-radius: 5px; display: none; }
            .aet-feedback.correct { background-color: #d1fae5; color: #065f46; }
            .aet-feedback.incorrect { background-color: #fee2e2; color: #991b1b; }
        </style>
        <div class="aet-question-container" id="<?php echo esc_attr($question_id); ?>">
            <p><?php echo esc_html($question['question']); ?></p>
            <ul class="aet-options-list">
                <?php foreach ($question['options'] as $index => $option): ?>
                    <li><label><input type="radio" name="<?php echo esc_attr($question_id); ?>" value="<?php echo esc_attr($index); ?>"><span><?php echo esc_html($option); ?></span></label></li>
                <?php endforeach; ?>
            </ul>
            <button class="aet-check-btn" onclick="aet_check_answer_<?php echo esc_js($question_id); ?>()">Check Answer</button>
            <div class="aet-feedback"></div>
        </div>
        <script type="text/javascript">
            function aet_check_answer_<?php echo esc_js($question_id); ?>() {
                var container = document.getElementById('<?php echo esc_js($question_id); ?>');
                var selected = container.querySelector('input:checked');
                var feedback = container.querySelector('.aet-feedback');
                if (!selected) { alert('Please select an answer.'); return; }
                var correctAnswerIndex = <?php echo esc_js($question['correct']); ?>;
                feedback.style.display = 'block';
                if (parseInt(selected.value, 10) === correctAnswerIndex) {
                    feedback.textContent = 'Correct!';
                    feedback.className = 'aet-feedback correct';
                } else {
                    feedback.textContent = 'Incorrect.';
                    feedback.className = 'aet-feedback incorrect';
                }
            }
        </script>
        <?php
        return ob_get_clean();
    }
    add_shortcode('aet_question_test', 'aet_shortcode_handler');
}
?>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(phpCode).then(() => {
            toast.success('PHP code copied to clipboard!');
        }, (err) => {
            toast.error('Failed to copy code.');
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">WordPress Integration Guide</h1>
            <div className="prose max-w-none text-slate-600">
                <p>To integrate the examination portal with your WordPress site for Single Sign-On (SSO) and results synchronization, you can use a custom plugin. Below is the full PHP code for a sample plugin that also handles fetching questions from a Google Sheet.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Setup Steps</h2>
                <ol>
                    <li>Create a new PHP file in your <code>/wp-content/plugins/</code> directory (e.g., <code>annapoorna-exam-integration.php</code>).</li>
                    <li>Copy the code below and paste it into the new file.</li>
                    <li>Go to the 'Plugins' page in your WordPress admin dashboard and activate the "Annapoorna Exam Test Question Display" plugin.</li>
                    <li>Navigate to <strong>Settings &rarr; Question Bank Test</strong> in your WordPress admin menu to configure the Google Sheet URL for your questions. This is crucial for the exam app to fetch questions.</li>
                    <li>To test the connection, use the shortcode <code>[aet_question_test]</code> on any page or post to display a sample question from your configured Google Sheet.</li>
                </ol>

                <div className="relative mt-6">
                    <button 
                        onClick={copyToClipboard}
                        className="absolute top-2 right-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-1 px-3 rounded-md text-xs transition z-10"
                    >
                        Copy Code
                    </button>
                    <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                        <code>
                            {phpCode}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default Integration;
