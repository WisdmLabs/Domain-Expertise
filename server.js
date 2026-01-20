// File: ./server.js

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { Client: QStashClient } = require('@upstash/qstash');
const WordPressAnalyzer = require('./src/wordpress-analyzer');
const EmailService = require('./src/services/email-service');

// Initialize QStash client (for async job processing)
const qstash = process.env.QSTASH_TOKEN
    ? new QStashClient({ token: process.env.QSTASH_TOKEN })
    : null;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize analyzer
const analyzer = new WordPressAnalyzer({
    includePlugins: true,
    includeTheme: true,
    includeVersion: true,
    includePerformance: true
});

// Initialize email service
const emailService = new EmailService();

// API endpoint for analysis
app.post('/api/analyze', async (req, res) => {
    try {
        const { url, format } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                success: false 
            });
        }

        console.log(`🔍 Starting analysis for: ${url}`);
        
        // Perform analysis
        const results = await analyzer.analyzeSite(url);
        
        console.log(`✅ Analysis completed for: ${url}`);
        
        // If HTML format is requested, generate HTML report
        if (format === 'html') {
            console.log('🔧 Generating HTML report...');
            try {
                const htmlReport = analyzer.generateHtmlReport(results);
                console.log(`✅ HTML report generated, length: ${htmlReport.length}`);
                return res.json({
                    success: true,
                    data: results,
                    htmlReport: htmlReport
                });
            } catch (error) {
                console.error('❌ HTML report generation failed:', error.message);
                return res.status(500).json({
                    success: false,
                    error: `HTML report generation failed: ${error.message}`,
                    data: results
                });
            }
        }
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            data: null
        });
    }
});

// PDF report endpoint
app.post('/api/analyze/pdf', async (req, res) => {
    try {
        const { url, filename, format, options } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                success: false 
            });
        }

        console.log(`🔍 Starting PDF analysis for: ${url}`);
        
        // Perform analysis
        const results = await analyzer.analyzeSite(url);
        
        console.log(`✅ Analysis completed for: ${url}`);
        console.log('📄 Generating PDF report...');
        
        try {
            let pdfData;
            const pdfOptions = options || {};
            
            // Generate PDF based on format parameter
            switch (format) {
                case 'print':
                    pdfData = await analyzer.generatePrintOptimizedPdfReport(results, pdfOptions);
                    break;
                case 'landscape':
                    pdfData = await analyzer.generateLandscapePdfReport(results, pdfOptions);
                    break;
                case 'with-filename':
                    const pdfWithFilename = await analyzer.generatePdfReportWithFilename(results, filename, pdfOptions);
                    pdfData = pdfWithFilename.buffer;
                    break;
                default:
                    pdfData = await analyzer.generatePdfReport(results, pdfOptions);
            }
            
            console.log(`✅ PDF report generated, size: ${pdfData.length} bytes`);
            
            // Set appropriate headers for PDF download
            const reportData = analyzer.generateJsonReport(results);
            const domain = new URL(url).hostname;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const defaultFilename = `wordpress-analysis-${domain}-${timestamp}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename || defaultFilename}"`);
            res.setHeader('Content-Length', pdfData.length);
            res.setHeader('Cache-Control', 'no-cache');
            
            // Send PDF buffer
            res.send(pdfData);
            
        } catch (pdfError) {
            console.error('❌ PDF generation failed:', pdfError.message);
            return res.status(500).json({
                success: false,
                error: `PDF generation failed: ${pdfError.message}`,
                data: results
            });
        }
        
    } catch (error) {
        console.error('❌ PDF analysis failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            data: null
        });
    }
});

// ============================================================================
// WEBHOOK-BASED ASYNC REPORT ENDPOINT (for WordPress integration)
// ============================================================================

