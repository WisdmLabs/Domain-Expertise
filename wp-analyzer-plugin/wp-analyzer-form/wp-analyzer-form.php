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

        // Register REST API endpoint for webhook callback
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Hook into Contact Form 7 if available
        if (class_exists('WPCF7_ContactForm')) {
            add_action('wpcf7_before_send_mail', array($this, 'handle_cf7_submission'), 10, 1);
        }

        // Register cron action for background PDF generation and email
        add_action('wp_analyzer_send_report_email', array($this, 'process_background_report'), 10, 1);

        // Plugin activation/deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    /**
     * Register REST API routes for webhook callback
     */
    public function register_rest_routes() {
        register_rest_route('wp-analyzer/v1', '/webhook', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_webhook_callback'),
            'permission_callback' => '__return_true', // Public endpoint (validated by job_id)
        ));
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
        // Clean up if needed
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
     * Queue analysis job for background processing
     * Returns INSTANTLY - all API calls happen in background via WP Cron
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

        // Schedule background job - runs immediately via WP Cron
        wp_schedule_single_event(time(), 'wp_analyzer_send_report_email', array($job_id));

        // Trigger cron immediately (non-blocking)
        $this->trigger_cron_async();

        error_log('WP Analyzer Form - Job queued: ' . $job_id);
        error_log('WP Analyzer Form - Email will be sent to: ' . $email);

        return true;
    }

    /**
     * Trigger WP Cron asynchronously (non-blocking)
     */
    private function trigger_cron_async() {
        $cron_url = site_url('wp-cron.php');

        // Use non-blocking request to trigger cron
        wp_remote_post($cron_url, array(
            'timeout' => 0.01,
            'blocking' => false,
            'sslverify' => false,
            'body' => array('doing_wp_cron' => time())
        ));
    }

    /**
     * Background job: Run analysis, fetch PDF, and send email
     * This runs via WP Cron - user doesn't wait for this
     */
    public function process_background_report($job_id) {
        error_log('WP Analyzer Form - Background job started: ' . $job_id);

        // Get job data from transient
        $job_data = get_transient('wp_analyzer_job_' . $job_id);

        if (!$job_data) {
            error_log('WP Analyzer Form - Job data not found for: ' . $job_id);
            return false;
        }

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
            delete_transient('wp_analyzer_job_' . $job_id);
            return false;
        }

        $analysis_code = wp_remote_retrieve_response_code($analysis_response);
        if ($analysis_code !== 200) {
            error_log('WP Analyzer Form - Analysis failed with status: ' . $analysis_code);
            $this->send_failure_email($email, $url, 'Analysis failed with status ' . $analysis_code);
            delete_transient('wp_analyzer_job_' . $job_id);
            return false;
        }

        $analysis_data = json_decode(wp_remote_retrieve_body($analysis_response), true);
        $summary = $this->extract_summary_from_analysis($analysis_data);

        error_log('WP Analyzer Form - Analysis complete, fetching PDF...');

        // Step 2: Fetch PDF report
        $pdf_response = wp_remote_post($server_url . '/api/analyze/pdf', array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array('url' => $url, 'format' => $format)),
            'timeout' => 300,
            'sslverify' => true
        ));

        if (is_wp_error($pdf_response)) {
            error_log('WP Analyzer Form - PDF API Error: ' . $pdf_response->get_error_message());
            $this->send_failure_email($email, $url, 'PDF generation failed: ' . $pdf_response->get_error_message());
            delete_transient('wp_analyzer_job_' . $job_id);
            return false;
        }

        $pdf_code = wp_remote_retrieve_response_code($pdf_response);
        $pdf_content = wp_remote_retrieve_body($pdf_response);
        $content_type = wp_remote_retrieve_header($pdf_response, 'content-type');

        if ($pdf_code !== 200 || strpos($content_type, 'application/pdf') === false) {
            error_log('WP Analyzer Form - PDF invalid response: ' . $pdf_code);
            $this->send_failure_email($email, $url, 'PDF generation failed with status ' . $pdf_code);
            delete_transient('wp_analyzer_job_' . $job_id);
            return false;
        }

        error_log('WP Analyzer Form - PDF received: ' . strlen($pdf_content) . ' bytes');

        // Step 3: Send email with PDF
        $domain = parse_url($url, PHP_URL_HOST);
        $filename = 'wordpress-analysis-' . sanitize_file_name($domain) . '-' . date('Y-m-d') . '.pdf';

        $email_sent = $this->send_analysis_email_with_pdf($email, $url, $pdf_content, $filename, $summary);

        // Clean up
        delete_transient('wp_analyzer_job_' . $job_id);

        if ($email_sent) {
            error_log('WP Analyzer Form - Email sent successfully to: ' . $email);
            return true;
        } else {
            error_log('WP Analyzer Form - Failed to send email to: ' . $email);
            return false;
        }
    }

    /**
     * Extract summary data from analysis response
     */
    private function extract_summary_from_analysis($analysis_data) {
        $summary = array(
            'wp_version' => 'Unknown',
            'theme' => 'Unknown',
            'plugin_count' => 0,
            'outdated_plugins' => 0
        );

        if (!isset($analysis_data['data'])) {
            return $summary;
        }

        $data = $analysis_data['data'];

        // WordPress version
        if (isset($data['version'])) {
            $summary['wp_version'] = $data['version'];
        } elseif (isset($data['wordpress']['indicators'])) {
            foreach ($data['wordpress']['indicators'] as $indicator) {
                if ($indicator['type'] === 'meta_generator' && !empty($indicator['value'])) {
                    $summary['wp_version'] = $indicator['value'];
                    break;
                }
            }
        }

        // Theme
        if (isset($data['theme']['name'])) {
            $summary['theme'] = $data['theme']['name'];
        } elseif (isset($data['theme']) && is_string($data['theme'])) {
            $summary['theme'] = $data['theme'];
        }

        // Plugin count
        if (isset($data['plugins']) && is_array($data['plugins'])) {
            $summary['plugin_count'] = count($data['plugins']);

            // Count outdated plugins
            $outdated = 0;
            foreach ($data['plugins'] as $plugin) {
                if (isset($plugin['outdated']) && $plugin['outdated'] === true) {
                    $outdated++;
                }
            }
            $summary['outdated_plugins'] = $outdated;
        }

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
     * Handle webhook callback from analyzer API
     * This is called when the analysis is complete
     */
    public function handle_webhook_callback($request) {
        // Get request body
        $body = $request->get_json_params();

        error_log('WP Analyzer Form - Webhook received: ' . json_encode(array(
            'success' => isset($body['success']) ? $body['success'] : null,
            'job_id' => isset($body['job_id']) ? $body['job_id'] : null,
            'has_pdf' => isset($body['data']['pdf_base64']) ? 'yes' : 'no'
        )));

        // Validate required fields
        if (!isset($body['job_id'])) {
            error_log('WP Analyzer Form - Webhook missing job_id');
            return new WP_REST_Response(array('error' => 'Missing job_id'), 400);
        }

        $job_id = sanitize_text_field($body['job_id']);

        // Get stored job data
        $job_data = get_transient('wp_analyzer_api_job_' . $job_id);

        if (!$job_data) {
            error_log('WP Analyzer Form - Unknown job_id: ' . $job_id);
            return new WP_REST_Response(array('error' => 'Unknown job_id'), 404);
        }

        $email = $job_data['email'];
        $site_url = $job_data['url'];

        // Check if this is a success or failure
        if (!isset($body['success']) || !$body['success']) {
            $error_message = isset($body['error']) ? $body['error'] : 'Unknown error';
            error_log('WP Analyzer Form - Job failed: ' . $error_message);

            // Optionally send failure notification email
            $this->send_failure_email($email, $site_url, $error_message);

            // Clean up transient
            delete_transient('wp_analyzer_api_job_' . $job_id);

            return new WP_REST_Response(array('received' => true, 'status' => 'failure_processed'), 200);
        }

        // Extract PDF data
        if (!isset($body['data']['pdf_base64'])) {
            error_log('WP Analyzer Form - Webhook missing PDF data');
            return new WP_REST_Response(array('error' => 'Missing PDF data'), 400);
        }

        $pdf_base64 = $body['data']['pdf_base64'];
        $filename = isset($body['data']['filename']) ? $body['data']['filename'] : 'wordpress-analysis.pdf';
        $summary = isset($body['data']['summary']) ? $body['data']['summary'] : array();

        // Send email with PDF attachment
        $email_sent = $this->send_analysis_email($email, $site_url, $pdf_base64, $filename, $summary);

        // Clean up transient
        delete_transient('wp_analyzer_api_job_' . $job_id);

        if ($email_sent) {
            error_log('WP Analyzer Form - Email sent successfully to: ' . $email);
            return new WP_REST_Response(array('received' => true, 'email_sent' => true), 200);
        } else {
            error_log('WP Analyzer Form - Failed to send email to: ' . $email);
            return new WP_REST_Response(array('received' => true, 'email_sent' => false), 200);
        }
    }

    /**
     * Send analysis report email with PDF attachment
     */
    private function send_analysis_email($to_email, $site_url, $pdf_base64, $filename, $summary) {
        // Decode PDF
        $pdf_content = base64_decode($pdf_base64);

        if (!$pdf_content) {
            error_log('WP Analyzer Form - Failed to decode PDF');
            return false;
        }

        // Save PDF to temp file
        $upload_dir = wp_upload_dir();
        $temp_dir = $upload_dir['basedir'] . '/wp-analyzer-temp';

        if (!file_exists($temp_dir)) {
            wp_mkdir_p($temp_dir);
            // Add .htaccess to prevent direct access
            file_put_contents($temp_dir . '/.htaccess', 'deny from all');
        }

        $temp_file = $temp_dir . '/' . sanitize_file_name($filename);
        file_put_contents($temp_file, $pdf_content);

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
        $wp_version = isset($summary['wp_version']) ? esc_html($summary['wp_version']) : 'Unknown';
        $theme = isset($summary['theme']) ? esc_html($summary['theme']) : 'Unknown';

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
