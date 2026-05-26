// File: ./src/services/email-service.js

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

/**
 * Email service for sending WordPress analysis reports
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * Get WisdmLabs logo data as base64
     * @returns {string|null} Base64 encoded logo data or null if not found
     */
    getLogoData() {
        try {
            const logoPath = path.join(__dirname, '..', '..', 'assets', 'wisdmlabs-logo.webp');
            const logoBuffer = fs.readFileSync(logoPath);
            return `data:image/webp;base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.warn('Could not load logo for email:', error.message);
            return null;
        }
    }

    /**
     * Initialize email transporter based on environment variables
     */
    initializeTransporter() {
        const emailConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            // Increased timeout settings for cloud deployments
            connectionTimeout: 180000, // 3 minutes
            socketTimeout: 180000,     // 3 minutes
            greetingTimeout: 60000,    // 1 minute
            responseTimeout: 180000,   // 3 minutes
            // Additional connection options
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            rateLimit: 10 // messages per second
        };

        // Validate required email configuration
        if (!emailConfig.auth.user || !emailConfig.auth.pass) {
            console.warn('⚠️  Email configuration incomplete. Email functionality will be disabled.');
            console.warn('Please set SMTP_USER and SMTP_PASS environment variables.');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport(emailConfig);
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize email service:', error.message);
        }
    }

    /**
     * Send WordPress analysis report via email
     * @param {string} toEmail - Recipient email address
     * @param {string} siteUrl - Analyzed website URL
     * @param {Buffer} pdfBuffer - PDF report buffer
     * @param {Object} analysisData - Analysis results data
     * @param {Object} options - Email options
     * @returns {Promise<Object>} Email sending result
     */
    async sendAnalysisReport(toEmail, siteUrl, pdfBuffer, analysisData, options = {}) {
        if (!this.transporter) {
            throw new Error('Email service not configured. Please set up SMTP credentials.');
        }

        // Validate email address
        if (!this.isValidEmail(toEmail)) {
            throw new Error('Invalid email address format');
        }

        const domain = new URL(siteUrl).hostname;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `wordpress-analysis-${domain}-${timestamp}.pdf`;

        // Generate email content
        const emailContent = this.generateEmailContent(siteUrl, analysisData, options);

        // Prepare attachments
        const attachments = [
            {
                filename: filename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ];

        // Add logo as attachment if available
        const logoData = this.getLogoData();
        if (logoData) {
            const logoBuffer = Buffer.from(logoData.split(',')[1], 'base64');
            attachments.push({
                filename: 'wisdmlabs-logo.webp',
                content: logoBuffer,
                contentType: 'image/webp',
                cid: 'wisdmlabs-logo' // Content ID for referencing in HTML
            });
        }

        const mailOptions = {
            from: {
                name: 'WordPress Site Analyzer',
                address: process.env.SMTP_FROM || process.env.SMTP_USER
            },
            to: toEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            attachments: attachments
        };

        try {
            // Send email with increased timeout
            const result = await Promise.race([
                this.transporter.sendMail(mailOptions),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Email sending timeout after 5 minutes')), 300000)
                )
            ]);
            
            console.log(`✅ Analysis report sent to ${toEmail} for ${siteUrl}`);
            return {
                success: true,
                messageId: result.messageId,
                recipient: toEmail,
                siteUrl: siteUrl,
                filename: filename
            };
        } catch (error) {
            console.error('❌ Failed to send email:', error.message);
            throw new Error(`Email sending failed: ${error.message}`);
        }
    }

    /**
     * Generate email content based on analysis data
     * @param {string} siteUrl - Analyzed website URL
     * @param {Object} analysisData - Analysis results
     * @param {Object} options - Email options
     * @returns {Object} Email content (subject, html, text)
     */
    generateEmailContent(siteUrl, analysisData, options = {}) {
        const domain = new URL(siteUrl).hostname;
        const logoData = this.getLogoData();
        const isWordPress = analysisData.wordpress?.isWordPress || false;
        const wpVersion = analysisData.version?.version || 'Unknown';
        const themeName = analysisData.theme?.displayName || analysisData.theme?.name || 'Unknown';
        const pluginCount = analysisData.plugins?.length || 0;
        const outdatedPlugins = analysisData.plugins?.filter(p => p.isOutdated === true).length || 0;
        
        // Extract actual counts from analysis data
        const totalIssues = this.getActualIssuesCount(analysisData);
        const totalRecommendations = this.getActualRecommendationsCount(analysisData);
        
        // Generate engaging subject line
        const subject = `Your website speed report is ready (Important)`;

        // Generate HTML content
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WisdmLabs Analysis Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background-color: #F9FAFB;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .email-wrapper {
            max-width: 768px;
            margin: 0 auto;
            padding: 16px 24px 32px 24px;
        }
        @media (max-width: 640px) {
            .email-wrapper {
                padding: 12px 8px;
                max-width: 100%;
            }
        }
        @media (min-width: 1024px) {
            .email-wrapper {
                padding: 32px;
            }
        }
        
        .header {
            text-align: center;
            margin-bottom: 48px;
        }
        @media (max-width: 640px) {
            .header {
                margin-bottom: 32px;
            }
            .header h1 {
                font-size: 18px !important;
            }
            .header .subtitle {
                font-size: 14px !important;
            }
        }
        .header-branding {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
            text-align: center;
        }
        /* Fallback for email clients that don't support flexbox */
        .no-flexbox .header-branding {
            display: table;
            margin: 0 auto 16px auto;
        }
        .no-flexbox .header-branding > * {
            display: table-cell;
            vertical-align: middle;
            text-align: center;
        }
        .header-logo {
            height: 60px;
            width: auto;
            max-width: 180px;
            vertical-align: middle;
            display: inline-block;
        }
        .logo-text {
            font-size: 30px;
            font-weight: 700;
            color: #1F2937;
            letter-spacing: -0.025em;
            margin: 0;
            vertical-align: middle;
            display: inline-block;
        }
        .header h1 {
            font-size: 20px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 4px;
        }
        .header .subtitle {
            color: #6B7280;
            margin-top: 4px;
        }
        
        .pdf-notice {
            background: #EFF6FF;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #DBEAFE;
            margin-bottom: 32px;
            text-align: center;
        }
        .pdf-content h3 {
            font-weight: 600;
            color: #1E40AF;
            margin-bottom: 8px;
            font-size: 18px;
        }
        .pdf-content p {
            font-size: 14px;
            color: #1D4ED8;
        }
        
        .summary-section {
            background: #FFFFFF;
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #E5E7EB;
            margin-bottom: 32px;
        }
        .summary-header {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 24px;
            text-align: center;
            color: #1F2937;
        }
        .summary-container {
            display: flex;
            justify-content: space-around;
            gap: 24px;
        }
        @media (max-width: 640px) {
            .summary-container {
                flex-direction: column;
                gap: 16px;
            }
        }
        
        /* Mobile-friendly table styles for Analysis Summary */
        @media (max-width: 640px) {
            .summary-section {
                padding: 20px 16px;
            }
            .summary-header {
                font-size: 20px;
                margin-bottom: 20px;
            }
            .summary-section table {
                width: 100% !important;
            }
            .summary-section table td {
                width: 100% !important;
                display: block !important;
                padding: 0 0 16px 0 !important;
            }
            .summary-section table td:last-child {
                padding-bottom: 0 !important;
            }
            .summary-section .summary-item {
                padding: 16px !important;
                margin-bottom: 0 !important;
            }
            .summary-section .summary-label {
                font-size: 13px !important;
                margin-bottom: 6px !important;
            }
            .summary-section .summary-value {
                font-size: 28px !important;
            }
        }
        .summary-item {
            padding: 20px;
            background: #F9FAFB;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            text-align: center;
        }
        .summary-label {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 8px;
            font-weight: 500;
        }
        .summary-value {
            font-weight: 600;
            font-size: 32px;
            color: #1F2937;
        }
        .summary-item.critical {
            background: #FEF2F2;
            border-color: #FECACA;
        }
        .summary-item.critical .summary-label {
            color: #DC2626;
        }
        .summary-item.critical .summary-value {
            color: #B91C1C;
        }
        .summary-item.recommendations {
            background: #F0FDF4;
            border-color: #BBF7D0;
        }
        .summary-item.recommendations .summary-label {
            color: #16A34A;
        }
        .summary-item.recommendations .summary-value {
            color: #15803D;
        }
        
        .contact-section {
            background: #FFFFFF;
            text-align: center;
            padding: 40px;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 640px) {
            .contact-section {
                padding: 24px 16px;
            }
            .contact-section h2 {
                font-size: 20px !important;
                margin-bottom: 12px !important;
            }
            .contact-section p {
                font-size: 14px !important;
                margin-bottom: 24px !important;
            }
            .cta-button {
                padding: 12px 24px !important;
                font-size: 14px !important;
            }
        }
        .contact-section h2 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 16px;
            color: #1F2937;
        }
        .contact-section p {
            color: #6B7280;
            max-width: 480px;
            margin: 0 auto 32px auto;
            font-size: 16px;
            line-height: 1.5;
        }
        .cta-button {
            background: #960000;
            color: white !important;
            font-weight: 600;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            transition: background-color 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-size: 16px;
        }
        .cta-button:hover {
            background: #7a0000;
        }
        
        .footer {
            text-align: center;
            font-size: 14px;
            color: #6B7280;
            margin-top: 48px;
            padding-top: 32px;
            border-top: 1px solid #E5E7EB;
        }
        .footer-logo {
            margin-bottom: 16px;
        }
        .footer-branding {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
            text-align: center;
        }
        /* Fallback for email clients that don't support flexbox */
        .no-flexbox .footer-branding {
            display: table;
            margin: 0 auto 16px auto;
        }
        .no-flexbox .footer-branding > * {
            display: table-cell;
            vertical-align: middle;
            text-align: center;
        }
        .footer-logo-img {
            height: 20px;
            width: auto;
            max-width: 60px;
            vertical-align: middle;
            display: inline-block;
        }
        .footer-logo p {
            font-weight: 700;
            font-size: 18px;
            color: #1F2937;
            margin: 0;
            vertical-align: middle;
            display: inline-block;
        }
        .footer p {
            margin-bottom: 16px;
        }
        .footer-copyright {
            font-size: 12px;
        }
        .footer-analysis-info {
            font-size: 12px;
            margin-top: 4px;
        }
        .footer-analysis-info a {
            color: #6366F1;
            text-decoration: none;
        }
        .footer-analysis-info a:hover {
            text-decoration: underline;
        }
        
    </style>
</head>
<body>
    <div class="email-wrapper">
        <header class="header">
            <table style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
                <tr>
                    <td style="text-align: center; padding: 0;">
                        ${logoData ? `<a href="https://wisdmlabs.com/?utm_source=email&utm_medium=wordpress_analyzer&utm_campaign=header_logo" style="text-decoration: none; display: inline-block;"><img src="cid:wisdmlabs-logo" alt="WisdmLabs" style="height: 60px; width: auto; max-width: 180px; display: block; margin: 0 auto;"></a>` : ''}
                    </td>
                </tr>
            </table>
            <h1>WordPress Analysis Report</h1>
            <p class="subtitle">Comprehensive Plugins & Performance Analysis</p>
        </header>
        
        <main>
            <section class="pdf-notice">
                <div class="pdf-content">
                    <h3>Full Report Attached</h3>
                    <p>For a detailed breakdown and technical specifics, please see the attached PDF document.</p>
                </div>
            </section>
            
            <section class="summary-section">
                <h2 class="summary-header">Analysis Summary</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 33.33%; padding: 0 12px; vertical-align: top;">
                            <div class="summary-item" style="padding: 20px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; text-align: center;">
                                <p class="summary-label" style="font-size: 14px; color: #6B7280; margin-bottom: 8px; font-weight: 500;">Plugins Analyzed</p>
                                <p class="summary-value" style="font-weight: 600; font-size: 32px; color: #1F2937;">${pluginCount}</p>
                            </div>
                        </td>
                        <td style="width: 33.33%; padding: 0 12px; vertical-align: top;">
                            <div class="summary-item critical" style="padding: 20px; background: #FEF2F2; border-radius: 8px; border: 1px solid #FECACA; text-align: center;">
                                <p class="summary-label" style="font-size: 14px; color: #DC2626; margin-bottom: 8px; font-weight: 500;">Issues</p>
                                <p class="summary-value" style="font-weight: 600; font-size: 32px; color: #B91C1C;">${totalIssues}</p>
                            </div>
                        </td>
                        <td style="width: 33.33%; padding: 0 12px; vertical-align: top;">
                            <div class="summary-item recommendations" style="padding: 20px; background: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0; text-align: center;">
                                <p class="summary-label" style="font-size: 14px; color: #16A34A; margin-bottom: 8px; font-weight: 500;">Recommendations</p>
                                <p class="summary-value" style="font-weight: 600; font-size: 32px; color: #15803D;">${totalRecommendations}</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </section>
            
            <section class="contact-section">
                <h2>Need Expert Help?</h2>
                <p>Our WordPress experts are ready to help you resolve these issues, optimize your site's performance, and keep it secure.</p>
                <a href="https://wisdmlabs.com/fix-wordpress-issues/?utm_source=email&utm_medium=wordpress_analyzer&utm_campaign=cta_button" class="cta-button">
                    Schedule a Free Consultation
                </a>
            </section>
        </main>
        
        <footer class="footer">
            <div class="footer-logo">
                <table style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
                    <tr>
                        <td style="text-align: center; padding: 0;">
                            ${logoData ? `<a href="https://wisdmlabs.com/?utm_source=email&utm_medium=wordpress_analyzer&utm_campaign=footer_logo" style="text-decoration: none; display: inline-block;"><img src="cid:wisdmlabs-logo" alt="WisdmLabs" style="height: 32px; width: auto; max-width: 96px; display: block; margin: 0 auto;"></a>` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="text-align: center; padding: 8px 0 0 0;">
                            <a href="https://wisdmlabs.com/?utm_source=email&utm_medium=wordpress_analyzer&utm_campaign=footer_text" style="text-decoration: none; color: #1F2937;"><p style="font-weight: 700; font-size: 18px; color: #1F2937; margin: 0;">WisdmLabs</p></a>
                        </td>
                    </tr>
                </table>
            </div>
            <p>This report was automatically generated by the WordPress Site Analyzer v2.0.0.</p>
            <p class="footer-copyright">© 2024 WisdmLabs. All rights reserved.</p>
            <p class="footer-analysis-info">Analysis completed on ${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString('en-GB', { hour12: true })} for <a href="${siteUrl}">${domain}</a></p>
        </footer>
    </div>
</body>
</html>`;

        // Generate plain text content
        const text = `
WisdmLabs - WordPress Analysis Report
=====================================

Website: ${domain}
Analysis Date: ${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString('en-GB', { hour12: true })}

FULL REPORT ATTACHED
-------------------
For a detailed breakdown and technical specifics, please see the attached PDF document.

ANALYSIS SUMMARY:
----------------
Plugins Analyzed: ${pluginCount}
Issues: ${totalIssues}
Recommendations: ${totalRecommendations}

${totalIssues > 0 ? `
ISSUES DETECTED:
------------------------
${this.generateIssuesListText(analysisData, outdatedPlugins)}
` : ''}

NEED EXPERT HELP?
----------------
Our WordPress security experts are ready to help you resolve these issues, optimize your site's performance, and keep it secure.

Contact Information:
- Email: support@wisdmlabs.com
- Website: https://wisdmlabs.com
- Response Time: Within 24 hours

Schedule a Free Consultation: mailto:support@wisdmlabs.com?subject=WordPress Analysis Report - ${domain}

---
This report was automatically generated by the WordPress Site Analyzer v2.0.0.

© 2024 WisdmLabs. All rights reserved.
Analysis completed for: ${domain}
`;

        return { subject, html, text };
    }

    /**
     * Get actual issues count from analysis data (matches HTML report logic)
     * @param {Object} analysisData - Analysis results data
     * @returns {number} Number of issue cards (same as HTML report)
     */
    getActualIssuesCount(analysisData) {
        // Generate the same analysis data that HTML reporter uses
        const analysis = this.generateSiteAnalysis(analysisData);
        
        if (analysis) {
            // Count issue cards using the same logic as HTML report
            return this.countIssueCards(analysis);
        }
        
        // Fallback to legacy calculation if analysis data is not available
        return this.calculateSecurityIssues(analysisData) + this.calculatePerformanceIssues(analysisData);
    }

    /**
     * Get actual recommendations count from analysis data (matches HTML report logic)
     * @param {Object} analysisData - Analysis results data
     * @returns {number} Number of recommendation cards (same as HTML report)
     */
    getActualRecommendationsCount(analysisData) {
        // Generate the same analysis data that HTML reporter uses
        const analysis = this.generateSiteAnalysis(analysisData);
        
        if (analysis) {
            // Count recommendation cards using the same logic as HTML report
            return this.countRecommendationCards(analysis);
        }
        
        // Fallback to legacy calculation if analysis data is not available
        return this.calculateRecommendationCount(analysisData);
    }

    /**
     * Generate site analysis data (same as HTML reporter)
     * @param {Object} data - Analysis results data
     * @returns {Object} Analysis results with critical issues and action plan
     */
    generateSiteAnalysis(data) {
        const performance = data.performance || {};
        const plugins = data.plugins || [];
        const recommendations = data.recommendations || {};
        
        // Extract all available performance metrics with correct field mapping
        const mobileMetrics = performance.pagespeed?.mobile?.core_web_vitals || {};
        const desktopMetrics = performance.pagespeed?.desktop?.core_web_vitals || {};
        
        const metrics = {
            pageLoadTime: performance.main_page_timing?.total_time || 0,
            pageSize: performance.main_page_timing?.content_length || 0,
            mobileScore: performance.pagespeed?.mobile?.performance_score || 0,
            desktopScore: performance.pagespeed?.desktop?.performance_score || 0,
            lcp: Math.min(
                mobileMetrics.lcp?.value || Infinity,
                desktopMetrics.lcp?.value || Infinity
            ),
            cls: Math.max(
                mobileMetrics.cls?.value || 0,
                desktopMetrics.cls?.value || 0
            ),
            fcp: Math.min(
                mobileMetrics.fcp?.value || Infinity,
                desktopMetrics.fcp?.value || Infinity
            )
        };

        // Analyze plugin performance impact
        const pluginAnalysis = this.analyzePluginPerformance(plugins, performance.plugin_performance || {});
        
        // Generate critical issues
        const criticalIssues = this.identifyCriticalIssues(metrics, pluginAnalysis, plugins);
        
        // Generate action plan with priorities
        const actionPlan = this.generatePriorityActionPlan(criticalIssues, metrics, pluginAnalysis, recommendations);
        
        // Generate must-use plugin recommendations (same as HTML report)
        const mustUsePlugins = this.generateMustUsePluginRecommendations(criticalIssues, plugins);
        
        return {
            metrics,
            pluginAnalysis,
            criticalIssues,
            actionPlan,
            mustUsePlugins
        };
    }

    /**
     * Analyze plugin performance impact
     * @param {Array} plugins - Array of plugin objects
     * @param {Object} performanceData - Performance data for plugins
     * @returns {Object} Plugin analysis results
     */
    analyzePluginPerformance(plugins, performanceData) {
        const analysis = {
            heavyPlugins: [],
            outdatedPlugins: [],
            optimizationPlugins: [],
            securityPlugins: [],
            totalSize: 0,
            averageSize: 0
        };

        plugins.forEach(plugin => {
            const perfData = performanceData[plugin.name] || performanceData[plugin.displayName] || {};
            const size = perfData.total_size || 0;
            analysis.totalSize += size;

            // Categorize plugins
            if (size > 200000) { // > 200KB
                analysis.heavyPlugins.push({...plugin, size, impactLevel: 'HIGH'});
            }
            
            if (plugin.isOutdated === true) {
                analysis.outdatedPlugins.push({...plugin, size});
            }

            // Identify plugin types
            const name = (plugin.name || '').toLowerCase();
            const displayName = (plugin.displayName || '').toLowerCase();
            
            if (name.includes('cache') || name.includes('rocket') || name.includes('optimize') || name.includes('speed')) {
                analysis.optimizationPlugins.push(plugin);
            }
            
            if (name.includes('security') || name.includes('firewall') || name.includes('wordfence') || name.includes('sucuri')) {
                analysis.securityPlugins.push(plugin);
            }
        });

        analysis.averageSize = plugins.length > 0 ? analysis.totalSize / plugins.length : 0;
        return analysis;
    }

    /**
     * Identify critical performance issues
     * @param {Object} metrics - Performance metrics
     * @param {Object} pluginAnalysis - Plugin analysis results
     * @param {Array} plugins - Array of plugins
     * @returns {Array} Array of critical issues
     */
    identifyCriticalIssues(metrics, pluginAnalysis, plugins) {
        const issues = [];

        // Core Web Vitals issues
        if (metrics.lcp > 4000) {
            issues.push({
                type: 'core_web_vital',
                severity: 'critical',
                metric: 'LCP',
                value: (metrics.lcp/1000).toFixed(1) + 's',
                threshold: '2.5s',
                impact: 'User experience and SEO rankings severely affected',
                priority: 'high'
            });
        }

        if (metrics.cls > 0.25) {
            issues.push({
                type: 'core_web_vital',
                severity: 'critical',
                metric: 'CLS',
                value: metrics.cls.toFixed(3),
                threshold: '0.1',
                impact: 'Poor user experience due to layout shifts',
                priority: 'high'
            });
        }

        // Performance score issues
        if (metrics.mobileScore < 0.5) {
            issues.push({
                type: 'performance_score',
                severity: 'critical',
                metric: 'Mobile Performance',
                value: Math.round(metrics.mobileScore * 100),
                threshold: '90',
                impact: 'Mobile users experiencing slow site performance',
                priority: 'high'
            });
        }

        // Plugin-related issues
        if (pluginAnalysis.heavyPlugins.length > 0) {
            issues.push({
                type: 'plugin_performance',
                severity: 'warning',
                metric: 'Heavy Plugins',
                value: pluginAnalysis.heavyPlugins.length,
                threshold: '0',
                impact: 'Plugins consuming excessive resources',
                priority: 'medium',
                plugins: pluginAnalysis.heavyPlugins.map(p => p.name)
            });
        }

        if (pluginAnalysis.outdatedPlugins.length > 0) {
            issues.push({
                type: 'security_maintenance',
                severity: 'critical',
                metric: 'Outdated Plugins',
                value: pluginAnalysis.outdatedPlugins.length,
                threshold: '0',
                impact: 'Security vulnerabilities and potential compatibility issues',
                priority: 'high',
                plugins: pluginAnalysis.outdatedPlugins.map(p => p.name)
            });
        }

        // Missing optimization
        if (pluginAnalysis.optimizationPlugins.length === 0) {
            issues.push({
                type: 'missing_optimization',
                severity: 'warning',
                metric: 'Caching/Optimization Plugins',
                value: '0',
                threshold: '1+',
                impact: 'Site not utilizing performance optimization tools',
                priority: 'medium'
            });
        }

        return issues;
    }

    /**
     * Generate priority-based action plan
     * @param {Array} criticalIssues - Array of critical issues
     * @param {Object} metrics - Performance metrics
     * @param {Object} pluginAnalysis - Plugin analysis results
     * @param {Object} recommendations - Recommendations data
     * @returns {Array} Array of action plan items
     */
    generatePriorityActionPlan(criticalIssues, metrics, pluginAnalysis, recommendations) {
        const actions = [];

        // High priority actions from critical issues
        criticalIssues.filter(issue => issue.priority === 'high').forEach(issue => {
            switch (issue.type) {
                case 'core_web_vital':
                    if (issue.metric === 'LCP') {
                        actions.push({
                            priority: 'high',
                            action: 'Optimize Largest Contentful Paint',
                            description: 'Your LCP is ' + issue.value + ', which is above the recommended ' + issue.threshold,
                            steps: [
                                'Install a caching plugin (WP Rocket, W3 Total Cache)',
                                'Optimize images and use modern formats (WebP)',
                                'Implement lazy loading for images',
                                'Minimize CSS and JavaScript files'
                            ],
                            expectedImpact: 'Reduce LCP by 30-50%',
                            timeEstimate: '2-4 hours'
                        });
                    }
                    break;
                case 'security_maintenance':
                    actions.push({
                        priority: 'high',
                        action: 'Update Outdated Plugins',
                        description: `${issue.value} plugins are outdated and pose security risks`,
                        steps: [
                            'Backup your site before updating',
                            'Update plugins one by one in staging environment',
                            'Test functionality after each update',
                            'Monitor for any compatibility issues'
                        ],
                        expectedImpact: 'Improved security and performance',
                        timeEstimate: '1-2 hours'
                    });
                    break;
            }
        });

        // Medium priority actions
        if (pluginAnalysis.optimizationPlugins.length === 0) {
            actions.push({
                priority: 'medium',
                action: 'Install Performance Optimization Plugin',
                description: 'No caching or optimization plugins detected',
                steps: [
                    'Install WP Rocket (premium) or W3 Total Cache (free)',
                    'Configure basic caching settings',
                    'Enable CSS/JS minification',
                    'Set up CDN if available'
                ],
                expectedImpact: 'Improve page load time by 20-40%',
                timeEstimate: '1-3 hours'
            });
        }

        // Plugin-specific actions
        pluginAnalysis.heavyPlugins.forEach(plugin => {
            actions.push({
                priority: 'medium',
                action: `Optimize ${plugin.displayName || plugin.name}`,
                description: `This plugin is using ${Math.round(plugin.size/1024)}KB of resources`,
                steps: [
                    'Review plugin settings for optimization options',
                    'Disable unused features',
                    'Consider lighter alternatives if available',
                    'Implement conditional loading if possible'
                ],
                expectedImpact: 'Reduce resource usage',
                timeEstimate: '30-60 minutes'
            });
        });

        return actions.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Count issue cards using the same logic as HTML report
     * @param {Object} analysis - Analysis data
     * @returns {number} Number of issue cards
     */
    countIssueCards(analysis) {
        let count = 0;

        // Security Issues - 1 card if outdated plugins exist
        if (analysis.pluginAnalysis.outdatedPlugins.length > 0) {
            count++;
        }

        // Heavy Plugins - 1 card if heavy plugins exist
        if (analysis.pluginAnalysis.heavyPlugins.length > 0) {
            count++;
        }

        // Performance Issues - 1 card if scores are low
        if (analysis.metrics.mobileScore < 0.5 || analysis.metrics.desktopScore < 0.5) {
            count++;
        }

        // Core Web Vitals - 1 card if LCP is high
        if (analysis.metrics.lcp > 4000) {
            count++;
        }

        // Missing Optimization - 1 card if no optimization plugins
        if (analysis.pluginAnalysis.optimizationPlugins.length === 0) {
            count++;
        }

        // Missing Security - 1 card if no security plugins
        if (analysis.pluginAnalysis.securityPlugins.length === 0) {
            count++;
        }

        return count;
    }

    /**
     * Count recommendation cards using the same logic as HTML report
     * @param {Object} analysis - Analysis data
     * @returns {number} Number of recommendation cards
     */
    countRecommendationCards(analysis) {
        let count = 0;

        // Security Fix - 1 card if outdated plugins or no security plugins
        if (analysis.pluginAnalysis.outdatedPlugins.length > 0 || analysis.pluginAnalysis.securityPlugins.length === 0) {
            count++;
        }

        // Performance Fix - 1 card if poor performance or no optimization plugins
        if (analysis.metrics.mobileScore < 0.5 || analysis.pluginAnalysis.optimizationPlugins.length === 0) {
            count++;
        }

        // Plugin Optimization - 1 card if heavy plugins exist
        if (analysis.pluginAnalysis.heavyPlugins.length > 0) {
            count++;
        }

        // Core Web Vitals Fix - 1 card if LCP or CLS issues exist
        if (analysis.metrics.lcp > 4000 || analysis.metrics.cls > 0.25) {
            count++;
        }

        // Image and Database Optimization - Always 1 card (always included)
        count++;

        // Must-use plugins - 1 card if missing plugins exist
        if (analysis.mustUsePlugins && analysis.mustUsePlugins.missing.length > 0) {
            count++;
        }

        return count;
    }

    /**
     * Generate must-use plugin recommendations (same as HTML report)
     * @param {Array} criticalIssues - Array of critical issues
     * @param {Array} currentPlugins - Array of current plugins
     * @returns {Object} Must-use plugin recommendations
     */
    generateMustUsePluginRecommendations(criticalIssues, currentPlugins) {
        const currentPluginNames = currentPlugins.map(p => (p.name || '').toLowerCase());
        const mustUseCategories = {
            security: {
                essential: [
                    { name: 'wordfence', displayName: 'Wordfence Security', reason: 'Comprehensive security protection' },
                    { name: 'sucuri-scanner', displayName: 'Sucuri Security', reason: 'Malware scanning and cleanup' }
                ],
                present: currentPluginNames.some(name => 
                    name.includes('security') || name.includes('wordfence') || name.includes('sucuri')
                )
            },
            performance: {
                essential: [
                    { name: 'wp-rocket', displayName: 'WP Rocket', reason: 'Premium caching and optimization' },
                    { name: 'w3-total-cache', displayName: 'W3 Total Cache', reason: 'Free comprehensive caching solution' },
                    { name: 'autoptimize', displayName: 'Autoptimize', reason: 'CSS/JS optimization and minification' }
                ],
                present: currentPluginNames.some(name => 
                    name.includes('cache') || name.includes('rocket') || name.includes('optimize')
                )
            },
            backup: {
                essential: [
                    { name: 'updraftplus', displayName: 'UpdraftPlus', reason: 'Reliable backup and restoration' },
                    { name: 'backwpup', displayName: 'BackWPup', reason: 'Complete backup solution' }
                ],
                present: currentPluginNames.some(name => 
                    name.includes('backup') || name.includes('updraft')
                )
            },
            seo: {
                essential: [
                    { name: 'wordpress-seo', displayName: 'Yoast SEO', reason: 'Comprehensive SEO optimization' },
                    { name: 'all-in-one-seo-pack', displayName: 'All in One SEO', reason: 'Alternative SEO solution' }
                ],
                present: currentPluginNames.some(name => 
                    name.includes('seo') || name.includes('yoast')
                )
            }
        };

        const missing = [];
        const recommendations = [];

        Object.entries(mustUseCategories).forEach(([category, data]) => {
            if (!data.present) {
                missing.push(category);
                recommendations.push({
                    category: category.charAt(0).toUpperCase() + category.slice(1),
                    plugins: data.essential,
                    priority: category === 'security' ? 'high' : category === 'performance' ? 'high' : 'medium',
                    impact: this.getCategoryImpact(category)
                });
            }
        });

        return { missing, recommendations };
    }

    /**
     * Get impact description for plugin categories
     * @param {string} category - Plugin category
     * @returns {string} Impact description
     */
    getCategoryImpact(category) {
        const impacts = {
            security: 'Protect against malware, hacking attempts, and security vulnerabilities',
            performance: 'Improve page load times, user experience, and SEO rankings',
            backup: 'Ensure data safety and quick recovery from issues',
            seo: 'Improve search engine visibility and organic traffic'
        };
        return impacts[category] || 'Enhance site functionality';
    }

    /**
     * Calculate security issues from analysis data
     * @param {Object} analysisData - Analysis results
     * @returns {number} Number of security issues
     */
    calculateSecurityIssues(analysisData) {
        let issues = 0;
        
        // Check for outdated WordPress version
        if (analysisData.version && analysisData.version.isOutdated) {
            issues++;
        }
        
        // Check for security vulnerabilities
        if (analysisData.security && analysisData.security.vulnerabilities) {
            issues += analysisData.security.vulnerabilities.length;
        }
        
        // Check for insecure configurations
        if (analysisData.security && analysisData.security.issues) {
            issues += analysisData.security.issues.filter(issue => issue.severity === 'high' || issue.severity === 'critical').length;
        }
        
        return issues;
    }

    /**
     * Calculate performance issues from analysis data
     * @param {Object} analysisData - Analysis results
     * @returns {number} Number of performance issues
     */
    calculatePerformanceIssues(analysisData) {
        let issues = 0;
        
        // Check for performance recommendations
        if (analysisData.recommendations && analysisData.recommendations.performance) {
            issues += analysisData.recommendations.performance.filter(rec => rec.priority === 'high').length;
        }
        
        // Check for large plugin sizes
        if (analysisData.plugins) {
            const heavyPlugins = analysisData.plugins.filter(plugin => {
                const totalSize = (plugin.cssSize || 0) + (plugin.jsSize || 0);
                return totalSize > 500000; // 500KB threshold
            });
            if (heavyPlugins.length > 0) {
                issues++;
            }
        }
        
        return issues;
    }

    /**
     * Calculate total recommendation count from analysis data
     * @param {Object} analysisData - Analysis results
     * @returns {number} Total number of recommendations
     */
    calculateRecommendationCount(analysisData) {
        let count = 0;
        
        // Add performance recommendations
        if (analysisData.recommendations && analysisData.recommendations.performance) {
            count += analysisData.recommendations.performance.length;
        }
        
        // Add security recommendations
        if (analysisData.recommendations && analysisData.recommendations.security) {
            count += analysisData.recommendations.security.length;
        }
        
        // Add plugin recommendations
        if (analysisData.recommendations && analysisData.recommendations.plugins) {
            count += analysisData.recommendations.plugins.length;
        }
        
        // Add general recommendations
        if (analysisData.recommendations && analysisData.recommendations.general) {
            count += analysisData.recommendations.general.length;
        }
        
        // Default to 5 if no recommendations found
        return count > 0 ? count : 5;
    }

    /**
     * Generate issues list HTML
     * @param {Object} analysisData - Analysis results
     * @param {number} outdatedPlugins - Number of outdated plugins
     * @returns {string} HTML for issues list
     */
    generateIssuesList(analysisData, outdatedPlugins) {
        const issues = [];
        
        // Add outdated plugins issue
        if (outdatedPlugins > 0) {
            issues.push({
                icon: `<svg class="icon" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>`,
                text: `${outdatedPlugins} outdated plugin${outdatedPlugins > 1 ? 's' : ''} detected - potential security vulnerabilities`
            });
        }
        
        // Add WordPress version issue
        if (analysisData.version && analysisData.version.isOutdated) {
            issues.push({
                icon: `<svg class="icon" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <circle cx="12" cy="16" r="1"></circle>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>`,
                text: `WordPress ${analysisData.version.version} is outdated - update to latest version for security`
            });
        }
        
        // Add security issues
        if (analysisData.security && analysisData.security.issues) {
            const criticalIssues = analysisData.security.issues.filter(issue => 
                issue.severity === 'high' || issue.severity === 'critical'
            );
            criticalIssues.forEach(issue => {
                issues.push({
                    icon: `<svg class="icon" viewBox="0 0 24 24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>`,
                    text: `${issue.title} - ${issue.description}`
                });
            });
        }
        
        // Add performance issues
        if (analysisData.plugins) {
            const heavyPlugins = analysisData.plugins.filter(plugin => {
                const totalSize = (plugin.cssSize || 0) + (plugin.jsSize || 0);
                return totalSize > 500000; // 500KB threshold
            });
            if (heavyPlugins.length > 0) {
                issues.push({
                    icon: `<svg class="icon" viewBox="0 0 24 24">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                    </svg>`,
                    text: `${heavyPlugins.length} heavy plugin${heavyPlugins.length > 1 ? 's' : ''} detected - may impact site speed`
                });
            }
        }
        
        // Generate HTML
        return issues.map(issue => `
            <div class="issue-item">
                <div class="issue-icon">${issue.icon}</div>
                <div class="issue-text">${issue.text}</div>
            </div>
        `).join('');
    }

    /**
     * Generate issues list for plain text email
     * @param {Object} analysisData - Analysis results
     * @param {number} outdatedPlugins - Number of outdated plugins
     * @returns {string} Plain text for issues list
     */
    generateIssuesListText(analysisData, outdatedPlugins) {
        const issues = [];
        
        // Add outdated plugins issue
        if (outdatedPlugins > 0) {
            issues.push(`⚠️ ${outdatedPlugins} outdated plugin${outdatedPlugins > 1 ? 's' : ''} detected - potential security vulnerabilities`);
        }
        
        // Add WordPress version issue
        if (analysisData.version && analysisData.version.isOutdated) {
            issues.push(`🔒 WordPress ${analysisData.version.version} is outdated - update to latest version for security`);
        }
        
        // Add security issues
        if (analysisData.security && analysisData.security.issues) {
            const criticalIssues = analysisData.security.issues.filter(issue => 
                issue.severity === 'high' || issue.severity === 'critical'
            );
            criticalIssues.forEach(issue => {
                issues.push(`🚨 ${issue.title} - ${issue.description}`);
            });
        }
        
        // Add performance issues
        if (analysisData.plugins) {
            const heavyPlugins = analysisData.plugins.filter(plugin => {
                const totalSize = (plugin.cssSize || 0) + (plugin.jsSize || 0);
                return totalSize > 500000; // 500KB threshold
            });
            if (heavyPlugins.length > 0) {
                issues.push(`🐌 ${heavyPlugins.length} heavy plugin${heavyPlugins.length > 1 ? 's' : ''} detected - may impact site speed`);
            }
        }
        
        return issues.join('\n');
    }

    /**
     * Validate email address format
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Test email configuration
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        if (!this.transporter) {
            return {
                success: false,
                error: 'Email service not configured'
            };
        }

        try {
            await this.transporter.verify();
            return {
                success: true,
                message: 'Email service is properly configured'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send test email
     * @param {string} toEmail - Recipient email address
     * @returns {Promise<Object>} Test email result
     */
    async sendTestEmail(toEmail) {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        const testContent = {
            subject: 'WordPress Site Analyzer - Test Email',
            html: `
                <h2>Test Email</h2>
                <p>This is a test email from WordPress Site Analyzer.</p>
                <p>If you received this email, your email configuration is working correctly!</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            `,
            text: `
Test Email

This is a test email from WordPress Site Analyzer.

If you received this email, your email configuration is working correctly!

Timestamp: ${new Date().toLocaleString()}
            `
        };

        const mailOptions = {
            from: {
                name: 'WordPress Site Analyzer',
                address: process.env.SMTP_FROM || process.env.SMTP_USER
            },
            to: toEmail,
            subject: testContent.subject,
            html: testContent.html,
            text: testContent.text
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: result.messageId,
                recipient: toEmail
            };
        } catch (error) {
            throw new Error(`Test email failed: ${error.message}`);
        }
    }
}

module.exports = EmailService;