/**
 * POST /api/analyze/report
 *
 * Queues a report generation job and returns immediately.
 * Results are sent to the provided webhook_url when complete.
 *
 * Request body:
 *   - url: Website URL to analyze (required)
 *   - webhook_url: URL to receive results (required)
 *   - format: PDF format - 'standard', 'print', 'landscape' (optional, default: 'standard')
 *
 * Response (immediate):
 *   - success: true
 *   - job_id: Unique job identifier
 *   - status: 'queued'
 *
 * Webhook callback payload:
 *   - success: true/false
 *   - job_id: Same job identifier
 *   - pdf_base64: Base64 encoded PDF (on success)
 *   - filename: Suggested filename
 *   - summary: Analysis summary
 *   - error: Error message (on failure)
 */
app.post('/api/analyze/report', async (req, res) => {
    try {
        const { url, webhook_url, format } = req.body;

        // Validate required parameters
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        if (!webhook_url) {
            return res.status(400).json({
                success: false,
                error: 'webhook_url is required'
            });
        }

        // Validate webhook URL format
        try {
            new URL(webhook_url);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'Invalid webhook_url format'
            });
        }

        // Generate unique job ID
        const jobId = crypto.randomUUID();

        console.log(`📋 Job ${jobId}: Queuing report generation for ${url}`);
        console.log(`📋 Job ${jobId}: Webhook URL: ${webhook_url}`);

        // Check if QStash is configured
        if (!qstash) {
            console.error('❌ QStash not configured. Set QSTASH_TOKEN environment variable.');
            return res.status(503).json({
                success: false,
                error: 'Async processing not configured. Please set up QStash.',
                setup_url: 'https://upstash.com/docs/qstash'
            });
        }

        // Get the base URL for the processing endpoint
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.APP_URL || `http://localhost:${PORT}`;

        // Queue the job via QStash
        const qstashResponse = await qstash.publishJSON({
            url: `${baseUrl}/api/internal/process-report`,
            body: {
                job_id: jobId,
                url: url,
                webhook_url: webhook_url,
                format: format || 'standard',
                queued_at: new Date().toISOString()
            },
            retries: 2 // Retry up to 2 times on failure
        });

        console.log(`✅ Job ${jobId}: Queued successfully (QStash ID: ${qstashResponse.messageId})`);

        // Return immediately with job ID
        res.json({
            success: true,
            job_id: jobId,
            status: 'queued',
            message: 'Report generation started. Results will be sent to webhook_url when complete.',
            qstash_message_id: qstashResponse.messageId
        });

    } catch (error) {
        console.error('❌ Failed to queue report job:', error.message);
        res.status(500).json({
            success: false,
            error: `Failed to queue job: ${error.message}`
        });
    }
});

/**
 * POST /api/internal/process-report
 *
 * Internal endpoint called by QStash to process report generation.
 * This endpoint does the actual work and calls the webhook when done.
 *
 * IMPORTANT: This endpoint completes ALL work before sending response.
 * QStash will retry if it doesn't get a 2xx response within its timeout.
 *
 * This endpoint should NOT be called directly - it's triggered by QStash.
 */
