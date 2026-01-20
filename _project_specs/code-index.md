# Code Capability Index: WordPress Site Analyzer

## Summary

| Metric | Count |
|--------|-------|
| **Total Files Scanned** | 33 |
| **Classes** | 25 |
| **Exported Functions** | 150+ |
| **API Endpoints** | 7 |
| **External Integrations** | 3 |
| **Test Files** | 3 |

## Project Overview

**Name:** wordpress-site-analyzer
**Version:** 2.0.0
**Description:** A comprehensive JavaScript tool for analyzing WordPress sites without admin access, detecting version, theme, plugins, and generating performance recommendations.

**Entry Points:**
- `index.js` - Library entry point
- `cli.js` - CLI interface
- `server.js` - Express web server

## Module Structure

```
src/
├── config/
│   └── constants.js          # Configuration constants
├── detectors/
│   ├── enhanced-wordpress-detector.js
│   ├── enhanced-version-detector.js
│   ├── enhanced-asset-inspector.js
│   ├── theme-detector.js
│   ├── plugin-detector.js
│   ├── asset-inspector.js
│   ├── performance-analyzer.js
│   └── [legacy detectors]
├── analysis/
│   └── functionality-gap-analyzer.js
├── recommendations/
│   ├── plugin-recommendation-engine.js
│   ├── performance-recommendation-engine.js
│   └── psi-recommendation-engine.js
├── reporters/
│   ├── console-reporter.js
│   ├── json-reporter.js
│   ├── html-reporter.js
│   └── pdf-reporter.js
├── services/
│   └── email-service.js
├── integrations/
│   ├── wordpress-org.js
│   └── pagespeed.js
├── utils/
│   ├── http-client.js
│   ├── http-range.js
│   ├── url-helper.js
│   └── version-comparator.js
└── wordpress-analyzer.js     # Main analyzer class
```

## Core Classes

### 1. WordPressAnalyzer
**File:** `src/wordpress-analyzer.js`

Main orchestrator class for site analysis.

| Method | Description |
|--------|-------------|
| `analyzeSite(url, options)` | Analyze a WordPress site |
| `quickDetect(url)` | Quick WordPress detection |
| `generateReport(results)` | Generate console report |
| `generateJsonReport(results, options)` | Generate JSON report |
| `generateHtmlReport(results, options)` | Generate HTML report |
| `generatePdfReport(results, options)` | Generate PDF report |
| `analyzeMultipleSites(urls, options)` | Batch analysis |

### 2. EnhancedWordPressDetector
**File:** `src/detectors/enhanced-wordpress-detector.js`

WordPress CMS detection with multiple methods.

| Method | Description |
|--------|-------------|
| `detect(baseUrl, $, html)` | Main detection method |
| `detectFromMetaGenerator($)` | Check meta generator tag |
| `detectFromPaths($, html)` | Check WP path patterns |
| `detectFromCssClasses($)` | Check CSS class patterns |
| `detectFromRest(baseUrl)` | Check REST API |
| `calculateConfidence(indicators)` | Calculate confidence score |

### 3. EnhancedVersionDetector
**File:** `src/detectors/enhanced-version-detector.js`

WordPress version detection with 6+ methods.

| Method | Description |
|--------|-------------|
| `detectBestVersion(baseUrl, $, html)` | Detect best version |
| `detectFromMetaGenerator($)` | Version from meta tag |
| `detectFromReadme(baseUrl)` | Version from readme.html |
| `detectFromScripts($)` | Version from scripts |
| `validateVersion(version)` | Validate version format |

### 4. ThemeDetector
**File:** `src/detectors/theme-detector.js`

Active theme detection and metadata extraction.

| Method | Description |
|--------|-------------|
| `detect(baseUrl, $)` | Main theme detection |
| `detectFromStylesheet($, baseUrl)` | Theme from CSS |
| `parseStyleCss(url)` | Parse style.css |
| `enrichThemeData(theme)` | Enrich with WP.org data |

