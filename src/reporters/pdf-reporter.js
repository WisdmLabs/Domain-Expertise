// File: ./src/reporters/pdf-reporter.js

const HtmlReporter = require('./html-reporter');
const fs = require('fs');
const path = require('path');

// Use puppeteer-core + @sparticuz/chromium on Vercel (no bundled Chrome)
// Use regular puppeteer locally (has its own Chrome)
const isVercel = !!process.env.VERCEL;
const puppeteer = isVercel ? require('puppeteer-core') : require('puppeteer');

/**
 * PDF reporter for WordPress analysis results
 * Generates professional PDF reports using Puppeteer
 */
class PdfReporter {
    /**
     * Launch a Puppeteer browser with appropriate settings for the environment
     */
    static async launchBrowser() {
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ];

        const options = { headless: true, args, timeout: 120000 };

        if (isVercel) {
            const chromium = require('@sparticuz/chromium');
            options.args = chromium.args.concat(args);
            options.executablePath = await chromium.executablePath();
            options.headless = chromium.headless;
        }

        return puppeteer.launch(options);
    }

    /**
     * Generate PDF report from analysis results
     * @param {Object} results - Analysis results
     * @param {Object} options - PDF generation options
     * @returns {Buffer} PDF buffer
     */
    static async generate(results, options = {}) {
        const defaultOptions = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            },
            displayHeaderFooter: true,
            headerTemplate: this.getHeaderTemplate(),
            footerTemplate: this.getFooterTemplate(),
            preferCSSPageSize: false,
            ...options
        };

        let browser;
        try {
            // Generate HTML content using existing HtmlReporter
            const html = HtmlReporter.generate(results, options);
            
            // Launch Puppeteer browser
            browser = await this.launchBrowser();

            const page = await browser.newPage();
            
            // Set default timeout for page operations
            page.setDefaultTimeout(120000);
            page.setDefaultNavigationTimeout(120000);
            
            // Set viewport for consistent rendering
            await page.setViewport({
                width: 1200,
                height: 800,
                deviceScaleFactor: 1
            });

            // Set content and wait for all resources to load
            await page.setContent(html, {
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 120000
            });

            // Wait for fonts to load
            await page.evaluateHandle('document.fonts.ready');

            // Generate PDF
            const pdfBuffer = await page.pdf(defaultOptions);
            
            return pdfBuffer;

        } catch (error) {
            console.error('PDF generation failed:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Generate PDF report with custom filename
     * @param {Object} results - Analysis results
     * @param {string} filename - Custom filename
     * @param {Object} options - PDF generation options
     * @returns {Object} Object with PDF buffer and metadata
     */
    static async generateWithFilename(results, filename, options = {}) {
        const pdfBuffer = await this.generate(results, options);
        const reportData = HtmlReporter.processResults(results);
        
        return {
            buffer: pdfBuffer,
            filename: filename || this.generateFilename(reportData),
            contentType: 'application/pdf',
            size: pdfBuffer.length
        };
    }

    /**
     * Generate default filename based on report data
     * @param {Object} reportData - Processed report data
     * @returns {string} Generated filename
     */
    static generateFilename(reportData) {
        const domain = reportData.domain || 'unknown-site';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `wordpress-analysis-${domain}-${timestamp}.pdf`;
    }

    /**
     * Get header template for PDF
     * @returns {string} Header HTML template
     */
    static getHeaderTemplate() {
        return `
            <div style="font-size: 10px; padding: 0 1cm; width: 100%; text-align: center; color: #666;">
                <span class="title"></span>
            </div>
        `;
    }

    /**
     * Get logo data as base64
     * @returns {string} Base64 encoded logo
     */
    static getLogoData() {
        try {
            const logoPath = path.join(__dirname, '..', '..', 'assets', 'wisdmlabs-logo.webp');
            const logoBuffer = fs.readFileSync(logoPath);
            return `data:image/webp;base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.warn('Could not load logo:', error.message);
            return null;
        }
    }

    /**
     * Get footer template for PDF
     * @returns {string} Footer HTML template
     */
    static getFooterTemplate() {
        const logoData = this.getLogoData();
        
        return `
            <div style="width: 100%; margin: 0; padding: 0; box-sizing: border-box;">
                <div style="padding: 8px 0; margin: 10px 0 0 0; width: 100%;">
                    <div style="font-size: 12px; padding: 0 20px; width: 100%; display: flex; justify-content: space-between; align-items: center; color: #666; box-sizing: border-box;">
                        <span style="flex: 1; text-align: left; font-size: 12px; font-weight: 500;">WordPress Site Analyzer v2.0.0</span>
                        <span style="flex: 1; text-align: center; font-size: 12px; font-weight: 500;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                        <div style="flex: 1; display: flex; align-items: center; justify-content: flex-end;">
                            ${logoData ? 
                                `<img src="${logoData}" style="height: 48px; width: auto; opacity: 0.8;" alt="WisdmLabs" />` :
                                `<div style="display: flex; align-items: center; font-size: 18px; font-weight: 700; color: #374151;">
                                    <span style="color: #6366f1;">Wis</span><span style="color: #8b5cf6;">dm</span><span style="color: #374151;">Labs</span>
                                </div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate PDF with custom styling for print
     * @param {Object} results - Analysis results
     * @param {Object} options - PDF generation options
     * @returns {Buffer} PDF buffer
     */
    static async generatePrintOptimized(results, options = {}) {
        const printOptions = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1.5cm',
                right: '1cm',
                bottom: '1.5cm',
                left: '1cm'
            },
            displayHeaderFooter: true,
            headerTemplate: this.getHeaderTemplate(),
            footerTemplate: this.getFooterTemplate(),
            preferCSSPageSize: false,
            ...options
        };

        let browser;
        try {
            // Generate HTML with print-specific modifications
            const html = HtmlReporter.generate(results, {
                ...options,
                printOptimized: true
            });
            
            // Launch Puppeteer browser
            browser = await this.launchBrowser();

            const page = await browser.newPage();
            
            // Set viewport
            await page.setViewport({
                width: 1200,
                height: 800,
                deviceScaleFactor: 1
            });

            // Set content
            await page.setContent(html, {
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 120000
            });

            // Wait for fonts
            await page.evaluateHandle('document.fonts.ready');

            // Add print-specific CSS
            await page.addStyleTag({
                content: this.getPrintCSS()
            });

            // Generate PDF
            const pdfBuffer = await page.pdf(printOptions);
            
            return pdfBuffer;

        } catch (error) {
            console.error('Print-optimized PDF generation failed:', error);
            throw new Error(`Print-optimized PDF generation failed: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Get print-specific CSS for better PDF rendering
     * @returns {string} Print CSS
     */
    static getPrintCSS() {
        return `
            @media print {
                body {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .container {
                    max-width: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                }
                
                .section {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                
                .card, .plugin-item, .issue-card, .fix-card {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                
                .section-title {
                    break-after: avoid;
                    page-break-after: avoid;
                }
                
                .executive-summary {
                    break-after: avoid;
                    page-break-after: avoid;
                }
                
                .header {
                    break-after: avoid;
                    page-break-after: avoid;
                }
                
                /* Ensure colors are preserved */
                .status-success, .status-warning, .status-danger,
                .bg-red-100, .bg-yellow-100, .bg-green-100,
                .text-red-600, .text-yellow-600, .text-green-600 {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                /* Hide interactive elements */
                .material-symbols-outlined {
                    font-family: 'Material Symbols Outlined' !important;
                }
                
                /* Optimize spacing for print */
                .section {
                    margin-bottom: 1rem !important;
                }
                
                .card, .plugin-item {
                    margin-bottom: 0.5rem !important;
                }
            }
        `;
    }

    /**
     * Generate PDF with landscape orientation
     * @param {Object} results - Analysis results
     * @param {Object} options - PDF generation options
     * @returns {Buffer} PDF buffer
     */
    static async generateLandscape(results, options = {}) {
        const landscapeOptions = {
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            },
            displayHeaderFooter: true,
            headerTemplate: this.getHeaderTemplate(),
            footerTemplate: this.getFooterTemplate(),
            preferCSSPageSize: false,
            ...options
        };

        return await this.generate(results, landscapeOptions);
    }

    /**
     * Generate multiple PDF formats
     * @param {Object} results - Analysis results
     * @param {Object} options - PDF generation options
     * @returns {Object} Object with different PDF formats
     */
    static async generateMultipleFormats(results, options = {}) {
        const [standard, printOptimized, landscape] = await Promise.all([
            this.generate(results, options),
            this.generatePrintOptimized(results, options),
            this.generateLandscape(results, options)
        ]);

        return {
            standard,
            printOptimized,
            landscape,
            metadata: {
                standardSize: standard.length,
                printOptimizedSize: printOptimized.length,
                landscapeSize: landscape.length,
                generatedAt: new Date().toISOString()
            }
        };
    }
}

module.exports = PdfReporter;