app.post('/api/internal/process-report', async (req, res) => {
    const startTime = Date.now();
    const { job_id, url, webhook_url, format, queued_at } = req.body;

    console.log(`🔄 Job ${job_id}: Starting processing for ${url}`);
    console.log(`🔄 Job ${job_id}: Queued at ${queued_at}, started at ${new Date().toISOString()}`);

    try {
        // Step 1: Analyze the website
        console.log(`📊 Job ${job_id}: Step 1/3 - Analyzing website...`);
        const analysisStartTime = Date.now();
        const results = await analyzer.analyzeSite(url);
        const analysisTime = Date.now() - analysisStartTime;
        console.log(`✅ Job ${job_id}: Analysis completed in ${(analysisTime / 1000).toFixed(1)}s`);

        // Step 2: Generate PDF
        console.log(`📄 Job ${job_id}: Step 2/3 - Generating PDF...`);
        const pdfStartTime = Date.now();

        let pdfBuffer;
        const pdfOptions = {};

        switch (format) {
            case 'print':
                pdfBuffer = await analyzer.generatePrintOptimizedPdfReport(results, pdfOptions);
                break;
            case 'landscape':
                pdfBuffer = await analyzer.generateLandscapePdfReport(results, pdfOptions);
                break;
            default:
                pdfBuffer = await analyzer.generatePdfReport(results, pdfOptions);
        }

        const pdfTime = Date.now() - pdfStartTime;
        console.log(`✅ Job ${job_id}: PDF generated in ${(pdfTime / 1000).toFixed(1)}s, size: ${pdfBuffer.length} bytes`);

        // Step 3: Send results to webhook
        console.log(`📤 Job ${job_id}: Step 3/3 - Sending results to webhook...`);

        const domain = new URL(url).hostname;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `wordpress-analysis-${domain}-${timestamp}.pdf`;

        const totalTime = Date.now() - startTime;

        // Prepare webhook payload
        const webhookPayload = {
            success: true,
            job_id: job_id,
            data: {
                url: url,
                filename: filename,
                pdf_base64: pdfBuffer.toString('base64'),
                pdf_size: pdfBuffer.length,
                mime_type: 'application/pdf',
                generated_at: new Date().toISOString(),
                processing_time: {
                    analysis_ms: analysisTime,
                    pdf_ms: pdfTime,
                    total_ms: totalTime
                },
                summary: {
                    is_wordpress: results.wordpress?.isWordPress || false,
                    wp_version: results.version?.version || null,
                    theme: results.theme?.displayName || results.theme?.name || null,
                    plugin_count: results.plugins?.length || 0,
                    outdated_plugins: results.plugins?.filter(p => p.isOutdated === true).length || 0,
                    performance_score: {
                        mobile: results.performance?.pagespeed?.mobile?.performance_score || null,
                        desktop: results.performance?.pagespeed?.desktop?.performance_score || null
                    }
                }
            }
        };

        // Send to webhook
        await axios.post(webhook_url, webhookPayload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Job-ID': job_id,
                'X-Source': 'wordpress-analyzer'
            },
            timeout: 30000 // 30 second timeout for webhook
        });

        console.log(`✅ Job ${job_id}: Completed successfully in ${(totalTime / 1000).toFixed(1)}s`);

        // Send success response to QStash AFTER all work is done
        res.json({
            success: true,
            job_id: job_id,
            processing_time_ms: totalTime,
            webhook_delivered: true
        });

    } catch (error) {
        console.error(`❌ Job ${job_id}: Failed - ${error.message}`);

        // Send error to webhook
        try {
            await axios.post(webhook_url, {
                success: false,
                job_id: job_id,
                error: error.message,
                failed_at: new Date().toISOString()
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Job-ID': job_id,
                    'X-Source': 'wordpress-analyzer'
                },
                timeout: 10000
            });
            console.log(`📤 Job ${job_id}: Error notification sent to webhook`);
        } catch (webhookError) {
            console.error(`❌ Job ${job_id}: Failed to send error to webhook: ${webhookError.message}`);
        }

        // Return error to QStash - it may retry based on configuration
        res.status(500).json({
            success: false,
            job_id: job_id,
            error: error.message
        });
    }
});

/**
 * GET /api/report/status/:jobId
 *
 * Check the status of a queued job (optional endpoint for debugging)
 * Note: With webhook pattern, this is not strictly necessary
 */
app.get('/api/report/status/:jobId', (req, res) => {
    // For webhook pattern, job status is communicated via webhook
    // This endpoint is mainly for debugging/monitoring
    res.json({
        message: 'Job status is delivered via webhook callback',
        job_id: req.params.jobId,
        note: 'If you need status polling, consider storing job state in a database'
    });
});

// ============================================================================
// LEGACY EMAIL ENDPOINT (keeping for backwards compatibility)
// ============================================================================