### 5. PluginDetector
**File:** `src/detectors/plugin-detector.js`

Plugin detection with 10+ methods.

| Method | Description |
|--------|-------------|
| `detect(baseUrl, $, html)` | Main plugin detection |
| `detectFromAssets($, baseUrl)` | From CSS/JS assets |
| `detectFromPatterns(html)` | From HTML patterns |
| `detectFromRestApi(baseUrl)` | From REST API |
| `enrichPluginData(plugins)` | Enrich with WP.org |
| `checkOutdatedStatus(plugin)` | Check if outdated |

### 6. PerformanceAnalyzer
**File:** `src/detectors/performance-analyzer.js`

Performance analysis and PageSpeed integration.

| Method | Description |
|--------|-------------|
| `analyze()` | Main performance analysis |
| `analyzePageSpeedInsights()` | PSI data retrieval |
| `analyzePluginPerformance()` | Plugin impact |
| `generateRecommendations()` | Generate recommendations |

## Reporters

| Reporter | File | Output Format |
|----------|------|---------------|
| ConsoleReporter | `reporters/console-reporter.js` | Terminal output |
| JsonReporter | `reporters/json-reporter.js` | JSON data |
| HtmlReporter | `reporters/html-reporter.js` | HTML document |
| PdfReporter | `reporters/pdf-reporter.js` | PDF document |

## Recommendation Engines

| Engine | File | Purpose |
|--------|------|---------|
| PluginRecommendationEngine | `recommendations/plugin-recommendation-engine.js` | Plugin suggestions |
| PerformanceRecommendationEngine | `recommendations/performance-recommendation-engine.js` | Performance optimizations |
| PSIRecommendationEngine | `recommendations/psi-recommendation-engine.js` | PageSpeed-based recommendations |

## External Integrations

### WordPress.org API
- **File:** `src/integrations/wordpress-org.js`
- **Purpose:** Plugin metadata, versions, ratings
- **Endpoint:** `https://api.wordpress.org/plugins/info/1.2/`

### Google PageSpeed Insights
- **File:** `src/integrations/pagespeed.js`
- **Purpose:** Performance metrics, Core Web Vitals
- **Configuration:** `PSI_API_KEY` environment variable

### Email (SMTP)
- **File:** `src/services/email-service.js`
- **Purpose:** Send PDF reports via email
- **Provider:** Nodemailer with SMTP

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze WordPress site |
| `/api/analyze/pdf` | POST | Generate PDF report |
| `/api/analyze/email` | POST | Send analysis via email |
| `/api/email/test` | POST | Send test email |
| `/api/email/config` | GET | Check email configuration |
| `/api/health` | GET | Health check |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.12.2 | HTTP client |
| cheerio | ^1.1.2 | HTML parsing |
| express | ^5.1.0 | Web server |
| cors | ^2.8.5 | CORS support |
| puppeteer | ^24.21.0 | PDF generation |
| nodemailer | ^7.0.6 | Email sending |
| dotenv | ^17.2.2 | Environment variables |

## Detection Methods

### WordPress Detection (15 methods)
1. Meta generator tags
2. HTML structure analysis
3. Asset path analysis
4. JavaScript variable detection
5. CSS class/ID analysis
6. HTML comment analysis
7. REST API endpoint detection
8. WordPress file detection
9. HTTP header analysis
10. Sitemap analysis
11. Robots.txt analysis
12. Feed endpoint detection
13. Admin endpoint detection
14. Plugin/theme directory detection
15. Inline script analysis

### Version Detection (7 methods)
1. Meta generator tags
2. WordPress core files
3. REST API endpoints
4. README.html file
5. OPML file checking
6. RSS feed analysis
7. WordPress comments

### Plugin Detection (10 methods)
1. Asset path scanning
2. Advanced asset introspection
3. Enhanced plugin version detection
4. REST API endpoint detection
5. JavaScript variable detection
6. CSS class/ID patterns
7. Meta tag analysis
8. HTML comment analysis
9. Content pattern matching
10. Plugin header parsing
