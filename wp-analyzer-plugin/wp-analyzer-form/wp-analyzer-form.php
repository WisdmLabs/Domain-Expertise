<?php
/**
 * Plugin Name: WP Analyzer Form
 * Plugin URI: https://github.com/yourusername/wp-analyzer-form
 * Description: A WordPress plugin that integrates with Contact Form 7 to submit site analysis requests to an external WordPress analyzer server.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-analyzer-form
 * Domain Path: /languages
 * Requires: Contact Form 7
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WP_ANALYZER_FORM_VERSION', '1.0.0');
define('WP_ANALYZER_FORM_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WP_ANALYZER_FORM_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('WP_ANALYZER_FORM_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main WP Analyzer Form Plugin Class
 */
class WP_Analyzer_Form {
    
    /**
     * Plugin instance
     */
    private static $instance = null;
    
    /**
     * Get plugin instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));

        // Register REST API endpoint for background processing
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Hook into Contact Form 7 (action only fires if CF7 is active)
        add_action('wpcf7_before_send_mail', array($this, 'handle_cf7_submission'), 10, 1);

        // Register cron action for background PDF generation and email
        add_action('wp_analyzer_send_report_email', array($this, 'process_background_report'), 10, 1);

        // Show admin notice if WP Cron is disabled
        add_action('admin_notices', array($this, 'cron_disabled_notice'));

        // Plugin activation/deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    /**
     * Register REST API routes for webhook callback
     */
    public function register_rest_routes() {
        // Background processing endpoint (works even when WP Cron is disabled)
        register_rest_route('wp-analyzer/v1', '/process', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_process_job'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * REST endpoint to process a job in background
     */
    public function rest_process_job($request) {
        $job_id = $request->get_param('job_id');

        if (empty($job_id)) {
            return new WP_REST_Response(array('error' => 'Missing job_id'), 400);
        }

        $result = $this->process_background_report($job_id);
        return new WP_REST_Response(array('success' => (bool) $result), $result ? 200 : 409);
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('wp-analyzer-form', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        $default_options = array(
            'server_url' => 'https://domain-expertise.vercel.app',
            'default_format' => 'print',
            'cf7_form_id' => ''
        );
        
        add_option('wp_analyzer_form_options', $default_options);
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clean up scheduled cron events to avoid orphaned jobs
        $this->clear_scheduled_events();
    }

    /**
     * Clear all scheduled WP Cron events for this plugin
     */
    private function clear_scheduled_events() {
        $crons = _get_cron_array();
        if (empty($crons)) {
            return;
        }

        foreach ($crons as $timestamp => $cron) {
            if (isset($cron['wp_analyzer_send_report_email'])) {
                foreach ($cron['wp_analyzer_send_report_email'] as $hook_key => $hook_data) {
                    $args = isset($hook_data['args']) ? $hook_data['args'] : array();
                    wp_unschedule_event($timestamp, 'wp_analyzer_send_report_email', $args);
                }
            }
        }

        error_log('WP Analyzer Form - Cleared scheduled cron events on deactivation');
    }

    /**
     * Show admin notice when WP Cron is disabled
     */
    public function cron_disabled_notice() {
        // Only show on plugin settings page
        $screen = get_current_screen();
        if (!$screen || $screen->id !== 'settings_page_wp-analyzer-form') {
            return;
        }

        if (defined('DISABLE_WP_CRON') && DISABLE_WP_CRON) {
            ?>
            <div class="notice notice-info">
                <p>
                    <strong><?php _e('WP Analyzer Form:', 'wp-analyzer-form'); ?></strong>
                    <?php _e('WP Cron is disabled. The plugin uses an alternative background processing method.', 'wp-analyzer-form'); ?>
                </p>
            </div>
            <?php
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('WP Analyzer Form Settings', 'wp-analyzer-form'),
            __('WP Analyzer Form', 'wp-analyzer-form'),
            'manage_options',
            'wp-analyzer-form',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Admin initialization
     */
    public function admin_init() {
        register_setting('wp_analyzer_form_options', 'wp_analyzer_form_options', array($this, 'validate_options'));
        
        add_settings_section(
            'wp_analyzer_form_main',
            __('Main Settings', 'wp-analyzer-form'),
            array($this, 'main_section_callback'),
            'wp-analyzer-form'
        );
        
        add_settings_field(
            'server_url',
            __('External Server URL', 'wp-analyzer-form'),
            array($this, 'server_url_callback'),
            'wp-analyzer-form',
            'wp_analyzer_form_main'
        );
        
        add_settings_field(
            'default_format',
            __('Default Report Format', 'wp-analyzer-form'),
            array($this, 'default_format_callback'),
            'wp-analyzer-form',
            'wp_analyzer_form_main'
        );
        
        add_settings_field(
            'cf7_form_id',
            __('Contact Form 7 Form ID', 'wp-analyzer-form'),
            array($this, 'cf7_form_id_callback'),
            'wp-analyzer-form',
            'wp_analyzer_form_main'
        );
    }
    
    /**
     * Validate options
     */
    public function validate_options($input) {
        $output = array();
        
        // Validate server URL
        if (isset($input['server_url'])) {
            $server_url = esc_url_raw($input['server_url']);
            if (filter_var($server_url, FILTER_VALIDATE_URL)) {
                $output['server_url'] = rtrim($server_url, '/');
            } else {
                add_settings_error('wp_analyzer_form_options', 'invalid_url', __('Please enter a valid URL.', 'wp-analyzer-form'));
                $output['server_url'] = get_option('wp_analyzer_form_options')['server_url'];
            }
        }
        
        // Validate default format
        if (isset($input['default_format'])) {
            $allowed_formats = array('standard', 'print', 'landscape');
            if (in_array($input['default_format'], $allowed_formats)) {
                $output['default_format'] = sanitize_text_field($input['default_format']);
            } else {
                $output['default_format'] = 'print';
            }
        }
        
        // Validate CF7 form ID
        if (isset($input['cf7_form_id'])) {
            $cf7_form_id = sanitize_text_field($input['cf7_form_id']);
            $output['cf7_form_id'] = $cf7_form_id;
        } else {
            $output['cf7_form_id'] = '';
        }
        
        return $output;
    }
    
    /**
     * Main section callback
     */
    public function main_section_callback() {
        echo '<p>' . __('Configure the external WordPress analyzer server settings.', 'wp-analyzer-form') . '</p>';
    }
    
    /**
     * Server URL callback
     */
    public function server_url_callback() {
        $options = get_option('wp_analyzer_form_options');
        $server_url = isset($options['server_url']) ? $options['server_url'] : 'https://domain-expertise.vercel.app';
        echo '<input type="url" id="server_url" name="wp_analyzer_form_options[server_url]" value="' . esc_attr($server_url) . '" class="regular-text" />';
        echo '<p class="description">' . __('The URL of the external WordPress analyzer server (without trailing slash).', 'wp-analyzer-form') . '</p>';
    }
    
    /**
     * Default format callback
     */
    public function default_format_callback() {
        $options = get_option('wp_analyzer_form_options');
        $default_format = isset($options['default_format']) ? $options['default_format'] : 'print';
        
        $formats = array(
            'standard' => __('Standard', 'wp-analyzer-form'),
            'print' => __('Print Optimized', 'wp-analyzer-form'),
            'landscape' => __('Landscape', 'wp-analyzer-form')
        );
        
        echo '<select id="default_format" name="wp_analyzer_form_options[default_format]">';
        foreach ($formats as $value => $label) {
            echo '<option value="' . esc_attr($value) . '"' . selected($default_format, $value, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . __('Default report format for analysis requests.', 'wp-analyzer-form') . '</p>';
    }
    
    /**
     * CF7 Form ID callback
     */
    public function cf7_form_id_callback() {
        $options = get_option('wp_analyzer_form_options');
        $cf7_form_id = isset($options['cf7_form_id']) ? $options['cf7_form_id'] : '';
        
        echo '<input type="text" id="cf7_form_id" name="wp_analyzer_form_options[cf7_form_id]" value="' . esc_attr($cf7_form_id) . '" class="regular-text" />';
        
        if (class_exists('WPCF7_ContactForm')) {
            echo '<p class="description">' . __('Enter the Contact Form 7 <strong>Post ID</strong> (numeric value from the URL). Leave empty to disable integration.', 'wp-analyzer-form') . '</p>';
            echo '<p class="description">' . __('<strong>How to find it:</strong> Go to Contact → Contact Forms, click "Edit" on your form, and look at the URL. The number after <code>post=</code> is your Form ID.', 'wp-analyzer-form') . '</p>';
            echo '<p class="description" style="color: #0073aa;">' . __('Example: <code>admin.php?page=wpcf7&post=27348</code> → Use <strong>27348</strong>', 'wp-analyzer-form') . '</p>';
        } else {
            echo '<p class="description" style="color: #d63638;">' . __('Contact Form 7 plugin is not installed or activated.', 'wp-analyzer-form') . '</p>';
        }
    }
    
    /**
     * Admin page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('wp_analyzer_form_options');
                do_settings_sections('wp-analyzer-form');
                submit_button();
                ?>
            </form>
            
            <div class="card">
                <h2><?php _e('Contact Form 7 Setup', 'wp-analyzer-form'); ?></h2>
                <p><?php _e('This plugin integrates with Contact Form 7 to submit site analysis requests.', 'wp-analyzer-form'); ?></p>
                
                <h3><?php _e('Setup Steps', 'wp-analyzer-form'); ?></h3>
                <ol>
                    <li><?php _e('Install and activate Contact Form 7 plugin', 'wp-analyzer-form'); ?></li>
                    <li><?php _e('Create a new CF7 form with required fields', 'wp-analyzer-form'); ?></li>
                    <li><?php _e('Find the Form Post ID: Edit your form and look at the browser URL for <code>post=XXXXX</code>', 'wp-analyzer-form'); ?></li>
                    <li><?php _e('Enter the numeric Post ID in the setting above (e.g., 27348)', 'wp-analyzer-form'); ?></li>
                    <li><?php _e('Add the CF7 form to your page', 'wp-analyzer-form'); ?></li>
                </ol>
                
                <h3><?php _e('Required CF7 Fields', 'wp-analyzer-form'); ?></h3>
                <ul>
                    <li><code>website-url</code> - <?php _e('URL field (required)', 'wp-analyzer-form'); ?></li>
                    <li><code>email</code> - <?php _e('Email field (required)', 'wp-analyzer-form'); ?></li>
                </ul>
            </div>
        </div>
        <?php
    }
    
    /**
     * Handle CF7 form submission
     */
    public function handle_cf7_submission($contact_form) {
        // Get plugin options
        $options = get_option('wp_analyzer_form_options');
        $target_form_id = isset($options['cf7_form_id']) ? trim($options['cf7_form_id']) : '';
        
        // Check if CF7 form ID is configured
        if (empty($target_form_id)) {
            error_log('WP Analyzer Form - No CF7 form ID configured');
            return;
        }
        
        // Get submitted form ID (can be numeric or alphanumeric)
        $submitted_form_id = $contact_form->id();
        
        // Convert both to strings for comparison
        $target_form_id_str = (string) $target_form_id;
        $submitted_form_id_str = (string) $submitted_form_id;
        
        // Only process if this is our target form
        if ($submitted_form_id_str !== $target_form_id_str) {
            error_log('WP Analyzer Form - Form ID mismatch. Expected: ' . $target_form_id_str . ', Got: ' . $submitted_form_id_str);
            return;
        }
        
        // Skip CF7's mail sending since our API handles email delivery
        $contact_form->skip_mail = true;
        error_log('WP Analyzer Form - Skipping CF7 mail (API will send email)');
        
        // Log that we're processing this form
        error_log('WP Analyzer Form - Processing CF7 form ID: ' . $submitted_form_id);
        
        // Get submission instance
        $submission = WPCF7_Submission::get_instance();
        
        if (!$submission) {
            error_log('WP Analyzer Form - Could not get CF7 submission instance');
            return;
        }
        
        // Get posted data
        $posted_data = $submission->get_posted_data();
        
        // Log received data
        error_log('WP Analyzer Form - CF7 Posted Data: ' . print_r($posted_data, true));
        
        // Extract fields
        $url = isset($posted_data['website-url']) ? esc_url_raw($posted_data['website-url']) : '';
        $email = isset($posted_data['email']) ? sanitize_email($posted_data['email']) : '';
        
        // Validate required fields
        if (empty($url) || empty($email)) {
            error_log('WP Analyzer Form - Missing required fields (url or email)');
            return;
        }
        
        // Validate email
        if (!is_email($email)) {
            error_log('WP Analyzer Form - Invalid email: ' . $email);
            return;
        }
        
        // Validate URL
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            error_log('WP Analyzer Form - Invalid URL: ' . $url);
            return;
        }
        
        // Get format from settings
        $format = isset($options['default_format']) ? $options['default_format'] : 'print';
        
        // Send to analyzer API (non-blocking)
        $this->send_to_analyzer_api($url, $email, $format);
        
        error_log('WP Analyzer Form - CF7 submission processed successfully');
    }
    
    /**
     * Check if WP Cron is disabled
     */
    private function is_cron_disabled() {
        return defined('DISABLE_WP_CRON') && DISABLE_WP_CRON;
    }

    /**
     * Queue analysis job for background processing
     * Returns INSTANTLY - all API calls happen in background via WP Cron
     * Falls back to synchronous processing if WP Cron is disabled
     */
    private function send_to_analyzer_api($url, $email, $format) {
        // Get server URL from options
        $options = get_option('wp_analyzer_form_options');
        $server_url = isset($options['server_url']) ? $options['server_url'] : 'https://domain-expertise.vercel.app';

        // Generate unique job ID
        $job_id = wp_generate_uuid4();

        error_log('WP Analyzer Form - Queuing job ' . $job_id . ' for: ' . $url);

        // Store job data in transient for background processing (expires in 2 hours)
        $job_data = array(
            'job_id' => $job_id,
            'email' => $email,
            'url' => $url,
            'format' => $format,
            'server_url' => $server_url,
            'created_at' => current_time('mysql')
        );

        set_transient('wp_analyzer_job_' . $job_id, $job_data, 2 * HOUR_IN_SECONDS);

        // Check if WP Cron is disabled - use loopback request instead
        if ($this->is_cron_disabled()) {
            error_log('WP Analyzer Form - WP Cron disabled, using loopback request');
            $this->trigger_loopback_process($job_id);
        } else {
            // WP Cron is enabled - use background processing
            wp_schedule_single_event(time(), 'wp_analyzer_send_report_email', array($job_id));
            $this->trigger_cron_async();
            error_log('WP Analyzer Form - Job queued via WP Cron: ' . $job_id);
        }

        error_log('WP Analyzer Form - Email will be sent to: ' . $email);

        return true;
    }

    /**
     * Trigger WP Cron asynchronously (non-blocking)
     */
    private function trigger_cron_async() {
        $cron_url = site_url('wp-cron.php');

        wp_remote_post($cron_url, array(
            'timeout' => 0.01,
            'blocking' => false,
            'sslverify' => false,
            'body' => array('doing_wp_cron' => time())
        ));
    }

    /**
     * Trigger background processing via loopback request (non-blocking)
     * Works even when WP Cron is disabled
     */
    private function trigger_loopback_process($job_id) {
        $url = rest_url('wp-analyzer/v1/process');

        wp_remote_post($url, array(
            'timeout' => 0.01,
            'blocking' => false,
            'sslverify' => false,
            'body' => array('job_id' => $job_id)
        ));
    }

    /**
     * Background job: Run analysis, fetch PDF, and send email
     * This runs via WP Cron - user doesn't wait for this
     */
    public function process_background_report($job_id) {
        error_log('WP Analyzer Form - Background job started: ' . $job_id);

        // Atomically claim the job: read then immediately delete the transient.
        // This prevents duplicate processing if WP Cron fires the same event twice.
        $job_data = get_transient('wp_analyzer_job_' . $job_id);

        if (!$job_data) {
            error_log('WP Analyzer Form - Job already claimed or not found: ' . $job_id);
            return false;
        }

        // Delete immediately so no other process can claim this job
        delete_transient('wp_analyzer_job_' . $job_id);

        $email = $job_data['email'];
        $url = $job_data['url'];
        $format = $job_data['format'];
        $server_url = $job_data['server_url'];

        // Step 1: Get analysis data
        error_log('WP Analyzer Form - Running analysis for: ' . $url);

        $analysis_response = wp_remote_post($server_url . '/api/analyze', array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array('url' => $url)),
            'timeout' => 120,
            'sslverify' => true
        ));

        if (is_wp_error($analysis_response)) {
            error_log('WP Analyzer Form - Analysis API Error: ' . $analysis_response->get_error_message());
            $this->send_failure_email($email, $url, $analysis_response->get_error_message());
            return false;
        }

        $analysis_code = wp_remote_retrieve_response_code($analysis_response);
        if ($analysis_code !== 200) {
            $response_body = json_decode(wp_remote_retrieve_body($analysis_response), true);
            $server_error = isset($response_body['error']) ? $response_body['error'] : 'Unknown error (HTTP ' . $analysis_code . ')';
            error_log('WP Analyzer Form - Analysis failed: ' . $server_error);
            $this->send_failure_email($email, $url, $server_error);
            return false;
        }

        $analysis_data = json_decode(wp_remote_retrieve_body($analysis_response), true);

        if (!is_array($analysis_data) || empty($analysis_data['data'])) {
            error_log('WP Analyzer Form - Invalid analysis response structure');
            $this->send_failure_email($email, $url, 'Analysis returned invalid data');
            return false;
        }

        $summary = $this->extract_summary_from_analysis($analysis_data);

        error_log('WP Analyzer Form - Analysis complete, fetching PDF...');

        // Step 2: Fetch PDF report (pass analysis data so server skips re-analysis)
        $pdf_response = wp_remote_post($server_url . '/api/analyze/pdf', array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array(
                'url' => $url,
                'format' => $format,
                'analysisData' => $analysis_data['data']
            )),
            'timeout' => 120,
            'sslverify' => true
        ));

        if (is_wp_error($pdf_response)) {
            error_log('WP Analyzer Form - PDF API Error: ' . $pdf_response->get_error_message());
            $this->send_failure_email($email, $url, 'PDF generation failed: ' . $pdf_response->get_error_message());
            return false;
        }

        $pdf_code = wp_remote_retrieve_response_code($pdf_response);
        $pdf_content = wp_remote_retrieve_body($pdf_response);
        $content_type = wp_remote_retrieve_header($pdf_response, 'content-type');

        if ($pdf_code !== 200 || strpos($content_type, 'application/pdf') === false) {
            $pdf_error_body = json_decode($pdf_content, true);
            $pdf_error = isset($pdf_error_body['error']) ? $pdf_error_body['error'] : 'PDF generation failed (HTTP ' . $pdf_code . ')';
            error_log('WP Analyzer Form - PDF failed: ' . $pdf_error);
            $this->send_failure_email($email, $url, $pdf_error);
            return false;
        }

        error_log('WP Analyzer Form - PDF received: ' . strlen($pdf_content) . ' bytes');

        // Step 3: Send email with PDF
        $domain = parse_url($url, PHP_URL_HOST);
        $filename = 'wordpress-analysis-' . sanitize_file_name($domain) . '-' . date('Y-m-d') . '.pdf';

        $email_sent = $this->send_analysis_email_with_pdf($email, $url, $pdf_content, $filename, $summary);

        if ($email_sent) {
            error_log('WP Analyzer Form - Email sent successfully to: ' . $email);
            return true;
        } else {
            error_log('WP Analyzer Form - Failed to send email to: ' . $email);
            return false;
        }
    }

    /**
     * Safely extract a string value from mixed data
     * Handles arrays, objects, and nested structures
     */
    private function extract_string_value($value) {
        // Already a string
        if (is_string($value)) {
            return trim($value);
        }

        // Numeric value - convert to string
        if (is_numeric($value)) {
            return (string) $value;
        }

        // Array - try to extract first meaningful string value
        if (is_array($value)) {
            // If it has a 'value' key, use that
            if (isset($value['value']) && is_string($value['value'])) {
                return trim($value['value']);
            }
            // If it has a 'version' key, use that
            if (isset($value['version']) && is_string($value['version'])) {
                return trim($value['version']);
            }
            // If it has a 'name' key, use that
            if (isset($value['name']) && is_string($value['name'])) {
                return trim($value['name']);
            }
            // Try first element if it's a simple indexed array
            if (isset($value[0]) && is_string($value[0])) {
                return trim($value[0]);
            }
            // Log the unexpected array structure
            error_log('WP Analyzer Form - Unexpected array structure: ' . print_r($value, true));
            return null;
        }

        // Object - try to convert
        if (is_object($value)) {
            if (isset($value->value)) {
                return trim((string) $value->value);
            }
            if (isset($value->version)) {
                return trim((string) $value->version);
            }
            if (isset($value->name)) {
                return trim((string) $value->name);
            }
        }

        return null;
    }

    /**
     * Extract summary data from analysis response
     *
     * API Response structure:
     * {
     *   "success": true,
     *   "data": {
     *     "url": "...",
     *     "wordpress": { "isWordPress": true, "indicators": [...] },
     *     "version": { "version": "6.4.2", "method": "meta_generator", "confidence": "high" },
     *     "theme": { "name": "Theme Name", "version": "1.0", "author": "..." },
     *     "plugins": [ { "name": "Plugin", "slug": "plugin-slug", "version": "1.0", "isOutdated": false }, ... ]
     *   }
     * }
     */
    private function extract_summary_from_analysis($analysis_data) {
        $summary = array(
            'wp_version' => 'Unknown',
            'theme' => 'Unknown',
            'plugin_count' => 0,
            'outdated_plugins' => 0
        );

        // Validate response
        if (!is_array($analysis_data)) {
            error_log('WP Analyzer Form - Invalid analysis data (not an array)');
            return $summary;
        }

        if (!isset($analysis_data['data']) || !is_array($analysis_data['data'])) {
            error_log('WP Analyzer Form - No data field in analysis response');
            return $summary;
        }

        $data = $analysis_data['data'];

        // WordPress version - try direct version field first
        if (!empty($data['version'])) {
            $version = $this->extract_string_value($data['version']);
            if ($version) {
                $summary['wp_version'] = $version;
                error_log('WP Analyzer Form - Found WP version from data.version: ' . $version);
            }
        } elseif (isset($data['wordpress']['indicators']) && is_array($data['wordpress']['indicators'])) {
            // Fallback: extract from indicators
            foreach ($data['wordpress']['indicators'] as $indicator) {
                if (isset($indicator['type']) && $indicator['type'] === 'meta_generator' && !empty($indicator['value'])) {
                    $version = $this->extract_string_value($indicator['value']);
                    if ($version) {
                        $summary['wp_version'] = $version;
                        error_log('WP Analyzer Form - Found WP version from indicator: ' . $version);
                        break;
                    }
                }
            }
        }

        // Theme - handle object with name property
        if (isset($data['theme'])) {
            if (is_array($data['theme']) && !empty($data['theme']['name'])) {
                $summary['theme'] = $data['theme']['name'];
                error_log('WP Analyzer Form - Found theme from data.theme.name: ' . $data['theme']['name']);
            } elseif (is_string($data['theme']) && !empty($data['theme'])) {
                $summary['theme'] = $data['theme'];
                error_log('WP Analyzer Form - Found theme as string: ' . $data['theme']);
            }
        }

        // Plugins count
        if (isset($data['plugins']) && is_array($data['plugins'])) {
            $summary['plugin_count'] = count($data['plugins']);
            error_log('WP Analyzer Form - Found ' . $summary['plugin_count'] . ' plugins');

            // Count outdated plugins
            $outdated = 0;
            foreach ($data['plugins'] as $plugin) {
                if (!empty($plugin['isOutdated'])) {
                    $outdated++;
                }
            }
            $summary['outdated_plugins'] = $outdated;

            if ($outdated > 0) {
                error_log('WP Analyzer Form - Found ' . $outdated . ' outdated plugins');
            }
        }

        error_log('WP Analyzer Form - Summary extracted: WP=' . $summary['wp_version'] . ', Theme=' . $summary['theme'] . ', Plugins=' . $summary['plugin_count']);

        return $summary;
    }

    /**
     * Send email with PDF content (not base64 encoded)
     */
    private function send_analysis_email_with_pdf($to_email, $site_url, $pdf_content, $filename, $summary) {
        // Save PDF to temp file
        $upload_dir = wp_upload_dir();
        $temp_dir = $upload_dir['basedir'] . '/wp-analyzer-temp';

        if (!file_exists($temp_dir)) {
            wp_mkdir_p($temp_dir);
            // Add .htaccess to prevent direct access
            file_put_contents($temp_dir . '/.htaccess', 'deny from all');
        }

        $temp_file = $temp_dir . '/' . sanitize_file_name($filename);
        $written = file_put_contents($temp_file, $pdf_content);

        if ($written === false) {
            error_log('WP Analyzer Form - Failed to write PDF to temp file');
            return false;
        }

        error_log('WP Analyzer Form - PDF saved to: ' . $temp_file . ' (' . $written . ' bytes)');

        // Extract domain for email
        $domain = parse_url($site_url, PHP_URL_HOST);

        // Prepare email
        $subject = $this->generate_email_subject($domain, $summary);
        $message = $this->generate_email_body($site_url, $summary);
        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: WordPress Analyzer <' . get_option('admin_email') . '>'
        );
        $attachments = array($temp_file);

        // Send email
        $sent = wp_mail($to_email, $subject, $message, $headers, $attachments);

        // Clean up temp file
        if (file_exists($temp_file)) {
            unlink($temp_file);
        }

        return $sent;
    }

    /**
     * Generate email subject based on analysis summary
     */
    private function generate_email_subject($domain, $summary) {
        $issues = 0;

        if (isset($summary['outdated_plugins']) && $summary['outdated_plugins'] > 0) {
            $issues += $summary['outdated_plugins'];
        }

        if ($issues > 0) {
            return sprintf('🚨 %d Issues Found on %s - WordPress Analysis Report', $issues, $domain);
        }

        return sprintf('✅ WordPress Analysis Complete for %s - All Systems Good!', $domain);
    }

    /**
     * Generate email body HTML
     */
    private function generate_email_body($site_url, $summary) {
        $domain = parse_url($site_url, PHP_URL_HOST);

        $plugin_count = isset($summary['plugin_count']) ? intval($summary['plugin_count']) : 0;
        $outdated = isset($summary['outdated_plugins']) ? intval($summary['outdated_plugins']) : 0;

        // Safely handle wp_version - ensure it's a string
        $wp_version = 'Unknown';
        if (isset($summary['wp_version'])) {
            if (is_string($summary['wp_version'])) {
                $wp_version = esc_html($summary['wp_version']);
            } elseif (is_array($summary['wp_version'])) {
                // Try to extract from array
                $extracted = $this->extract_string_value($summary['wp_version']);
                $wp_version = $extracted ? esc_html($extracted) : 'Unknown';
            }
        }

        // Safely handle theme - ensure it's a string
        $theme = 'Unknown';
        if (isset($summary['theme'])) {
            if (is_string($summary['theme'])) {
                $theme = esc_html($summary['theme']);
            } elseif (is_array($summary['theme'])) {
                $extracted = $this->extract_string_value($summary['theme']);
                $theme = $extracted ? esc_html($extracted) : 'Unknown';
            }
        }

        ob_start();
        ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; margin-bottom: 10px;">WordPress Analysis Report</h1>
        <p style="color: #666;">Comprehensive analysis for <?php echo esc_html($domain); ?></p>
    </div>

    <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <h3 style="color: #1e40af; margin: 0 0 10px 0;">📎 Full Report Attached</h3>
        <p style="color: #1d4ed8; margin: 0;">Please see the attached PDF for detailed analysis and recommendations.</p>
    </div>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Analysis Summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>WordPress Version</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><?php echo $wp_version; ?></td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Active Theme</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><?php echo $theme; ?></td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Plugins Detected</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><?php echo $plugin_count; ?></td>
            </tr>
            <?php if ($outdated > 0): ?>
            <tr>
                <td style="padding: 10px;"><strong>Outdated Plugins</strong></td>
                <td style="padding: 10px; color: #dc2626; font-weight: bold;"><?php echo $outdated; ?> ⚠️</td>
            </tr>
            <?php endif; ?>
        </table>
    </div>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center;">
        <h3 style="margin-top: 0;">Need Expert Help?</h3>
        <p style="color: #666;">Our WordPress experts are ready to help you resolve issues and optimize your site.</p>
        <a href="https://wisdmlabs.com/fix-wordpress-issues/?utm_source=email&utm_medium=wordpress_analyzer&utm_campaign=cta_button"
           style="display: inline-block; background: #960000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Schedule a Free Consultation
        </a>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>This report was generated by WordPress Site Analyzer</p>
        <p>© <?php echo date('Y'); ?> WisdmLabs. All rights reserved.</p>
    </div>
</body>
</html>
        <?php
        return ob_get_clean();
    }

    /**
     * Send failure notification email
     */
    private function send_failure_email($to_email, $site_url, $error_message) {
        $domain = parse_url($site_url, PHP_URL_HOST);

        $subject = sprintf('⚠️ WordPress Analysis Failed for %s', $domain);

        $message = sprintf(
            '<html><body style="font-family: sans-serif; padding: 20px;">
            <h2>Analysis Failed</h2>
            <p>We were unable to complete the analysis for <strong>%s</strong>.</p>
            <p><strong>Error:</strong> %s</p>
            <p>Please try again later or contact support if the issue persists.</p>
            <p><a href="https://wisdmlabs.com/fix-wordpress-issues/">Contact WisdmLabs Support</a></p>
            </body></html>',
            esc_html($site_url),
            esc_html($error_message)
        );

        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: WordPress Analyzer <' . get_option('admin_email') . '>'
        );

        wp_mail($to_email, $subject, $message, $headers);
    }
}

// Initialize the plugin
WP_Analyzer_Form::get_instance();
