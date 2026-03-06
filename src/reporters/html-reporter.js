// File: ./src/reporters/html-reporter.js

/**
 * HTML reporter for WordPress analysis results
 * Generates clean, professional HTML reports with minimal styling
 */
class HtmlReporter {
    /**
     * Generate HTML report
     * @param {Object} results - Analysis results
     * @param {Object} options - Report options
     * @returns {string} Complete HTML document
     */
    static generate(results, options = {}) {
        const reportData = this.processResults(results);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordPress Analysis Report - ${reportData.domain}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
    ${this.generateStyles()}
</head>
<body>
    <div class="container">
        ${this.generateHeader(reportData)}
        ${this.generateExecutiveSummary(reportData)}
        ${this.generateThemeSection(reportData)}
        ${this.generatePluginsSection(reportData)}
        ${this.generatePageSpeedHighlightsSection(reportData)}
        ${this.generatePerformanceSection(reportData)}
        ${this.generateFooter(reportData)}
    </div>
    ${this.generateScripts()}
</body>
</html>`;
    }

    /**
     * Process analysis results for HTML generation
     * @param {Object} results - Raw analysis results
     * @returns {Object} Processed data for HTML generation
     */
    static processResults(results) {
        const url = new URL(results.url);
        
        return {
            domain: url.hostname,
            url: results.url,
            timestamp: new Date(results.timestamp),
            duration: results.duration || 0,
            wordpress: results.wordpress || { isWordPress: false },
            version: results.version || null,
            theme: results.theme || null,
            plugins: results.plugins || [],
            performance: results.performance || null,
            recommendations: results.recommendations || null,
            pluginStats: this.calculatePluginStats(results.plugins || []),
            overallStatus: this.calculateOverallStatus(results)
        };
    }

    /**
     * Calculate plugin statistics
     * @param {Array} plugins - Plugin array
     * @returns {Object} Plugin statistics
     */
    static calculatePluginStats(plugins) {
        return {
            total: plugins.length,
            outdated: plugins.filter(p => p.isOutdated === true).length,
            upToDate: plugins.filter(p => p.isOutdated === false).length,
            unknown: plugins.filter(p => p.isOutdated === null).length
        };
    }

    /**
     * Calculate overall status
     * @param {Object} results - Analysis results
     * @returns {Object} Overall status assessment
     */
    static calculateOverallStatus(results) {
        if (!results.wordpress?.isWordPress) {
            return { status: 'not-wordpress', label: 'Not WordPress', color: '#6b7280' };
        }

        const outdated = (results.plugins || []).filter(p => p.isOutdated === true).length;
        
        if (outdated === 0) {
            return { status: 'good', label: 'Good', color: '#10b981' };
        } else if (outdated <= 2) {
            return { status: 'warning', label: 'Needs Attention', color: '#f59e0b' };
        } else {
            return { status: 'critical', label: 'Critical', color: '#ef4444' };
        }
    }

    /**
     * Generate improved CSS styles
     * @returns {string} CSS styles
     */
    static generateStyles() {
        return `<style>
            :root {
                --primary-color: #2563eb;
                --primary-hover: #1d4ed8;
                --secondary-color: #64748b;
                --success-color: #059669;
                --warning-color: #d97706;
                --error-color: #dc2626;
                --background-color: #f8fafc;
                --surface-color: #ffffff;
                --border-color: #e2e8f0;
                --text-primary: #0f172a;
                --text-secondary: #64748b;
                --text-muted: #94a3b8;
                --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                --radius-sm: 0.375rem;
                --radius-md: 0.5rem;
                --radius-lg: 0.75rem;
                --radius-xl: 1rem;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                line-height: 1.6;
                color: var(--text-primary);
                background-color: var(--background-color);
                font-size: 16px;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            .svg-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                flex-shrink: 0;
            }

            .svg-icon svg {
                width: 100%;
                height: 100%;
                display: block;
            }

            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0;
                background: var(--surface-color);
                min-height: 100vh;
                box-shadow: var(--shadow-lg);
                border-radius: var(--radius-xl);
                overflow: hidden;
            }