// Email report endpoint
app.post('/api/analyze/email', async (req, res) => {
    try {
        const { url, email, format, options } = req.body;
        
        // Validate required parameters
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                success: false 
            });
        }
        
        if (!email) {
            return res.status(400).json({ 
                error: 'Email address is required',
                success: false 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email address format',
                success: false 
            });
        }

        console.log(`🔍 Starting email analysis for: ${url} → ${email}`);
        
        // Perform analysis
        const results = await analyzer.analyzeSite(url);
        
        console.log(`✅ Analysis completed for: ${url}`);
        console.log('📄 Generating PDF report...');
        
        try {
            // Generate PDF report
            const pdfOptions = options || {};
            let pdfBuffer;
            
            // Generate PDF based on format parameter
            switch (format) {
                case 'print':
                    pdfBuffer = await analyzer.generatePrintOptimizedPdfReport(results, pdfOptions);
                    break;
                case 'landscape':
                    pdfBuffer = await analyzer.generateLandscapePdfReport(results, pdfOptions);
                    break;
                default:
                    pdfBuffer = await analyzer.generatePdfReport(results, pdfOptions);
            }
            
            console.log(`✅ PDF report generated, size: ${pdfBuffer.length} bytes`);
            console.log('📧 Sending email...');
            
            // Send email with PDF attachment
            const emailResult = await emailService.sendAnalysisReport(
                email, 
                url, 
                pdfBuffer, 
                results, 
                { format: format || 'standard' }
            );
            
            console.log(`✅ Email sent successfully to ${email}`);
            
            res.json({
                success: true,
                message: 'Analysis report sent successfully',
                data: {
                    recipient: emailResult.recipient,
                    siteUrl: emailResult.siteUrl,
                    messageId: emailResult.messageId,
                    filename: emailResult.filename,
                    analysisSummary: {
                        isWordPress: results.wordpress?.isWordPress || false,
                        version: results.version?.version || null,
                        theme: results.theme?.displayName || results.theme?.name || null,
                        pluginCount: results.plugins?.length || 0,
                        outdatedPlugins: results.plugins?.filter(p => p.isOutdated === true).length || 0
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ PDF generation or email sending failed:', error.message);
            return res.status(500).json({
                success: false,
                error: `PDF generation or email sending failed: ${error.message}`,
                data: results
            });
        }
        
    } catch (error) {
        console.error('❌ Email analysis failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            data: null
        });
    }
});

// Email test endpoint
app.post('/api/email/test', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                error: 'Email address is required',
                success: false 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email address format',
                success: false 
            });
        }

        console.log(`📧 Sending test email to: ${email}`);
        
        // Send test email
        const result = await emailService.sendTestEmail(email);
        
        console.log(`✅ Test email sent successfully to ${email}`);
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            data: {
                recipient: result.recipient,
                messageId: result.messageId
            }
        });
        
    } catch (error) {
        console.error('❌ Test email failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            data: null
        });
    }
});

// Email configuration test endpoint
app.get('/api/email/config', async (req, res) => {
    try {
        const testResult = await emailService.testConnection();
        
        res.json({
            success: testResult.success,
            message: testResult.success ? 'Email service is properly configured' : 'Email service configuration issue',
            data: testResult
        });
        
    } catch (error) {
        console.error('❌ Email config test failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            data: null
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 WordPress Analyzer Web Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 API endpoint: http://localhost:${PORT}/api/analyze`);
    console.log(`📄 PDF endpoint: http://localhost:${PORT}/api/analyze/pdf`);
    console.log(`📋 Report endpoint (webhook): http://localhost:${PORT}/api/analyze/report`);
    console.log(`📧 Email endpoint: http://localhost:${PORT}/api/analyze/email`);
    console.log(`📧 Email test: http://localhost:${PORT}/api/email/test`);
    console.log(`📧 Email config: http://localhost:${PORT}/api/email/config`);
    console.log(`---`);
    console.log(`🔄 QStash: ${qstash ? '✅ Configured' : '❌ Not configured (set QSTASH_TOKEN)'}`);
});

module.exports = app;