            .header {
                background: var(--surface-color);
                color: var(--text-primary);
                padding: 3rem 2rem;
                margin-bottom: 0;
                border-bottom: 2px solid var(--border-color);
            }

            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                max-width: 1200px;
                margin: 0 auto;
            }

            .header-text {
                flex: 1;
                text-align: left;
            }

            .header h1 {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                letter-spacing: -0.025em;
                color: var(--text-primary);
            }

            .header .subtitle {
                font-size: 1.125rem;
                color: var(--text-secondary);
                font-weight: 400;
            }

            .header .domain {
                font-size: 1.25rem;
                font-weight: 600;
                margin-top: 0.5rem;
                color: var(--text-primary);
            }

            .header-logo {
                flex-shrink: 0;
                margin-left: 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .logo-image {
                height: 80px;
                width: auto;
                opacity: 0.9;
                transition: opacity 0.2s ease;
            }

            .logo-image:hover {
                opacity: 1;
            }

            .logo-fallback {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 80px;
                padding: 0 1.5rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 10px;
                box-shadow: 0 3px 12px rgba(99, 102, 241, 0.25);
            }

            .logo-text {
                font-size: 1.75rem;
                font-weight: 700;
                color: white;
                letter-spacing: -0.025em;
            }

            .summary-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1.5rem;
                padding: 2rem;
                background: var(--surface-color);
                border-bottom: 1px solid var(--border-color);
            }

            .card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 0.75rem;
                padding: 1.5rem;
                text-align: center;
                transition: all 0.2s ease;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            }

            .card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-color: #d1d5db;
            }

            .card-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.75rem;
            }

            .card-value {
                font-size: 2.25rem;
                font-weight: 700;
                color: #111827;
                margin-bottom: 0.5rem;
                line-height: 1;
            }

            .card-description {
                font-size: 0.875rem;
                color: #6b7280;
                line-height: 1.5;
            }

            .section {
                margin-bottom: 0;
                border-bottom: 1px solid #e5e7eb;
                background: #ffffff;
            }

            .section:last-child {
                border-bottom: none;
            }

            .section-title {
                font-size: 1.5rem;
                font-weight: 600;
                color: #111827;
                margin-bottom: 1.5rem;
                padding: 2rem 2rem 0 2rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .section-title::before {
                content: '';
                width: 4px;
                height: 1.5rem;
                background: #3b82f6;
                border-radius: 2px;
            }

            .section-content {
                padding: 0 2rem 2rem 2rem;
            }

            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1.5rem;
                margin-bottom: 1.5rem;
            }

            .info-item {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                padding: 1.25rem;
                background: white;
                border-radius: 0.75rem;
                border: 1px solid #e5e7eb;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                transition: all 0.2s ease;
            }

            .info-item:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border-color: #d1d5db;
            }

            .info-label {
                font-size: 0.75rem;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .info-value {
                font-size: 1rem;
                font-weight: 600;
                color: #111827;
            }

            .status-badge {
                display: inline-flex;
                align-items: center;
                padding: 0.375rem 0.75rem;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border: 1px solid transparent;
            }

            .status-badge::before {
                content: '';
                width: 6px;
                height: 6px;
                border-radius: 50%;
                margin-right: 0.5rem;
                background: currentColor;
            }

            .status-success {
                background: #f0f9ff;
                color: #0369a1;
                border-color: #bae6fd;
            }

            .status-warning {
                background: #fffbeb;
                color: #d97706;
                border-color: #fed7aa;
            }

            .status-danger {
                background: #fef2f2;
                color: #dc2626;
                border-color: #fecaca;
            }

            .status-info {
                background: #f8fafc;
                color: #475569;
                border-color: #cbd5e1;
            }

            .status-secondary {
                background: #f9fafb;
                color: #6b7280;
                border-color: #d1d5db;
            }

            .score-badge {
                background: #3b82f6;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }

            .good { color: #10b981; }
            .needs-improvement { color: #f59e0b; }
            .poor { color: #ef4444; }

            /* PSI Section Styles */
            .cwv-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }

            .cwv-card {
                background: var(--surface-color);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 1rem;
                text-align: center;
                transition: all 0.2s ease;
            }

            .cwv-card.good {
                border-color: #10b981;
                background: #f0fdf4;
            }

            .cwv-card.needs-improvement {
                border-color: #f59e0b;
                background: #fffbeb;
            }

            .cwv-card.poor {
                border-color: #ef4444;
                background: #fef2f2;
            }

            .cwv-metric {
                font-weight: 600;
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
            }

            .cwv-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 0.25rem;
            }

            .cwv-score {
                font-size: 0.75rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
            }

            .cwv-description {
                font-size: 0.75rem;
                color: var(--text-tertiary);
            }

            .categories-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }

            .category-card {
                background: var(--surface-color);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 1rem;
            }

            .category-name {
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: var(--text-primary);
            }

            .category-scores {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .score-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .score-item.average {
                border-top: 1px solid var(--border-color);
                padding-top: 0.5rem;
                font-weight: 600;
            }

            .score-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }

            .score-value {
                font-weight: 600;
            }

            .opportunities-list, .diagnostics-list, .accessibility-list, .best-practices-list, .seo-list {
                display: grid;
                gap: 1rem;
                margin: 1rem 0;
            }

            .opportunity-item, .diagnostic-item, .accessibility-item, .best-practice-item,             .seo-item {
                background: var(--surface-color);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 1rem;
                transition: all 0.2s ease;
            }

            /* New table styles for plugin performance report */
            .table-container {
                background: white;
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
            }

            table {
                width: 100%;
                text-align: left;
                border-collapse: separate;
                border-spacing: 0;
            }

            thead {
                background-color: #f9fafb;
            }

            th {
                padding: 0.75rem 1.5rem;
                font-size: 0.75rem;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 1px solid #e5e7eb;
            }

            tbody tr {
                border-bottom: 1px solid #e5e7eb;
            }

            tbody tr:last-child {
                border-bottom: none;
            }

            td {
                padding: 1rem 1.5rem;
                white-space: nowrap;
                vertical-align: top;
            }

            td.bg-gray-50 {
                background-color: #f9fafb;
                white-space: normal;
            }

            .text-sm {
                font-size: 0.875rem;
                line-height: 1.25rem;
            }

            .text-xs {
                font-size: 0.75rem;
                line-height: 1rem;
            }

            .font-semibold {
                font-weight: 600;
            }

            .text-gray-900 {
                color: #111827;
            }

            .text-gray-700 {
                color: #374151;
            }

            .text-gray-500 {
                color: #6b7280;
            }

            .text-gray-800 {
                color: #1f2937;
            }

            .text-red-600 {
                color: #dc2626;
            }

            .text-yellow-600 {
                color: #d97706;
            }

            .text-green-600 {
                color: #059669;
            }

            .bg-red-100 {
                background-color: #fef2f2;
            }

            .bg-yellow-100 {
                background-color: #fffbeb;
            }

            .bg-green-100 {
                background-color: #f0fdf4;
            }

            .text-red-800 {
                color: #991b1b;
            }

            .text-yellow-800 {
                color: #92400e;
            }

            .text-green-800 {
                color: #166534;
            }

            .px-3 {
                padding-left: 0.75rem;
                padding-right: 0.75rem;
            }

            .py-1 {
                padding-top: 0.25rem;
                padding-bottom: 0.25rem;
            }

            .inline-flex {
                display: inline-flex;
            }

            .leading-5 {
                line-height: 1.25rem;
            }

            .rounded-full {
                border-radius: 9999px;
            }

            .mb-2 {
                margin-bottom: 0.5rem;
            }

            .list-disc {
                list-style-type: disc;
            }

            .list-inside {
                list-style-position: inside;
            }

            .space-y-1 > * + * {
                margin-top: 0.25rem;
            }

            .whitespace-nowrap {
                white-space: nowrap;
            }

            .overflow-x-auto {
                overflow-x: auto;
            }

            .px-6 {
                padding-left: 1.5rem;
                padding-right: 1.5rem;
            }

            .py-4 {
                padding-top: 1rem;
                padding-bottom: 1rem;
            }

            .py-3 {
                padding-top: 0.75rem;
                padding-bottom: 0.75rem;
            }

            .tracking-wider {
                letter-spacing: 0.05em;
            }

            .uppercase {
                text-transform: uppercase;
            }

            .divide-y > * + * {
                border-top: 1px solid #e5e7eb;
            }

            .divide-gray-200 > * + * {
                border-color: #e5e7eb;
            }

            /* Modern Site Analysis Styles */
            .site-analysis-container {
                max-width: 90rem;
                margin: 0 auto; 
                background: white;
                border-radius: 1rem;
            }

            .analysis-header {
                margin-bottom: 2.5rem;
            }

            .analysis-title {
                font-size: 2.25rem;
                font-weight: 700;
                color: #111827;
                margin-bottom: 0.5rem;
                line-height: 1.2;
            }

            .analysis-subtitle {
                font-size: 1.125rem;
                color: #6b7280;
                line-height: 1.5;
                margin-bottom: 2.5rem;
                padding: 0 2rem;
            }

            .analysis-main {
                display: flex;
                flex-direction: column;
                gap: 4rem;
            }

            /* Issues and Fixes Sections */
            .detected-issues-section,
            .recommended-fixes-section {
                padding: 0 2rem;
            }

            /* Section Headers */
            .section-header {
                font-size: 1.5rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                line-height: 1.2;
                padding: 0;
            }

            .section-icon {
                font-size: 1.875rem;
                line-height: 1;
                flex-shrink: 0;
            }

            /* Material Symbols styling */
            .material-symbols-outlined {
                font-family: 'Material Symbols Outlined';
                font-weight: normal;
                font-style: normal;
                font-size: 24px;
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                display: inline-block;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                font-variation-settings:
                    'FILL' 0,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 24;
                -webkit-font-smoothing: antialiased;
            }

            .error-icon {
                color: #ef4444;
            }

            .success-icon {
                color: #10b981;
            }

            /* Issues Grid */
            .issues-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 1.5rem;
            }

            /* Issue Cards */
            .issue-card {
                border-radius: 0.75rem;
                padding: 1.5rem;
                transition: all 0.2s ease;
                border: 1px solid transparent;
            }

            .issue-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            }

            .issue-card.red {
                background: #fef2f2;
                border-color: #fecaca;
            }

            .issue-card.yellow {
                background: #fffbeb;
                border-color: #fed7aa;
            }

            .issue-card.orange {
                background: #fff7ed;
                border-color: #fed7aa;
            }

            .issue-card.indigo {
                background: #eef2ff;
                border-color: #c7d2fe;
            }

            .issue-card.green {
                background: #f0fdf4;
                border-color: #bbf7d0;
            }

            .issue-card.blue {
                background: #eff6ff;
                border-color: #bfdbfe;
            }

            .issue-card-content {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
            }

            .issue-icon {
                padding: 0.75rem;
                border-radius: 50%;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .issue-icon.red {
                background: #fecaca;
            }

            .issue-icon.red .material-symbols-outlined {
                color: #dc2626;
            }

            .issue-icon.yellow {
                background: #fde68a;
            }

            .issue-icon.yellow .material-symbols-outlined {
                color: #ca8a04;
            }

            .issue-icon.orange {
                background: #fed7aa;
            }

            .issue-icon.orange .material-symbols-outlined {
                color: #ea580c;
            }

            .issue-icon.indigo {
                background: #c7d2fe;
            }

            .issue-icon.indigo .material-symbols-outlined {
                color: #4f46e5;
            }

            .issue-icon.green {
                background: #bbf7d0;
            }

            .issue-icon.green .material-symbols-outlined {
                color: #16a34a;
            }

            .issue-icon.blue {
                background: #bfdbfe;
            }

            .issue-icon.blue .material-symbols-outlined {
                color: #2563eb;
            }

            .section-icon.svg-icon {
                width: 1.875rem;
                height: 1.875rem;
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .issue-info {
                flex: 1;
                min-width: 0;
            }

            .issue-title {
                font-size: 1.125rem;
                font-weight: 600;
                margin-bottom: 0.25rem;
                line-height: 1.4;
            }

            .issue-title.red {
                color: #991b1b;
            }

            .issue-title.yellow {
                color: #92400e;
            }

            .issue-title.orange {
                color: #c2410c;
            }

            .issue-title.indigo {
                color: #3730a3;
            }

            .issue-title.green {
                color: #166534;
            }

            .issue-title.blue {
                color: #1e40af;
            }

            .issue-description {
                color: #4b5563;
                line-height: 1.5;
                font-size: 0.875rem;
            }

            /* Fixes Section */
            .fixes-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .fix-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 0.75rem;
                padding: 1.5rem;
                transition: all 0.2s ease;
            }

            .fix-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border-color: #d1d5db;
            }

            .fix-card-header {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .fix-info {
                flex: 1;
            }

            .fix-meta {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }

            .priority-badge {
                display: inline-flex;
                align-items: center;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                width: fit-content;
            }

            .priority-badge.red {
                background: #fef2f2;
                color: #991b1b;
            }

            .priority-badge.yellow {
                background: #fffbeb;
                color: #92400e;
            }

            .priority-badge.green {
                background: #f0fdf4;
                color: #166534;
            }

            .fix-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #111827;
                margin: 0;
                line-height: 1.4;
            }

            .fix-description {
                color: #6b7280;
                line-height: 1.5;
                margin: 0;
            }

            .fix-priority {
                display: flex;
                justify-content: flex-end;
                align-items: center;
            }


            .fix-steps {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid #e5e7eb;
            }

            .steps-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: #6b7280;
                margin-bottom: 0.5rem;
            }

            .steps-list {
                list-style: disc;
                list-style-position: inside;
                color: #6b7280;
                font-size: 0.875rem;
                line-height: 1.5;
                margin: 0;
                padding: 0;
            }

            .steps-list li {
                margin-bottom: 0.25rem;
            }

            /* Responsive Design */
            @media (min-width: 640px) {
                .fix-card-header {
                    flex-direction: row;
                    align-items: flex-start;
                }

                .fix-meta {
                    flex-direction: row;
                    align-items: center;
                    gap: 0.75rem;
                }

                .fix-action {
                    margin-top: 0;
                    margin-left: 1.5rem;
                    flex-shrink: 0;
                }
            }

            @media (max-width: 768px) {

                .analysis-title {
                    font-size: 1.875rem;
                }

                .analysis-main {
                    gap: 2rem;
                }

                .issues-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .issue-card {
                    padding: 1rem;
                }

                .fix-card {
                    padding: 1rem;
                }
            }


            .opportunity-item.high, .diagnostic-item.high {
                border-left: 4px solid #ef4444;
            }

            .opportunity-item.medium, .diagnostic-item.medium {
                border-left: 4px solid #f59e0b;
            }

            .opportunity-item.low, .diagnostic-item.low {
                border-left: 4px solid #10b981;
            }

            .opportunity-header, .diagnostic-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 0.5rem;
            }

            .opportunity-title, .diagnostic-title, .accessibility-title, .best-practice-title, .seo-title {
                font-weight: 600;
                color: var(--text-primary);
                flex: 1;
            }

            .opportunity-badges, .diagnostic-badges {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .priority-badge, .impact-badge, .count-badge {
                padding: 0.25rem 0.5rem;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
            }

            .priority-badge.high, .impact-badge.high {
                background: #fef2f2;
                color: #dc2626;
            }

            .priority-badge.medium, .impact-badge.medium {
                background: #fffbeb;
                color: #d97706;
            }

            .priority-badge.low, .impact-badge.low {
                background: #f0fdf4;
                color: #059669;
            }

            .count-badge {
                background: #f3f4f6;
                color: #374151;
            }

            .opportunity-description, .diagnostic-description {
                color: var(--text-secondary);
                margin-bottom: 0.75rem;
                line-height: 1.5;
            }

            .opportunity-savings, .opportunity-plugins, .diagnostic-details, .diagnostic-plugins {
                font-size: 0.875rem;
                color: var(--text-tertiary);
                margin-top: 0.5rem;
            }

            .accessibility-score, .best-practice-score, .seo-score {
                font-weight: 600;
                padding: 0.25rem 0.5rem;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
            }

            .plugin-list {
                display: grid;
                gap: 1.5rem;
            }

            .plugin-item {
                background: var(--surface-color);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                transition: all 0.2s ease;
                box-shadow: var(--shadow-sm);
                position: relative;
            }

            .plugin-item:hover {
                box-shadow: var(--shadow-sm);
            }

            .plugin-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--border-color);
                border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            }

            .plugin-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
            }

            .plugin-main-info {
                flex: 1;
            }

            .plugin-name {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 0.25rem;
            }

            .plugin-meta {
                font-size: 0.875rem;
                color: #6b7280;
                margin-bottom: 0.25rem;
            }

            .plugin-status {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 0.5rem;
            }

            .plugin-details {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
                padding: 1rem;
                background: #f9fafb;
                border-radius: 8px;
            }

            .detail-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .detail-label {
                font-size: 0.75rem;
                font-weight: 500;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .detail-value {
                font-size: 0.875rem;
                font-weight: 500;
                color: #1f2937;
            }

            .recommendations {
                margin-top: 1rem;
                padding: 1rem;
                background: #f8f9fa;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }

            .recommendations h4 {
                margin: 0 0 0.75rem 0;
                font-size: 0.875rem;
                font-weight: 600;
                color: #1f2937;
            }

            .recommendations ul {
                margin: 0;
                padding-left: 1.25rem;
            }

            .recommendation-item {
                margin-bottom: 0.5rem;
                font-size: 0.875rem;
                line-height: 1.5;
                padding: 0.75rem;
                background: #ffffff;
                border-radius: 6px;
                border-left: 4px solid;
            }

            .recommendation-item.high {
                border-left-color: #dc2626;
                background: #fef2f2;
            }

            .recommendation-item.medium {
                border-left-color: #ea580c;
                background: #fffbeb;
            }

            .recommendation-item.low {
                border-left-color: #059669;
                background: #ecfdf5;
            }

            .plugin-description {
                margin-top: 1rem;
                padding: 1rem;
                background: #f8f9fa;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                font-size: 0.875rem;
                line-height: 1.6;
                color: #6b7280;
            }

            .empty-state {
                text-align: center;
                padding: 3rem 2rem;
                color: #6b7280;
            }

            .empty-state h3 {
                font-size: 1.25rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 0.5rem;
            }

            .empty-state p {
                font-size: 0.875rem;
                max-width: 400px;
                margin: 0 auto;
            }

            .footer {
                background: var(--background-color);
                border-top: 1px solid var(--border-color);
                padding: 2rem;
                text-align: center;
                color: var(--text-secondary);
                font-size: 0.875rem;
                position: relative;
            }

            .footer::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 2px;
                background: var(--border-color);
                border-radius: 2px;
            }

            .footer p {
                margin-bottom: 0.5rem;
            }

            .footer p:last-child {
                margin-bottom: 0;
                font-size: 0.75rem;
                opacity: 0.7;
            }

            .subsection-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 1rem;
                margin-top: 2rem;
            }

            /* Tablet responsive styles for Plugin Performance Report table */
            @media (max-width: 1024px) and (min-width: 700px) {
                /* Plugin Performance Report table tablet optimization */
                .plugin-performance-table {
                    table-layout: fixed;
                    width: 100%;
                }

                .plugin-performance-table th,
                .plugin-performance-table td {
                    padding: 0.75rem 0.5rem;
                }

                .plugin-performance-table th:first-child,
                .plugin-performance-table td:first-child {
                    width: 35%; /* Plugin name column - reduced space allocation */
                }

                .plugin-performance-table th:nth-child(2),
                .plugin-performance-table td:nth-child(2) {
                    width: 20%; /* Version column */
                }

                .plugin-performance-table th:nth-child(3),
                .plugin-performance-table td:nth-child(3) {
                    width: 20%; /* Total Size column */
                }

                .plugin-performance-table th:nth-child(4),
                .plugin-performance-table td:nth-child(4) {
                    width: 15%; /* Impact column */
                }

                /* Plugin name cell styling - enable text wrapping */
                .plugin-performance-table .plugin-name-cell {
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    hyphens: auto;
                    white-space: normal;
                    line-height: 1.4;
                }

                /* Version cell styling - center align for better space usage */
                .plugin-performance-table .version-cell {
                    text-align: center;
                }

                /* Size cell styling - center align */
                .plugin-performance-table .size-cell {
                    text-align: center;
                }

                /* Impact cell styling - center align */
                .plugin-performance-table .impact-cell {
                    text-align: center;
                }

                /* Header alignment - center align Version, Total Size, and Impact headers */
                .plugin-performance-table th:nth-child(2),
                .plugin-performance-table th:nth-child(3),
                .plugin-performance-table th:nth-child(4) {
                    text-align: center;
                }
            }

            @media (max-width: 768px) {
                .header {
                    padding: 2rem 1rem;
                }

                .header-content {
                    flex-direction: row;
                    align-items: center;
                    gap: 1rem;
                }

                .header-text {
                    flex: 1;
                    text-align: left;
                }

                .header h1 {
                    font-size: 2rem;
                }

                .header-logo {
                    margin-left: 1rem;
                    flex-shrink: 0;
                }

                .logo-image {
                    height: 70px;
                }

                .logo-fallback {
                    height: 70px;
                    padding: 0 1.25rem;
                }

                .logo-text {
                    font-size: 1.5rem;
                }
            }

            @media (max-width: 480px) {
                .header {
                    padding: 1.5rem 1rem;
                }

                .header-content {
                    flex-direction: row;
                    align-items: center;
                    gap: 0.75rem;
                }

                .header-text {
                    flex: 1;
                    text-align: left;
                }

                .header h1 {
                    font-size: 1.75rem;
                }

                .header .subtitle {
                    font-size: 1rem;
                }

                .header .domain {
                    font-size: 1.125rem;
                }

                .header-logo {
                    margin-left: 0.75rem;
                    flex-shrink: 0;
                }

                .logo-image {
                    height: 60px;
                }

                .logo-fallback {
                    height: 60px;
                    padding: 0 1rem;
                }

                .logo-text {
                    font-size: 1.25rem;
                }
            }

                .summary-cards {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                    padding: 1.5rem;
                }

                .section-title {
                    padding: 1.5rem 1.5rem 0 1.5rem;
                }

                .section-content {
                    padding: 0 1.5rem 1.5rem 1.5rem;
                }

                .info-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                .plugin-header {
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .plugin-details {
                    grid-template-columns: 1fr;
                }

                .plugin-item {
                    padding: 1rem;
                }
            }

            @media print {
                body {
                    background: white;
                }
                
                .container {
                    max-width: none;
                    box-shadow: none;
                }
                
                .card,
                .plugin-item {
                    break-inside: avoid;
                }

                .header {
                    background: white !important;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
            }

            /* PageSpeed Highlights Section */
            .performance-scores-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .score-card {
                background: white;
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid #e5e7eb;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .score-card-header {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .score-icon {
                width: 3rem;
                height: 3rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .score-icon.green {
                background: #bbf7d0;
            }

            .score-icon.green .material-symbols-outlined {
                color: #16a34a;
            }

            .score-icon.yellow {
                background: #fde68a;
            }

            .score-icon.yellow .material-symbols-outlined {
                color: #ca8a04;
            }

            .score-icon.red {
                background: #fecaca;
            }

            .score-icon.red .material-symbols-outlined {
                color: #dc2626;
            }

            .score-icon.gray {
                background: #f3f4f6;
            }

            .score-icon.gray .material-symbols-outlined {
                color: #6b7280;
            }

            .score-info {
                flex: 1;
            }

            .score-title {
                font-size: 1rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 0.5rem;
            }

            .score-value {
                font-size: 2rem;
                font-weight: 700;
                line-height: 1;
            }

            .score-value.green {
                color: #16a34a;
            }

            .score-value.yellow {
                color: #ca8a04;
            }

            .score-value.red {
                color: #dc2626;
            }

            .score-value.gray {
                color: #6b7280;
            }

            /* Core Web Vitals */
            .cwv-section {
                margin-bottom: 2rem;
            }

            .cwv-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .cwv-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }

            .cwv-card {
                background: white;
                border-radius: 0.5rem;
                padding: 1.25rem;
                text-align: center;
                border: 1px solid #e5e7eb;
            }

            .cwv-metric-name {
                font-size: 0.875rem;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.5rem;
            }

            .cwv-metric-value {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
            }

            .cwv-metric-value.green {
                color: #16a34a;
            }

            .cwv-metric-value.yellow {
                color: #ca8a04;
            }

            .cwv-metric-value.red {
                color: #dc2626;
            }

            .cwv-metric-value.gray {
                color: #6b7280;
            }

            .cwv-metric-label {
                font-size: 0.75rem;
                color: #6b7280;
                line-height: 1.2;
            }

            /* Additional Metrics */
            .additional-metrics {
                margin-top: 2rem;
            }

            .metrics-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
            }

            .metric-item {
                background: white;
                border-radius: 0.5rem;
                padding: 1.25rem;
                border: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .metric-icon {
                width: 2.5rem;
                height: 2.5rem;
                background: #f3f4f6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .metric-icon .material-symbols-outlined {
                color: #6b7280;
            }

            .metric-content {
                flex: 1;
            }

            .metric-label {
                font-size: 0.875rem;
                color: #6b7280;
                margin-bottom: 0.25rem;
            }

            .metric-value {
                font-size: 1.125rem;
                font-weight: 600;
                color: #374151;
            }

            /* Executive Summary Styles */
            .executive-summary {
                background: white;
                padding: 1.5rem;
                border-radius: 1rem;
                box-shadow: var(--shadow-sm);
                margin-bottom: 2.5rem;
            }

            .executive-summary h2 {
                font-size: 1.25rem;
                font-weight: 600;
                color: #0f172a;
                margin-bottom: 1.5rem;
                display: flex;
                align-items: center;
            }

            .executive-summary h2 .material-symbols-outlined {
                color: #3b82f6;
                margin-right: 0.5rem;
            }

            .executive-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1.5rem;
            }

            @media (min-width: 640px) {
                .executive-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (min-width: 1024px) {
                .executive-grid {
                    grid-template-columns: repeat(4, 1fr);
                }
            }

            .executive-card {
                display: flex;
                align-items: flex-start;
                padding: 1.25rem;
                background: #f8fafc;
                border-radius: 0.75rem;
                border: 1px solid #e2e8f0;
                min-height: 100px;
            }

            .executive-card.yellow {
                background: #fefce8;
                border-color: #fde047;
            }

            .executive-icon {
                padding: 0.75rem;
                border-radius: 50%;
                margin-right: 1rem;
                flex-shrink: 0;
            }

            .executive-icon.blue {
                background: #dbeafe;
            }

            .executive-icon.green {
                background: #dcfce7;
            }

            .executive-icon.yellow {
                background: #fef3c7;
            }

            .executive-icon .material-symbols-outlined {
                font-size: 1.5rem;
            }

            .executive-icon.blue .material-symbols-outlined {
                color: #2563eb;
            }

            .executive-icon.green .material-symbols-outlined {
                color: #16a34a;
            }

            .executive-icon.yellow .material-symbols-outlined {
                color: #ca8a04;
            }

            .executive-icon.red .material-symbols-outlined {
                color: #dc2626;
            }

            /* Performance card color variants */
            .executive-card.performance-good {
                background: #f0fdf4;
                border-color: #bbf7d0;
            }

            .executive-card.performance-warning {
                background: #fffbeb;
                border-color: #fed7aa;
            }

            .executive-card.performance-bad {
                background: #fef2f2;
                border-color: #fecaca;
            }

            /* Status card color variants */
            .executive-card.status-good {
                background: #f0fdf4;
                border-color: #bbf7d0;
            }

            .executive-card.status-warning {
                background: #fffbeb;
                border-color: #fed7aa;
            }

            .executive-card.status-critical {
                background: #fef2f2;
                border-color: #fecaca;
            }

            .executive-content {
                flex: 1;
            }

            .executive-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 0.25rem;
            }

            .executive-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: #0f172a;
                line-height: 1;
            }

            .executive-value.green {
                color: #16a34a;
            }

            .executive-value.red {
                color: #dc2626;
            }

            .executive-value.yellow {
                color: #ca8a04;
                font-size: 1.125rem;
                font-weight: 600;
            }
        </style>`;
    }

    /**
     * Load WisdmLabs logo data
     * @returns {string|null} Base64 encoded logo data or null if not found
     */
    static getLogoData() {
        try {
            const fs = require('fs');
            const path = require('path');
            const logoPath = path.join(__dirname, '..', '..', 'assets', 'wisdmlabs-logo.webp');
            const logoBuffer = fs.readFileSync(logoPath);
            return `data:image/webp;base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.warn('Could not load logo:', error.message);
            return null;
        }
    }

    /**
     * Generate header section
     * @param {Object} data - Processed report data
     * @returns {string} Header HTML
     */
    static generateHeader(data) {
        const analysisDate = data.timestamp.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const logoData = this.getLogoData();

        return `
        <header class="header">
            <div class="header-content">
                <div class="header-text">
                    <h1>WordPress Analysis Report</h1>
                    <div class="subtitle">Comprehensive site analysis and recommendations</div>
                    <div class="domain">${data.domain}</div>
                </div>
                <div class="header-logo">
                    ${logoData ? 
                        `<img src="${logoData}" alt="WisdmLabs" class="logo-image" />` :
                        `<div class="logo-fallback">
                            <span class="logo-text">WisdmLabs</span>
                        </div>`
                    }
                </div>
            </div>
        </header>`;
    }

    /**
     * Calculate comprehensive website score based on all analysis data
     * @param {Object} data - Processed report data
     * @returns {number} Overall website score (0-100)
     */
    static calculateOverallWebsiteScore(data) {
        const performance = data.performance || {};
        const plugins = data.plugins || [];
        const version = data.version || {};
        
        // 1. Performance Score (40% weight)
        const performanceScore = this.calculatePerformanceScore(performance);
        
        // 2. Plugin Health Score (25% weight)
        const pluginHealthScore = this.calculatePluginHealthScore(plugins, performance);
        
        // 3. Security Score (20% weight)
        const securityScore = this.calculateSecurityScore(version, plugins);
        
        // 4. Technical Score (15% weight)
        const technicalScore = this.calculateTechnicalScore(performance);
        
        // Calculate weighted overall score
        const overallScore = Math.round(
            (performanceScore * 0.40) +
            (pluginHealthScore * 0.25) +
            (securityScore * 0.20) +
            (technicalScore * 0.15)
        );
        
        return Math.max(0, Math.min(100, overallScore));
    }

    /**
     * Calculate performance score based on PageSpeed and Core Web Vitals
     * @param {Object} performance - Performance data
     * @returns {number} Performance score (0-100)
     */
    static calculatePerformanceScore(performance) {
        if (!performance.pagespeed) return 0;
        
        const mobile = performance.pagespeed.mobile || {};
        const desktop = performance.pagespeed.desktop || {};
        const mobileMetrics = mobile.core_web_vitals || {};
        const desktopMetrics = desktop.core_web_vitals || {};
        
        // PageSpeed scores (average of mobile and desktop)
        const mobileScore = mobile.performance_score ? mobile.performance_score * 100 : 0;
        const desktopScore = desktop.performance_score ? desktop.performance_score * 100 : 0;
        const avgPageSpeed = (mobileScore + desktopScore) / 2;
        
        // Core Web Vitals scoring
        const lcp = Math.min(
            mobileMetrics.lcp?.value || Infinity,
            desktopMetrics.lcp?.value || Infinity
        );
        const cls = Math.max(
            mobileMetrics.cls?.value || 0,
            desktopMetrics.cls?.value || 0
        );
        const fcp = Math.min(
            mobileMetrics.fcp?.value || Infinity,
            desktopMetrics.fcp?.value || Infinity
        );
        
        let cwvScore = 0;
        let cwvCount = 0;
        
        // LCP scoring (≤2.5s good, ≤4.0s needs improvement, >4.0s poor)
        if (lcp !== Infinity) {
            if (lcp <= 2500) cwvScore += 100;
            else if (lcp <= 4000) cwvScore += 60;
            else cwvScore += 20;
            cwvCount++;
        }
        
        // CLS scoring (≤0.1 good, ≤0.25 needs improvement, >0.25 poor)
        if (cls !== 0) {
            if (cls <= 0.1) cwvScore += 100;
            else if (cls <= 0.25) cwvScore += 60;
            else cwvScore += 20;
            cwvCount++;
        }
        
        // FCP scoring (≤1.8s good, ≤3.0s needs improvement, >3.0s poor)
        if (fcp !== Infinity) {
            if (fcp <= 1800) cwvScore += 100;
            else if (fcp <= 3000) cwvScore += 60;
            else cwvScore += 20;
            cwvCount++;
        }
        
        const avgCwvScore = cwvCount > 0 ? cwvScore / cwvCount : 0;
        
        // Combine PageSpeed and Core Web Vitals (70% PageSpeed, 30% CWV)
        return Math.round((avgPageSpeed * 0.7) + (avgCwvScore * 0.3));
    }

    /**
     * Calculate plugin health score
     * @param {Array} plugins - Plugin array
     * @param {Object} performance - Performance data
     * @returns {number} Plugin health score (0-100)
     */
    static calculatePluginHealthScore(plugins, performance) {
        if (plugins.length === 0) return 100;
        
        const pluginPerformance = performance.plugin_performance || {};
        let score = 100;
        
        // Deduct points for outdated plugins (5 points each)
        const outdatedPlugins = plugins.filter(p => p.isOutdated === true).length;
        score -= Math.min(outdatedPlugins * 5, 30);
        
        // Deduct points for heavy plugins (>200KB)
        let heavyPluginCount = 0;
        plugins.forEach(plugin => {
            const perfData = pluginPerformance[plugin.name] || pluginPerformance[plugin.displayName] || {};
            if (perfData.total_size && perfData.total_size > 200000) {
                heavyPluginCount++;
            }
        });
        score -= Math.min(heavyPluginCount * 8, 40);
        
        // Deduct points for too many plugins (>20 plugins)
        if (plugins.length > 20) {
            score -= Math.min((plugins.length - 20) * 2, 20);
        }
        
        return Math.max(0, score);
    }

    /**
     * Calculate security score based on WordPress version and plugin security
     * @param {Object} version - Version data
     * @param {Array} plugins - Plugin array
     * @returns {number} Security score (0-100)
     */
    static calculateSecurityScore(version, plugins) {
        let score = 100;
        
        // WordPress version security
        if (!version.version) {
            score -= 30; // Unknown version is risky
        } else {
            // Check if WordPress version is outdated (simplified check)
            const wpVersion = version.version;
            const versionParts = wpVersion.split('.').map(Number);
            const majorVersion = versionParts[0] || 0;
            const minorVersion = versionParts[1] || 0;
            
            // WordPress 6.x is current, 5.x is outdated
            if (majorVersion < 6) {
                score -= 25; // Outdated major version
            } else if (majorVersion === 6 && minorVersion < 2) {
                score -= 10; // Slightly outdated minor version
            }
        }
        
        // Plugin security (outdated plugins are security risks)
        const outdatedPlugins = plugins.filter(p => p.isOutdated === true).length;
        score -= Math.min(outdatedPlugins * 3, 25);
        
        return Math.max(0, score);
    }

    /**
     * Calculate technical score based on load time and page size
     * @param {Object} performance - Performance data
     * @returns {number} Technical score (0-100)
     */
    static calculateTechnicalScore(performance) {
        let score = 100;
        
        // Page load time scoring
        const loadTime = performance.main_page_timing?.total_time;
        if (loadTime) {
            if (loadTime <= 2.0) score -= 0; // Excellent
            else if (loadTime <= 4.0) score -= 15; // Good
            else if (loadTime <= 6.0) score -= 30; // Needs improvement
            else score -= 50; // Poor
        }
        
        // Page size scoring
        const pageSize = performance.main_page_timing?.content_length;
        if (pageSize) {
            const sizeKB = pageSize / 1024;
            if (sizeKB <= 500) score -= 0; // Excellent
            else if (sizeKB <= 1000) score -= 10; // Good
            else if (sizeKB <= 2000) score -= 20; // Needs improvement
            else score -= 30; // Poor
        }
        
        return Math.max(0, score);
    }

    /**
     * Generate executive summary section (merged summary cards, WordPress detection, and version)
     * @param {Object} data - Processed report data
     * @returns {string} Executive summary HTML
     */
    static generateExecutiveSummary(data) {
        if (!data.wordpress.isWordPress) {
            return `
            <section class="executive-summary">
                <h2>
                    <span class="material-symbols-outlined">summarize</span>
                    Executive Summary
                </h2>
                <div class="executive-grid">
                    <div class="executive-card" style="background: #fef2f2; border-color: #fecaca;">
                        <div class="executive-icon" style="background: #fee2e2;">
                            <span class="material-symbols-outlined" style="color: #dc2626;">error</span>
                        </div>
                        <div class="executive-content">
                            <p class="executive-label">Site Status</p>
                            <p class="executive-value" style="color: #dc2626; font-size: 1.25rem; font-weight: 600;">Not WordPress</p>
                        </div>
                    </div>
                </div>
            </section>`;
        }


        // Calculate comprehensive website score
        const overallScore = this.calculateOverallWebsiteScore(data);
        
        const getPerformanceConfig = (score) => {
            if (!score || score === 0) {
                return { cardClass: '', iconClass: 'blue', icon: 'speed', valueClass: '', value: 'N/A' };
            }
            if (score >= 80) {
                return { cardClass: 'performance-good', iconClass: 'green', icon: 'speed', valueClass: 'green', value: `${score}/100` };
            } else if (score >= 60) {
                return { cardClass: 'performance-warning', iconClass: 'yellow', icon: 'warning', valueClass: 'yellow', value: `${score}/100` };
            } else {
                return { cardClass: 'performance-bad', iconClass: 'red', icon: 'error', valueClass: 'red', value: `${score}/100` };
            }
        };

        // Determine status card styling based on overall status
        const getStatusConfig = (status) => {
            switch (status) {
                case 'good':
                    return { cardClass: 'status-good', iconClass: 'green', icon: 'check_circle', valueClass: 'green' };
                case 'warning':
                    return { cardClass: 'status-warning', iconClass: 'yellow', icon: 'warning', valueClass: 'yellow' };
                case 'critical':
                    return { cardClass: 'status-critical', iconClass: 'red', icon: 'error', valueClass: 'red' };
                default:
                    return { cardClass: 'status-warning', iconClass: 'yellow', icon: 'warning', valueClass: 'yellow' };
            }
        };

        const performanceConfig = getPerformanceConfig(overallScore);
        const statusConfig = getStatusConfig(data.overallStatus.status);

        return `
        <section class="executive-summary">
            <h2>
                <span class="material-symbols-outlined">summarize</span>
                Executive Summary
            </h2>
            <div class="executive-grid">
                <div class="executive-card">
                    <div class="executive-icon blue">
                        <span class="material-symbols-outlined">extension</span>
                    </div>
                    <div class="executive-content">
                        <p class="executive-label">Total Plugins</p>
                        <p class="executive-value">${data.pluginStats.total}</p>
                        </div>
                    </div>
                
                <div class="executive-card ${performanceConfig.cardClass}">
                    <div class="executive-icon ${performanceConfig.iconClass}">
                        <span class="material-symbols-outlined">${performanceConfig.icon}</span>
                    </div>
                    <div class="executive-content">
                        <p class="executive-label">Performance</p>
                        <p class="executive-value ${performanceConfig.valueClass}">${performanceConfig.value}</p>
                    </div>
                </div>
                
                <div class="executive-card">
                    <div class="executive-icon blue">
                        <span class="material-symbols-outlined">verified</span>
                    </div>
                    <div class="executive-content">
                        <p class="executive-label">WordPress Version</p>
                        <p class="executive-value">${data.version?.version || 'Unknown'}</p>
                </div>
                </div>
                
                <div class="executive-card ${statusConfig.cardClass}">
                    <div class="executive-icon ${statusConfig.iconClass}">
                        <span class="material-symbols-outlined">${statusConfig.icon}</span>
                    </div>
                    <div class="executive-content">
                        <p class="executive-label">Overall Status</p>
                        <p class="executive-value ${statusConfig.valueClass}">${data.overallStatus.label}</p>
                    </div>
                </div>
            </div>
        </section>`;
    }


    /**
     * Generate theme section
     * @param {Object} data - Processed report data
     * @returns {string} Theme section HTML
     */
    static generateThemeSection(data) {
        if (!data.wordpress.isWordPress) return '';

        if (!data.theme || !data.theme.name) {
            return `
            <section class="section">
                <h2 class="section-title">Active Theme</h2>
                <div class="section-content">
                    <div class="empty-state">
                        <h3>Theme Not Detected</h3>
                        <p>Could not identify the active theme for this site.</p>
                    </div>
                </div>
            </section>`;
        }

        return `
        <section class="section">
            <h2 class="section-title">Active Theme</h2>
            <div class="section-content">
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Theme Name</div>
                        <div class="info-value">${data.theme.displayName || data.theme.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Directory</div>
                        <div class="info-value">${data.theme.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Version</div>
                        <div class="info-value">${data.theme.version || 'Unknown'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Author</div>
                        <div class="info-value">${data.theme.author || 'Unknown'}</div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate plugins section with integrated performance data
     * @param {Object} data - Processed report data
     * @returns {string} Plugins section HTML
     */
    static generatePluginsSection(data) {
        if (!data.wordpress.isWordPress) return '';

        if (data.plugins.length === 0) {
            return `
            <section class="section">
                <h2 class="section-title">Plugin Performance Report</h2>
                <div class="section-content">
                    <div class="empty-state">
                        <h3>No Plugins Detected</h3>
                        <p>No plugins were detected or they are not publicly detectable.</p>
                    </div>
                </div>
            </section>`;
        }

        // Merge plugin data with performance data
        const pluginPerformance = data.performance?.plugin_performance || {};
        const mergedPlugins = data.plugins.map(plugin => {
            const perfData = pluginPerformance[plugin.name] || pluginPerformance[plugin.displayName] || {};
            return {
                ...plugin,
                performanceData: perfData,
                totalSize: perfData.total_size || 0,
                cssSize: perfData.css_size || 0,
                jsSize: perfData.js_size || 0,
                performanceScore: perfData.performance_score || 0
            };
        });

        // Check if any plugin has size data (non-zero totalSize)
        const hasSizeData = mergedPlugins.some(p => p.totalSize > 0);

        // Sort plugins by performance impact (worst first), then by name
        const sortedPlugins = mergedPlugins.sort((a, b) => {
            if (hasSizeData) {
                // First priority: plugins with high performance impact
                const aImpact = this.getPerformanceImpact(a.totalSize);
                const bImpact = this.getPerformanceImpact(b.totalSize);
                if (aImpact !== bImpact) {
                    const impactOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
                    return impactOrder[bImpact] - impactOrder[aImpact];
                }
                // Second priority: total size
                if (a.totalSize !== b.totalSize) return b.totalSize - a.totalSize;
            }
            // Fall back to name
            return (a.displayName || a.name).localeCompare(b.displayName || b.name);
        });

        const pluginsTableRows = sortedPlugins.map((plugin, index) => {
            const impactLevel = this.getPerformanceImpact(plugin.totalSize);
            const impactClass = impactLevel === 'HIGH' ? 'red' :
                               impactLevel === 'MEDIUM' ? 'yellow' : 'green';

            const totalSizeKB = Math.round(plugin.totalSize / 1024);
            const cssKB = Math.round(plugin.cssSize / 1024);
            const jsKB = Math.round(plugin.jsSize / 1024);

            // Generate recommendations based on plugin data and performance
            const recommendations = this.generatePluginRecommendations(plugin);

            // Validate and format version
            const displayVersion = plugin.version && this.isValidVersion(plugin.version)
                ? plugin.version
                : 'Unknown';

            const colSpan = hasSizeData ? 4 : 2;

            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap plugin-name-cell">
                        <div class="text-sm font-semibold text-gray-900">${plugin.displayName || plugin.name}</div>
                        ${plugin.displayName && plugin.displayName !== plugin.name ? `<div class="text-sm text-gray-500">${plugin.name}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap version-cell">
                        <div class="text-sm text-gray-700 font-semibold">${displayVersion}</div>
                    </td>
                    ${hasSizeData ? `
                    <td class="px-6 py-4 whitespace-nowrap size-cell">
                        <div class="text-sm font-semibold text-${impactClass}-600">${totalSizeKB}KB</div>
                        <div class="text-xs text-gray-500">CSS: ${cssKB}KB | JS: ${jsKB}KB</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap impact-cell">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-${impactClass}-100 text-${impactClass}-800">${impactLevel}</span>
                    </td>` : ''}
                </tr>
                ${recommendations.length > 0 ? `
                <tr>
                    <td class="px-6 py-4 bg-gray-50" colspan="${colSpan}">
                        <div class="text-sm font-semibold text-gray-800 mb-2">Recommendations</div>
                        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
                            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </td>
                </tr>` : ''}`;
        }).join('');

        return `
        <section class="section">
            <h2 class="section-title">Plugin Performance Report</h2>
            <div class="section-content">
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left plugin-performance-table">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Plugin</th>
                                    <th class="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Version</th>
                                    ${hasSizeData ? `
                                    <th class="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Size</th>
                                    <th class="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Impact</th>` : ''}
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${pluginsTableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>`;
    }

    /**
     * Validate if a version string looks like a valid plugin version
     * @param {string} version - Version string to validate
     * @returns {boolean} True if version looks valid, false otherwise
     */
    static isValidVersion(version) {
        if (!version || typeof version !== 'string') return false;
        
        const versionStr = version.trim();
        
        // Check if version is too long (likely a hash or timestamp)
        if (versionStr.length > 20) return false;
        
        // Check for common invalid patterns
        const invalidPatterns = [
            /^\d{10,}$/,           // Pure timestamps like 1678293949
            /^\d{8}$/,             // Date formats like 20250329
            /^\d{8}-\d{5}$/,       // Date-time formats like 20250904-85040
            /^[a-f0-9]{20,}$/i,    // Long hex strings like dbea705cfafe089d65f1
            /^[a-f0-9]{32,}$/i,    // MD5-like hashes like 37f68a8beb4edffe75197731eda158fd
            /^[a-f0-9]{40,}$/i,    // SHA1-like hashes
            /^\d+$/,               // Pure numbers (unless they're short and look like versions)
        ];
        
        // Check against invalid patterns
        for (const pattern of invalidPatterns) {
            if (pattern.test(versionStr)) {
                // Exception: allow short numbers that look like version numbers (e.g., "1", "2", "3")
                if (/^\d+$/.test(versionStr) && versionStr.length <= 2) {
                    continue;
                }
                return false;
            }
        }
        
        // Check for valid version patterns
        const validPatterns = [
            /^\d+\.\d+$/,                    // 1.0, 2.5, etc.
            /^\d+\.\d+\.\d+$/,              // 1.0.0, 2.5.3, etc.
            /^\d+\.\d+\.\d+\.\d+$/,         // 1.0.0.1, etc.
            /^\d+\.\d+\.\d+[a-zA-Z]?$/,     // 1.0.0a, 2.5.3b, etc.
            /^\d+\.\d+[a-zA-Z]?$/,          // 1.0a, 2.5b, etc.
            /^\d+$/,                        // Single digit versions (1, 2, 3)
            /^v\d+\.\d+/,                   // v1.0, v2.5, etc.
            /^[a-zA-Z]+\d+\.\d+/,           // beta1.0, alpha2.5, etc.
        ];
        
        // Check if version matches any valid pattern
        return validPatterns.some(pattern => pattern.test(versionStr));
    }

    /**
     * Get performance impact level based on size
     * @param {number} sizeBytes - Size in bytes
     * @returns {string} Impact level (HIGH, MEDIUM, LOW)
     */
    static getPerformanceImpact(sizeBytes) {
        const sizeKB = sizeBytes / 1024;
        if (sizeKB > 200) return 'HIGH';
        if (sizeKB > 50) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Generate plugin recommendations based on plugin data
     * @param {Object} plugin - Plugin data
     * @returns {Array} Array of recommendation strings
     */
    static generatePluginRecommendations(plugin) {
        const recommendations = [];
        
        // Performance-based recommendations
        if (plugin.totalSize > 200000) { // > 200KB
            if (plugin.name.includes('woocommerce') || plugin.displayName?.toLowerCase().includes('woocommerce')) {
                recommendations.push('Consider disabling WooCommerce Blocks for classic themes if not using the block editor for products.');
                recommendations.push('Use a caching plugin to optimize dynamic content and reduce server load.');
            } else if (plugin.name.includes('filter') || plugin.displayName?.toLowerCase().includes('filter')) {
                recommendations.push("Consider replacing this plugin with a more lightweight alternative like 'Search & Filter' to reduce resource load.");
                recommendations.push('Enable selective asset loading to prevent unnecessary CSS and JS files from loading on all pages.');
            } else {
                recommendations.push('Consider optimizing or replacing this plugin due to its large size impact.');
                recommendations.push('Enable conditional loading to prevent assets from loading on pages where not needed.');
            }
        } else if (plugin.totalSize > 50000) { // > 50KB
            recommendations.push('Monitor this plugin\'s performance impact and consider optimization if site speed is affected.');
        }

        // Version-based recommendations
        if (plugin.isOutdated === true) {
            recommendations.push('Update to the latest version of the plugin to benefit from recent performance improvements and security fixes.');
        }

        // Size-specific recommendations
        if (plugin.cssSize > 100000) { // > 100KB CSS
            recommendations.push('Consider minifying CSS files and removing unused styles.');
        }
        if (plugin.jsSize > 150000) { // > 150KB JS
            recommendations.push('Consider code splitting and lazy loading for JavaScript files.');
        }

        // Plugin-specific recommendations
        if (plugin.name.includes('user-submitted-posts') || plugin.displayName?.toLowerCase().includes('user submit')) {
            recommendations.push('Optimize image uploads by compressing them before they are submitted.');
        }

        return recommendations;
    }

    /**
     * Generate comprehensive site performance analysis section that combines all performance data
     * @param {Object} data - Processed report data
     * @returns {string} Unified performance analysis HTML
     */
    static generatePerformanceSection(data) {
        if (!data.wordpress.isWordPress) return '';

        const performance = data.performance;
        const recommendations = data.recommendations;
        const plugins = data.plugins || [];
        
        // Generate comprehensive analysis
        const analysis = this.generateSiteAnalysis(data);
        
        return `
        <section class="section">
            <div class="">
                <div class="site-analysis-container">
                    <h2 class="section-title">Site Issues & Fixes</h2>
                    <p class="analysis-subtitle">A comprehensive report of detected issues and actionable recommendations.</p>
                    
                    <main class="analysis-main">
                        ${this.generateDetectedIssuesSection(analysis)}
                        ${this.generateRecommendedFixesSection(analysis)}
                    </main>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate PageSpeed Insights highlights section with key metrics
     * @param {Object} data - Processed report data
     * @returns {string} PageSpeed highlights HTML
     */
    static generatePageSpeedHighlightsSection(data) {
        if (!data.performance?.pagespeed) return '';

        const mobile = data.performance.pagespeed.mobile || {};
        const desktop = data.performance.pagespeed.desktop || {};

        // Extract key metrics from core_web_vitals structure
        const mobileMetrics = mobile.core_web_vitals || {};
        const desktopMetrics = desktop.core_web_vitals || {};
        
        const metrics = {
            mobileScore: mobile.performance_score ? Math.round(mobile.performance_score * 100) : null,
            desktopScore: desktop.performance_score ? Math.round(desktop.performance_score * 100) : null,
            lcp: Math.min(
                mobileMetrics.lcp?.value || Infinity, 
                desktopMetrics.lcp?.value || Infinity
            ),
            fcp: Math.min(
                mobileMetrics.fcp?.value || Infinity, 
                desktopMetrics.fcp?.value || Infinity
            ),
            cls: Math.max(
                mobileMetrics.cls?.value || 0, 
                desktopMetrics.cls?.value || 0
            ),
            tbt: Math.max(
                mobileMetrics.tbt?.value || 0, 
                desktopMetrics.tbt?.value || 0
            ),
            si: Math.min(
                mobileMetrics.speed_index?.value || Infinity, 
                desktopMetrics.speed_index?.value || Infinity
            )
        };

        return `
        <section class="section">
            <h2 class="section-title">PageSpeed Insights Summary</h2>
            <div class="section-content">
                ${this.generatePerformanceScores(metrics)}
                ${this.generateCoreWebVitalsCards(metrics)}
                ${this.generatePerformanceMetricsGrid(metrics)}
            </div>
        </section>`;
    }

    /**
     * Generate performance scores cards
     */
    static generatePerformanceScores(metrics) {
        const getScoreColor = (score) => {
            if (score >= 90) return 'green';
            if (score >= 50) return 'yellow';
            return 'red';
        };

        const mobileColor = metrics.mobileScore ? getScoreColor(metrics.mobileScore) : 'gray';
        const desktopColor = metrics.desktopScore ? getScoreColor(metrics.desktopScore) : 'gray';

        return `
        <div class="performance-scores-grid">
            <div class="score-card ${mobileColor}">
                <div class="score-card-header">
                    <div class="score-icon ${mobileColor}">
                        ${this.getMaterialIcon('smartphone')}
                    </div>
                    <div class="score-info">
                        <h3 class="score-title">Mobile Performance</h3>
                        <div class="score-value ${mobileColor}">${metrics.mobileScore || 'N/A'}</div>
                    </div>
                </div>
            </div>
            <div class="score-card ${desktopColor}">
                <div class="score-card-header">
                    <div class="score-icon ${desktopColor}">
                        ${this.getMaterialIcon('computer')}
                    </div>
                    <div class="score-info">
                        <h3 class="score-title">Desktop Performance</h3>
                        <div class="score-value ${desktopColor}">${metrics.desktopScore || 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate Core Web Vitals cards
     */
    static generateCoreWebVitalsCards(metrics) {
        const getVitalStatus = (metric, value, goodThreshold, needsImprovementThreshold) => {
            if (value <= goodThreshold) return 'green';
            if (value <= needsImprovementThreshold) return 'yellow';
            return 'red';
        };

        const lcpStatus = metrics.lcp !== Infinity ? getVitalStatus(metrics.lcp, metrics.lcp, 2500, 4000) : 'gray';
        const clsStatus = getVitalStatus(metrics.cls, metrics.cls, 0.1, 0.25);
        const fcpStatus = metrics.fcp !== Infinity ? getVitalStatus(metrics.fcp, metrics.fcp, 1800, 3000) : 'gray';

        return `
        <div class="cwv-section">
            <h3 class="cwv-title">
                ${this.getMaterialIcon('speed')}
                Core Web Vitals
            </h3>
            <div class="cwv-grid">
                <div class="cwv-card ${lcpStatus}">
                    <div class="cwv-metric-name">LCP</div>
                    <div class="cwv-metric-value ${lcpStatus}">
                        ${metrics.lcp !== Infinity ? (metrics.lcp / 1000).toFixed(1) + 's' : 'N/A'}
                    </div>
                    <div class="cwv-metric-label">Largest Contentful Paint</div>
                </div>
                <div class="cwv-card ${clsStatus}">
                    <div class="cwv-metric-name">CLS</div>
                    <div class="cwv-metric-value ${clsStatus}">
                        ${metrics.cls.toFixed(3)}
                    </div>
                    <div class="cwv-metric-label">Cumulative Layout Shift</div>
                </div>
                <div class="cwv-card ${fcpStatus}">
                    <div class="cwv-metric-name">FCP</div>
                    <div class="cwv-metric-value ${fcpStatus}">
                        ${metrics.fcp !== Infinity ? (metrics.fcp / 1000).toFixed(1) + 's' : 'N/A'}
                    </div>
                    <div class="cwv-metric-label">First Contentful Paint</div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate additional performance metrics grid
     */
    static generatePerformanceMetricsGrid(metrics) {
        return `
        <div class="additional-metrics">
            <h3 class="metrics-title">
                ${this.getMaterialIcon('analytics')}
                Additional Metrics
            </h3>
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-icon">
                        ${this.getMaterialIcon('schedule')}
                    </div>
                    <div class="metric-content">
                        <div class="metric-label">Total Blocking Time</div>
                        <div class="metric-value">${metrics.tbt ? parseFloat(metrics.tbt).toFixed(1) + 'ms' : 'N/A'}</div>
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-icon">
                        ${this.getMaterialIcon('visibility')}
                    </div>
                    <div class="metric-content">
                        <div class="metric-label">Speed Index</div>
                        <div class="metric-value">${metrics.si !== Infinity ? (metrics.si / 1000).toFixed(1) + 's' : 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate comprehensive site analysis combining all available data
     * @param {Object} data - All report data
     * @returns {Object} Analysis results with prioritized recommendations
     */
    static generateSiteAnalysis(data) {
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
        
        // Generate must-use plugin recommendations
        const mustUsePlugins = this.generateMustUsePluginRecommendations(criticalIssues, plugins);
        
        // Generate optimization opportunities
        const optimizationOpportunities = this.extractOptimizationOpportunities(recommendations, performance);

        return {
            metrics,
            pluginAnalysis,
            criticalIssues,
            actionPlan,
            mustUsePlugins,
            optimizationOpportunities,
            overallHealth: this.calculateOverallHealth(metrics, criticalIssues)
        };
    }

    /**
     * Generate performance overview with health score and key metrics
     */
    static generatePerformanceOverview(data, analysis) {
        const healthScore = analysis.overallHealth.score;
        const healthClass = healthScore >= 80 ? 'good' : healthScore >= 50 ? 'needs-improvement' : 'poor';
        const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 50 ? 'Needs Improvement' : 'Critical';

        return `
        <div class="performance-overview">
            <div class="health-score-card">
                <div class="health-score ${healthClass}">
                    <div class="score-value">${healthScore}</div>
                    <div class="score-label">Overall Health Score</div>
                    <div class="score-status">${healthLabel}</div>
                </div>
                <div class="health-indicators">
                    <div class="indicator ${analysis.metrics.mobileScore >= 90 ? 'good' : analysis.metrics.mobileScore >= 50 ? 'warning' : 'critical'}">
                        <div class="indicator-value">${Math.round(analysis.metrics.mobileScore * 100)}</div>
                        <div class="indicator-label">Mobile Score</div>
                    </div>
                    <div class="indicator ${analysis.metrics.desktopScore >= 90 ? 'good' : analysis.metrics.desktopScore >= 50 ? 'warning' : 'critical'}">
                        <div class="indicator-value">${Math.round(analysis.metrics.desktopScore * 100)}</div>
                        <div class="indicator-label">Desktop Score</div>
                    </div>
                    <div class="indicator ${analysis.metrics.lcp <= 2500 ? 'good' : analysis.metrics.lcp <= 4000 ? 'warning' : 'critical'}">
                        <div class="indicator-value">${analysis.metrics.lcp !== Infinity ? (analysis.metrics.lcp/1000).toFixed(1) + 's' : 'N/A'}</div>
                        <div class="indicator-label">LCP</div>
                    </div>
                    <div class="indicator ${analysis.metrics.cls <= 0.1 ? 'good' : analysis.metrics.cls <= 0.25 ? 'warning' : 'critical'}">
                        <div class="indicator-value">${analysis.metrics.cls > 0 ? analysis.metrics.cls.toFixed(3) : 'N/A'}</div>
                        <div class="indicator-label">CLS</div>
                    </div>
                </div>
            </div>
            
            <div class="performance-summary">
                <h3>What We Found</h3>
                <div class="summary-grid">
                    <div class="summary-item ${analysis.criticalIssues.length > 0 ? 'critical' : 'good'}">
                        <div class="summary-value">${analysis.criticalIssues.length}</div>
                        <div class="summary-label">Critical Issues</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${analysis.pluginAnalysis.heavyPlugins.length}</div>
                        <div class="summary-label">Heavy Plugins</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${analysis.mustUsePlugins.missing.length}</div>
                        <div class="summary-label">Missing Essential Plugins</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${analysis.actionPlan.filter(a => a.priority === 'high').length}</div>
                        <div class="summary-label">High Priority Actions</div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Analyze plugin performance impact
     */
    static analyzePluginPerformance(plugins, performanceData) {
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
     */
    static identifyCriticalIssues(metrics, pluginAnalysis, plugins) {
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
     */
    static generatePriorityActionPlan(criticalIssues, metrics, pluginAnalysis, recommendations) {
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
     * Generate must-use plugin recommendations
     */
    static generateMustUsePluginRecommendations(criticalIssues, currentPlugins) {
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
     */
    static getCategoryImpact(category) {
        const impacts = {
            security: 'Protect against malware, hacking attempts, and security vulnerabilities',
            performance: 'Improve page load times, user experience, and SEO rankings',
            backup: 'Ensure data safety and quick recovery from issues',
            seo: 'Improve search engine visibility and organic traffic'
        };
        return impacts[category] || 'Enhance site functionality';
    }

    /**
     * Extract optimization opportunities from PSI and recommendations
     */
    static extractOptimizationOpportunities(recommendations, performance) {
        const opportunities = [];

        // Extract from PSI recommendations if available
        if (recommendations?.analysis?.psi_recommendations?.opportunities) {
            recommendations.analysis.psi_recommendations.opportunities.forEach(opp => {
                opportunities.push({
                    type: 'psi_opportunity',
                    title: opp.title,
                    description: opp.description,
                    impact: opp.impact || 'medium',
                    savings: opp.savings,
                    plugins: opp.plugin_suggestions || [],
                    priority: opp.priority || 'medium'
                });
            });
        }

        // Add general optimization opportunities
        opportunities.push({
            type: 'image_optimization',
            title: 'Image Optimization',
            description: 'Optimize images for web delivery using modern formats and compression',
            impact: 'high',
            plugins: ['smush', 'shortpixel-image-optimiser', 'wp-optimize'],
            priority: 'medium'
        });

        opportunities.push({
            type: 'database_optimization',
            title: 'Database Cleanup',
            description: 'Clean up database by removing spam, revisions, and unused data',
            impact: 'medium',
            plugins: ['wp-optimize', 'advanced-database-cleaner'],
            priority: 'low'
        });

        return opportunities.slice(0, 6); // Limit to top 6 opportunities
    }

    /**
     * Calculate overall health score
     */
    static calculateOverallHealth(metrics, criticalIssues) {
        let score = 100;
        let factors = [];

        // Deduct points for Core Web Vitals
        if (metrics.lcp > 4000) {
            score -= 30;
            factors.push('Poor LCP performance');
        } else if (metrics.lcp > 2500) {
            score -= 15;
            factors.push('Suboptimal LCP');
        }

        if (metrics.cls > 0.25) {
            score -= 25;
            factors.push('High layout shift');
        } else if (metrics.cls > 0.1) {
            score -= 10;
            factors.push('Moderate layout shift');
        }

        // Deduct points for performance scores
        if (metrics.mobileScore < 0.5) {
            score -= 20;
            factors.push('Poor mobile performance');
        }
        if (metrics.desktopScore < 0.5) {
            score -= 10;
            factors.push('Poor desktop performance');
        }

        // Deduct points for critical issues
        criticalIssues.forEach(issue => {
            if (issue.severity === 'critical') {
                score -= 15;
            } else if (issue.severity === 'warning') {
                score -= 5;
            }
        });

        return {
            score: Math.max(0, Math.min(100, Math.round(score))),
            factors: factors
        };
    }

    /**
     * Generate detected issues section with modern card design
     */
    static generateDetectedIssuesSection(analysis) {
        const issueCards = this.generateIssueCards(analysis);
        
        return `
        <section class="detected-issues-section">
            <h2 class="section-header">
                <span class="section-icon error-icon">${this.getMaterialIcon('warning')}</span>
                Site Issues Detected by WisdmLabs
            </h2>
            <div class="issues-grid">
                ${issueCards}
            </div>
        </section>`;
    }

    /**
     * Get Material Symbol for a given icon name
     */
    static getMaterialIcon(iconName) {
        const icons = {
            security: 'security',
            analytics: 'analytics', 
            speed: 'speed',
            gps_fixed: 'gps_fixed',
            cached: 'cached',
            lock: 'lock',
            warning: 'error',
            check_circle: 'task_alt',
            smartphone: 'smartphone',
            computer: 'computer',
            schedule: 'schedule',
            visibility: 'visibility'
        };

        const materialSymbolName = icons[iconName] || 'error';
        return `<span class="material-symbols-outlined">${materialSymbolName}</span>`;
    }

    /**
     * Generate issue cards based on analysis
     */
    static generateIssueCards(analysis) {
        const issues = [];

        // Security Issues
        if (analysis.pluginAnalysis.outdatedPlugins.length > 0) {
            issues.push({
                type: 'security',
                title: 'Security Vulnerabilities',
                description: `${analysis.pluginAnalysis.outdatedPlugins.length} plugins are outdated, posing potential security and compatibility issues.`,
                icon: 'security',
                color: 'red',
                severity: 'critical'
            });
        }

        // Heavy Plugins
        if (analysis.pluginAnalysis.heavyPlugins.length > 0) {
            issues.push({
                type: 'performance',
                title: 'Heavy Plugins',
                description: `${analysis.pluginAnalysis.heavyPlugins.length} plugins are consuming excessive server resources, slowing down your site.`,
                icon: 'analytics',
                color: 'yellow',
                severity: 'warning'
            });
        }

        // Performance Issues
        if (analysis.metrics.mobileScore < 0.5 || analysis.metrics.desktopScore < 0.5) {
            issues.push({
                type: 'performance',
                title: 'Poor Performance Scores',
                description: `Site performance is below optimal levels. Mobile: ${Math.round(analysis.metrics.mobileScore * 100)}, Desktop: ${Math.round(analysis.metrics.desktopScore * 100)}.`,
                icon: 'speed',
                color: 'orange',
                severity: 'critical'
            });
        }

        // Core Web Vitals
        if (analysis.metrics.lcp > 4000) {
            issues.push({
                type: 'core-vitals',
                title: 'Poor Core Web Vitals',
                description: `LCP (${(analysis.metrics.lcp/1000).toFixed(1)}s) and other Core Web Vitals need improvement for better user experience.`,
                icon: 'gps_fixed',
                color: 'red',
                severity: 'critical'
            });
        }

        // Missing Optimization
        if (analysis.pluginAnalysis.optimizationPlugins.length === 0) {
            issues.push({
                type: 'optimization',
                title: 'No Caching',
                description: 'Caching is not implemented, which is crucial for website performance optimization.',
                icon: 'cached',
                color: 'indigo',
                severity: 'warning'
            });
        }

        // Missing Security
        if (analysis.pluginAnalysis.securityPlugins.length === 0) {
            issues.push({
                type: 'security',
                title: 'No Security Plugin',
                description: 'No dedicated security plugin detected. Your site may be vulnerable to attacks.',
                icon: 'lock',
                color: 'red',
                severity: 'critical'
            });
        }

        // Generate cards
        return issues.map(issue => `
            <div class="issue-card ${issue.color}">
                <div class="issue-card-content">
                    <div class="issue-icon ${issue.color}">
                        ${this.getMaterialIcon(issue.icon)}
                    </div>
                    <div class="issue-info">
                        <h3 class="issue-title ${issue.color}">${issue.title}</h3>
                        <p class="issue-description">${issue.description}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Generate recommended fixes section with modern design
     */
    static generateRecommendedFixesSection(analysis) {
        const fixCards = this.generateRecommendedFixes(analysis);
        
        return `
        <section class="recommended-fixes-section">
            <h2 class="section-header">
                <span class="section-icon success-icon">${this.getMaterialIcon('check_circle')}</span>
                WisdmLabs Recommends
            </h2>
            <div class="fixes-list">
                ${fixCards}
            </div>
        </section>`;
    }

    /**
     * Generate recommended fixes based on analysis
     */
    static generateRecommendedFixes(analysis) {
        const fixes = [];

        // Security Fix - High Priority
        if (analysis.pluginAnalysis.outdatedPlugins.length > 0 || analysis.pluginAnalysis.securityPlugins.length === 0) {
            fixes.push({
                priority: 'high',
                title: 'Secure Your Website',
                description: 'Address security vulnerabilities by installing a dedicated security plugin and keeping all components updated.',
                steps: [
                    'Install and configure Wordfence or Sucuri Security.',
                    'Run a full site scan to identify and remove malware.',
                    'Update all outdated plugins and themes to their latest versions.'
                ]
            });
        }

        // Performance Fix - High Priority for poor performance
        if (analysis.metrics.mobileScore < 0.5 || analysis.pluginAnalysis.optimizationPlugins.length === 0) {
            fixes.push({
                priority: 'high',
                title: 'Implement Caching & CDN',
                description: 'Dramatically improve page load times by caching content and using a Content Delivery Network (CDN).',
                steps: [
                    'Install a caching plugin like WP Rocket or W3 Total Cache.',
                    'Set up a CDN service such as Cloudflare to distribute your content globally.',
                    'Configure minification and file combination settings within your caching plugin.'
                ]
            });
        }

        // Plugin Optimization - Medium Priority
        if (analysis.pluginAnalysis.heavyPlugins.length > 0) {
            fixes.push({
                priority: 'medium',
                title: 'Optimize Plugins',
                description: 'Review and manage your plugins to reduce resource consumption and potential conflicts.',
                steps: [
                    'Deactivate and delete any unused plugins.',
                    'Investigate heavy plugins and find lightweight alternatives if possible.',
                    'Regularly update all active plugins to ensure compatibility and security.'
                ]
            });
        }

        // Core Web Vitals Fix
        if (analysis.metrics.lcp > 4000 || analysis.metrics.cls > 0.25) {
            fixes.push({
                priority: analysis.metrics.lcp > 4000 ? 'high' : 'medium',
                title: 'Improve Core Web Vitals',
                description: 'Optimize LCP, CLS, and other Core Web Vitals for better user experience and SEO rankings.',
                steps: [
                    'Optimize images and implement lazy loading.',
                    'Minimize layout shifts by setting image dimensions.',
                    'Preload critical resources and optimize CSS delivery.',
                    'Reduce JavaScript execution time and third-party scripts.'
                ]
            });
        }

        // Image and Database Optimization - Low Priority
        fixes.push({
            priority: 'low',
            title: 'Optimize Media & Database',
            description: 'Compress images and clean your database to further improve site speed and efficiency.',
            steps: [
                'Use a plugin like Smush or EWWW Image Optimizer to compress your media library.',
                'Install a database optimization plugin like WP-Optimize to clean up overhead.',
                'Serve images in next-gen formats like WebP for better performance.'
            ]
        });

        // Must-use plugins
        if (analysis.mustUsePlugins.missing.length > 0) {
            fixes.push({
                priority: 'medium',
                title: 'Install Essential Plugins',
                description: `You're missing ${analysis.mustUsePlugins.missing.length} essential plugin categories that are recommended for a complete WordPress site.`,
                steps: analysis.mustUsePlugins.recommendations.slice(0, 3).map(rec => 
                    `Install ${rec.category.toLowerCase()} plugin: ${rec.plugins[0].displayName} - ${rec.plugins[0].reason}`
                )
            });
        }

        return fixes.map(fix => {
            const priorityClass = fix.priority === 'high' ? 'red' : fix.priority === 'medium' ? 'yellow' : 'green';
            const priorityLabel = fix.priority === 'high' ? 'High Priority' : fix.priority === 'medium' ? 'Medium Priority' : 'Low Priority';
            
            return `
                <div class="fix-card">
                    <div class="fix-card-header">
                        <div class="fix-info">
                                <h3 class="fix-title">${fix.title}</h3>
                            <p class="fix-description">${fix.description}</p>
                        </div>
                        <div class="fix-priority">
                            <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
                        </div>
                    </div>
                    <div class="fix-steps">
                        <p class="steps-label">Actionable Steps:</p>
                        <ul class="steps-list">
                            ${fix.steps.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Generate must-use plugins section
     */
    static generateMustUsePlugins(analysis) {
        if (analysis.mustUsePlugins.missing.length === 0) {
            return `
            <div class="must-use-plugins">
                <h3>✅ Essential Plugins Coverage Complete</h3>
                <p>Your site has good coverage of essential plugin categories.</p>
            </div>`;
        }

        const pluginsList = analysis.mustUsePlugins.recommendations.map(rec => `
            <div class="plugin-category-card ${rec.priority}">
                <div class="category-header">
                    <div class="category-title">${rec.category} Plugins</div>
                    <div class="category-priority ${rec.priority}">${rec.priority.toUpperCase()}</div>
                </div>
                <div class="category-impact">${rec.impact}</div>
                <div class="plugin-suggestions">
                    <strong>Recommended plugins:</strong>
                    <ul>
                        ${rec.plugins.map(plugin => `
                            <li><strong>${plugin.displayName}</strong> - ${plugin.reason}</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `).join('');

        return `
        <div class="must-use-plugins">
            <h3>🔧 Essential Plugins Missing</h3>
            <p>These plugin categories are recommended for a complete WordPress site:</p>
            <div class="plugin-categories">
                ${pluginsList}
            </div>
        </div>`;
    }

    /**
     * Generate optimization opportunities section
     */
    static generateOptimizationOpportunities(analysis) {
        const opportunitiesList = analysis.optimizationOpportunities.map(opp => `
            <div class="opportunity-card ${opp.priority}">
                <div class="opportunity-header">
                    <div class="opportunity-title">${opp.title}</div>
                    <div class="opportunity-impact ${opp.impact}">${opp.impact.toUpperCase()} IMPACT</div>
                </div>
                <div class="opportunity-description">${opp.description}</div>
                ${opp.plugins.length > 0 ? `
                    <div class="opportunity-plugins">
                        <strong>Recommended plugins:</strong> ${opp.plugins.join(', ')}
                    </div>
                ` : ''}
                ${opp.savings ? `
                    <div class="opportunity-savings">
                        <strong>Potential savings:</strong> 
                        ${opp.savings.time ? `${opp.savings.time}ms` : ''}
                        ${opp.savings.bytes ? `, ${this.formatBytes(opp.savings.bytes)}` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');

        return `
        <div class="optimization-opportunities">
            <h3>⚡ Optimization Opportunities</h3>
            <p>Additional improvements to enhance your site's performance:</p>
            <div class="opportunities-grid">
                ${opportunitiesList}
            </div>
        </div>`;
    }

    /**
     * Generate comprehensive PageSpeed Insights section
     * @param {Object} data - Processed report data
     * @returns {string} PSI section HTML
     */
    static generatePSISection(data) {
        if (!data.performance?.pagespeed) return '';

        const mobile = data.performance.pagespeed.mobile;
        const desktop = data.performance.pagespeed.desktop;
        const psiRecs = data.recommendations?.analysis?.psi_recommendations;

        if (!mobile && !desktop) return '';

        return `
        <section class="section">
            <h2 class="section-title">PageSpeed Insights Analysis</h2>
            <div class="section-content">
                ${this.generatePSISummary(mobile, desktop)}
                ${this.generatePSICoreWebVitals(mobile, desktop)}
                ${this.generatePSICategories(mobile, desktop)}
                ${this.generatePSIOpportunities(psiRecs)}
                ${this.generatePSIDiagnostics(psiRecs)}
                ${this.generatePSIAccessibility(mobile, desktop)}
                ${this.generatePSIBestPractices(mobile, desktop)}
                ${this.generatePSISEO(mobile, desktop)}
            </div>
        </section>`;
    }

    /**
     * Generate PSI summary section
     */
    static generatePSISummary(mobile, desktop) {
        const mobileScore = mobile?.performance_score ? Math.round(mobile.performance_score * 100) : 'N/A';
        const desktopScore = desktop?.performance_score ? Math.round(desktop.performance_score * 100) : 'N/A';

        return `
        <div class="subsection-title">Performance Scores</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Mobile Score</div>
                <div class="info-value ${this.getScoreClass(mobileScore)}">${mobileScore}/100</div>
            </div>
            <div class="info-item">
                <div class="info-label">Desktop Score</div>
                <div class="info-value ${this.getScoreClass(desktopScore)}">${desktopScore}/100</div>
            </div>
            ${mobile?.timestamp ? `
            <div class="info-item">
                <div class="info-label">Analysis Date</div>
                <div class="info-value">${new Date(mobile.timestamp).toLocaleString()}</div>
            </div>` : ''}
        </div>`;
    }

    /**
     * Generate Core Web Vitals section
     */
    static generatePSICoreWebVitals(mobile, desktop) {
        const cwvData = mobile?.core_web_vitals || desktop?.core_web_vitals;
        if (!cwvData) return '';

        return `
        <div class="subsection-title">Core Web Vitals</div>
        <div class="cwv-grid">
            ${this.generateCWVCard('LCP', cwvData.lcp, 'Largest Contentful Paint')}
            ${this.generateCWVCard('CLS', cwvData.cls, 'Cumulative Layout Shift')}
            ${this.generateCWVCard('INP', cwvData.inp, 'Interaction to Next Paint')}
            ${this.generateCWVCard('FCP', cwvData.fcp, 'First Contentful Paint')}
            ${this.generateCWVCard('TBT', cwvData.tbt, 'Total Blocking Time')}
            ${this.generateCWVCard('SI', cwvData.speed_index, 'Speed Index')}
        </div>`;
    }

    /**
     * Generate CWV card
     */
    static generateCWVCard(metric, data, description) {
        if (!data || data.value === null) return '';

        let value = data.displayValue || data.value;
        const status = data.status || 'unknown';
        const score = data.score ? Math.round(data.score * 100) : 'N/A';

        // Format numeric values to avoid long decimals
        if (typeof value === 'number') {
            value = parseFloat(value).toFixed(1);
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            value = parseFloat(value).toFixed(1);
        }

        return `
        <div class="cwv-card ${status}">
            <div class="cwv-metric">${metric}</div>
            <div class="cwv-value">${value}</div>
            <div class="cwv-score">Score: ${score}/100</div>
            <div class="cwv-description">${description}</div>
        </div>`;
    }

    /**
     * Generate PSI categories section
     */
    static generatePSICategories(mobile, desktop) {
        const mobileCats = mobile?.categories || {};
        const desktopCats = desktop?.categories || {};
        
        const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
        const categoryNames = {
            'performance': 'Performance',
            'accessibility': 'Accessibility', 
            'best-practices': 'Best Practices',
            'seo': 'SEO'
        };

        const categoryCards = categories.map(catId => {
            const mobileScore = mobileCats[catId]?.score ? Math.round(mobileCats[catId].score * 100) : 'N/A';
            const desktopScore = desktopCats[catId]?.score ? Math.round(desktopCats[catId].score * 100) : 'N/A';
            const avgScore = (mobileScore !== 'N/A' && desktopScore !== 'N/A') 
                ? Math.round((mobileScore + desktopScore) / 2) 
                : mobileScore !== 'N/A' ? mobileScore : desktopScore;

            return `
            <div class="category-card">
                <div class="category-name">${categoryNames[catId]}</div>
                <div class="category-scores">
                    <div class="score-item">
                        <span class="score-label">Mobile:</span>
                        <span class="score-value ${this.getScoreClass(mobileScore)}">${mobileScore}/100</span>
                    </div>
                    <div class="score-item">
                        <span class="score-label">Desktop:</span>
                        <span class="score-value ${this.getScoreClass(desktopScore)}">${desktopScore}/100</span>
                    </div>
                    <div class="score-item average">
                        <span class="score-label">Average:</span>
                        <span class="score-value ${this.getScoreClass(avgScore)}">${avgScore}/100</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        return `
        <div class="subsection-title">Category Scores</div>
        <div class="categories-grid">
            ${categoryCards}
        </div>`;
    }

    /**
     * Generate PSI opportunities section
     */
    static generatePSIOpportunities(psiRecs) {
        if (!psiRecs?.opportunities?.length) return '';

        const opportunities = psiRecs.opportunities.slice(0, 10); // Top 10

        return `
        <div class="subsection-title">Top Optimization Opportunities</div>
        <div class="opportunities-list">
            ${opportunities.map(opp => `
                <div class="opportunity-item ${opp.priority}">
                    <div class="opportunity-header">
                        <div class="opportunity-title">${opp.title}</div>
                        <div class="opportunity-badges">
                            <span class="priority-badge ${opp.priority}">${opp.priority.toUpperCase()}</span>
                            <span class="impact-badge ${opp.impact}">${opp.impact.toUpperCase()}</span>
                            ${opp.enhanced_score ? `<span class="score-badge">${opp.enhanced_score}/100</span>` : ''}
                        </div>
                    </div>
                    <div class="opportunity-description">${opp.description}</div>
                    ${opp.savings ? `
                        <div class="opportunity-savings">
                            <strong>Potential Savings:</strong> 
                            ${opp.savings.time ? `${opp.savings.time}ms` : ''}
                            ${opp.savings.bytes ? `, ${this.formatBytes(opp.savings.bytes)}` : ''}
                        </div>
                    ` : ''}
                    ${opp.plugin_suggestions?.length ? `
                        <div class="opportunity-plugins">
                            <strong>Suggested Plugins:</strong> ${opp.plugin_suggestions.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>`;
    }

    /**
     * Generate PSI diagnostics section
     */
    static generatePSIDiagnostics(psiRecs) {
        if (!psiRecs?.diagnostics?.length) return '';

        return `
        <div class="subsection-title">Performance Diagnostics</div>
        <div class="diagnostics-list">
            ${psiRecs.diagnostics.map(diag => `
                <div class="diagnostic-item ${diag.priority}">
                    <div class="diagnostic-header">
                        <div class="diagnostic-title">${diag.title}</div>
                        <div class="diagnostic-badges">
                            <span class="priority-badge ${diag.priority}">${diag.priority.toUpperCase()}</span>
                            <span class="count-badge">${diag.count} issues</span>
                        </div>
                    </div>
                    <div class="diagnostic-description">${diag.description}</div>
                    ${diag.total_duration ? `
                        <div class="diagnostic-details">
                            <strong>Total Impact:</strong> ${diag.total_duration}ms
                        </div>
                    ` : ''}
                    ${diag.plugin_suggestions?.length ? `
                        <div class="diagnostic-plugins">
                            <strong>Suggested Plugins:</strong> ${diag.plugin_suggestions.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>`;
    }

    /**
     * Generate accessibility section
     */
    static generatePSIAccessibility(mobile, desktop) {
        const accessData = mobile?.accessibility || desktop?.accessibility || {};
        const issues = Object.entries(accessData).filter(([_, audit]) => audit.score < 0.9);
        
        if (!issues.length) return '';

        return `
        <div class="subsection-title">Accessibility Issues</div>
        <div class="accessibility-list">
            ${issues.slice(0, 5).map(([auditId, audit]) => `
                <div class="accessibility-item">
                    <div class="accessibility-title">${audit.title}</div>
                    <div class="accessibility-score ${this.getScoreClass(Math.round(audit.score * 100))}">
                        ${Math.round(audit.score * 100)}/100
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    /**
     * Generate best practices section
     */
    static generatePSIBestPractices(mobile, desktop) {
        const bpData = mobile?.best_practices || desktop?.best_practices || {};
        const issues = Object.entries(bpData).filter(([_, audit]) => audit.score < 0.9);
        
        if (!issues.length) return '';

        return `
        <div class="subsection-title">Best Practices Issues</div>
        <div class="best-practices-list">
            ${issues.slice(0, 5).map(([auditId, audit]) => `
                <div class="best-practice-item">
                    <div class="best-practice-title">${audit.title}</div>
                    <div class="best-practice-score ${this.getScoreClass(Math.round(audit.score * 100))}">
                        ${Math.round(audit.score * 100)}/100
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    /**
     * Generate SEO section
     */
    static generatePSISEO(mobile, desktop) {
        const seoData = mobile?.seo || desktop?.seo || {};
        const issues = Object.entries(seoData).filter(([_, audit]) => audit.score < 0.9);
        
        if (!issues.length) return '';

        return `
        <div class="subsection-title">SEO Issues</div>
        <div class="seo-list">
            ${issues.slice(0, 5).map(([auditId, audit]) => `
                <div class="seo-item">
                    <div class="seo-title">${audit.title}</div>
                    <div class="seo-score ${this.getScoreClass(Math.round(audit.score * 100))}">
                        ${Math.round(audit.score * 100)}/100
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    /**
     * Get score class for styling
     */
    static getScoreClass(score) {
        if (score === 'N/A') return 'unknown';
        if (score >= 90) return 'good';
        if (score >= 50) return 'needs-improvement';
        return 'poor';
    }

    /**
     * Format bytes to human readable
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }


    /**
     * Generate footer
     * @param {Object} data - Processed report data
     * @returns {string} Footer HTML
     */
    static generateFooter(data) {
        return `
        <footer class="footer">
            <p>Report generated by WordPress Site Analyzer v2.0.0</p>
            <p>For more information about your site analysis, feel free to contact us at aditya.rao@wisdmlabs.com.</p>
            <p>This report analyzes publicly available information and does not access private data.</p>
        </footer>`;
    }

    /**
     * Format date
     * @param {string} dateString - Date string
     * @returns {string} Formatted date
     */
    static formatDate(dateString) {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format number with commas
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    static formatNumber(num) {
        if (!num || isNaN(num)) return null;
        return num.toLocaleString();
    }

    /**
     * Generate JavaScript for interactive features
     * @returns {string} JavaScript code
     */
    static generateScripts() {
        return `<script>
            // Add print functionality
            function printReport() {
                window.print();
            }
            
            // Add keyboard shortcut for printing
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'p') {
                    e.preventDefault();
                    printReport();
                }
            });
            
            // Add smooth scroll behavior for anchor links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
            
            // Add copy URL functionality
            function copyUrl() {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Report URL copied to clipboard!');
                });
            }
        </script>`;
    }
}

module.exports = HtmlReporter;
