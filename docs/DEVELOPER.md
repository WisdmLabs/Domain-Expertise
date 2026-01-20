# Developer Guide

**WordPress Site Analyzer v2.0.0**

## Development Setup

### Prerequisites

- Node.js 14+ (18+ recommended)
- npm or yarn
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/wordpress-site-analyzer.git
cd wordpress-site-analyzer

# Install dependencies
npm install

# Install Puppeteer Chrome browser
npm run postinstall
```

### Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Required for full functionality:
- `PSI_API_KEY` - Google PageSpeed Insights API key
- `SMTP_*` - Email configuration

## Project Structure

```
wordpress-site-analyzer/
├── src/
│   ├── config/
│   │   └── constants.js        # Configuration constants
│   ├── detectors/
│   │   ├── enhanced-wordpress-detector.js
│   │   ├── enhanced-version-detector.js
│   │   ├── theme-detector.js
│   │   ├── plugin-detector.js
│   │   ├── asset-inspector.js
│   │   ├── enhanced-asset-inspector.js
│   │   └── performance-analyzer.js
│   ├── analysis/
│   │   └── functionality-gap-analyzer.js
│   ├── recommendations/
│   │   ├── plugin-recommendation-engine.js
│   │   ├── performance-recommendation-engine.js
│   │   └── psi-recommendation-engine.js
│   ├── reporters/
│   │   ├── console-reporter.js
│   │   ├── json-reporter.js
│   │   ├── html-reporter.js
│   │   └── pdf-reporter.js
│   ├── services/
│   │   └── email-service.js
│   ├── integrations/
│   │   ├── wordpress-org.js
│   │   └── pagespeed.js
│   ├── utils/
│   │   ├── http-client.js
│   │   ├── http-range.js
│   │   ├── url-helper.js
│   │   └── version-comparator.js
│   └── wordpress-analyzer.js   # Main class
├── public/                     # Web UI assets
├── tests/                      # Test files
├── docs/                       # Documentation
├── cli.js                      # CLI entry point
├── server.js                   # API server
├── index.js                    # Library entry point
└── package.json
```

## Core Concepts

### Detection Pipeline

The analysis follows this pipeline:

```
URL → Fetch HTML → Parse (Cheerio) → Parallel Detection → Enrichment → Recommendations → Report
```

### Detection Methods

Each detector implements multiple methods with confidence levels:

```javascript
// Example: Version detection
const methods = [
  { name: 'meta_generator', confidence: 'high' },
  { name: 'readme_file', confidence: 'high' },
  { name: 'script_versions', confidence: 'medium' },
];
```

### Confidence Levels

- **high**: 15-20 points
- **medium**: 8-12 points
- **low**: 3-5 points

Total score determines overall confidence (max 100).

## API Reference

### WordPressAnalyzer

Main class for site analysis.

#### Constructor

```javascript
const analyzer = new WordPressAnalyzer(options);
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 10000 | Request timeout in ms |
| `userAgent` | string | Browser UA | User-Agent string |
| `includePlugins` | boolean | true | Detect plugins |
| `includeTheme` | boolean | true | Detect theme |
| `includeVersion` | boolean | true | Detect WP version |
| `includePerformance` | boolean | false | Include PSI analysis |
| `checkVersions` | boolean | true | Check for outdated |

#### Methods

##### analyzeSite(url, options)

Full site analysis.

```javascript
const results = await analyzer.analyzeSite('https://example.com', {
  format: 'json',
  includePerformance: true
});
```

**Returns:** `Promise<AnalysisResult>`

##### quickDetect(url)

Quick WordPress detection only.

```javascript
const result = await analyzer.quickDetect('https://example.com');
// { url, isWordPress: true/false, confidence, indicators }
```

##### analyzeMultipleSites(urls, options)

Batch analysis with rate limiting.

```javascript
const results = await analyzer.analyzeMultipleSites([
  'site1.com',
  'site2.com'
], { concurrency: 3 });
```

##### generateReport(results)

Generate console report.

```javascript
const report = analyzer.generateReport(results);
console.log(report);
```

##### generateJsonReport(results, options)

Generate JSON report.

```javascript
const json = analyzer.generateJsonReport(results, {
  includeRawData: false
});
```

##### generateHtmlReport(results, options)

Generate HTML report.

```javascript
const html = analyzer.generateHtmlReport(results, {
  includeStyles: true
});
```

##### generatePdfReport(results, options)

Generate PDF report.

```javascript
const pdfBuffer = await analyzer.generatePdfReport(results, {
  format: 'A4',
  landscape: false
});
```

### Detectors

#### EnhancedWordPressDetector

```javascript
const { EnhancedWordPressDetector } = require('./src/detectors/enhanced-wordpress-detector');
const detector = new EnhancedWordPressDetector(httpClient);

const result = await detector.detect(baseUrl, $, html);
// { detected: boolean, confidence: string, score: number, indicators: [] }
```

#### EnhancedVersionDetector

```javascript
const { EnhancedVersionDetector } = require('./src/detectors/enhanced-version-detector');
const detector = new EnhancedVersionDetector(httpClient);

const result = await detector.detectBestVersion(baseUrl, $, html);
// { detected: boolean, version: string, method: string, confidence: string }
```

#### PluginDetector

```javascript
const { PluginDetector } = require('./src/detectors/plugin-detector');
const detector = new PluginDetector(httpClient, wordpressApi);

const plugins = await detector.detect(baseUrl, $, html);
// Array of plugin objects
```

### Integrations

#### WordPress.org API

```javascript
const { WordPressOrgAPI } = require('./src/integrations/wordpress-org');
const api = new WordPressOrgAPI();

const pluginInfo = await api.getPluginInfo('contact-form-7');
// { name, slug, version, author, rating, downloads, etc. }

const multipleInfo = await api.getMultiplePluginsInfo(['cf7', 'yoast']);
```

#### PageSpeed Insights

```javascript
const { PageSpeedInsights } = require('./src/integrations/pagespeed');
const psi = new PageSpeedInsights();

const results = await psi.fetchBoth(url, apiKey);
// { mobile: {...}, desktop: {...} }

const mobileOnly = await psi.fetch(url, 'mobile', apiKey);
```

### Reporters

#### Creating Custom Reporter

```javascript
class CustomReporter {
  generate(results, options = {}) {
    const { meta, wordpress, version, theme, plugins } = results;

    // Build your custom output
    return customOutput;
  }
}
```

## Extending the Analyzer

### Adding New Detection Method

1. Add method to appropriate detector class:

```javascript
// In enhanced-wordpress-detector.js
async detectFromNewMethod($, html) {
  // Your detection logic
  const found = /* detection logic */;

  if (found) {
    return {
      type: 'new_method',
      description: 'Detected via new method',
      confidence: 'medium'
    };
  }
  return null;
}
```

2. Call from main detect method:

```javascript
async detect(baseUrl, $, html) {
  const indicators = [];

  // Existing methods...

  // Add new method
  const newMethodResult = await this.detectFromNewMethod($, html);
  if (newMethodResult) indicators.push(newMethodResult);

  return this.buildResult(indicators);
}
```

### Adding Plugin Patterns

In `src/config/constants.js`, add to `PLUGIN_PATTERNS`:

```javascript
{
  name: 'my-plugin',
  displayName: 'My Plugin',
  patterns: [
    '/wp-content/plugins/my-plugin/',
    'my-plugin-script.js'
  ],
  selectors: ['.my-plugin-class'],
  variables: ['myPluginVar']
}
```

### Adding New Reporter

1. Create reporter class:

```javascript
// src/reporters/xml-reporter.js
class XmlReporter {
  generate(results, options = {}) {
    // Convert results to XML
    return xmlString;
  }
}

module.exports = { XmlReporter };
```

2. Add to WordPressAnalyzer:

```javascript
const { XmlReporter } = require('./reporters/xml-reporter');

class WordPressAnalyzer {
  constructor(options) {
    // ...
    this.xmlReporter = new XmlReporter();
  }

  generateXmlReport(results, options) {
    return this.xmlReporter.generate(results, options);
  }
}
```

## Testing

### Running Tests

```bash
# API tests
npm run test-api

# PDF tests
npm run test-pdf

# Email tests
npm run test-email
```

### Writing Tests

Current tests use custom Node.js scripts. Example:

```javascript
// tests/unit/detector.test.js
const assert = require('assert');
const { EnhancedWordPressDetector } = require('../../src/detectors/enhanced-wordpress-detector');

async function testMetaGeneratorDetection() {
  const html = '<meta name="generator" content="WordPress 6.4.1">';
  const $ = require('cheerio').load(html);

  const detector = new EnhancedWordPressDetector(mockHttpClient);
  const result = detector.detectFromMetaGenerator($);

  assert(result !== null, 'Should detect meta generator');
  assert(result.confidence === 'high', 'Should have high confidence');

  console.log('✓ Meta generator detection test passed');
}

testMetaGeneratorDetection().catch(console.error);
```

### Test Structure

```
tests/
├── api/
│   └── test-api-endpoints.js
├── pdf/
│   └── test-pdf-generation.js
├── email/
│   └── test-email-functionality.js
├── unit/           # To be added
├── integration/    # To be added
└── e2e/           # To be added
```

## Error Handling

### Error Types

```javascript
class AnalyzerError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Usage
throw new AnalyzerError('Failed to fetch page', 'NETWORK_ERROR', {
  url: url,
  statusCode: 500
});
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_URL` | URL format invalid |
| `NETWORK_ERROR` | Network request failed |
| `TIMEOUT` | Request timed out |
| `NOT_WORDPRESS` | Not a WordPress site |
| `PSI_ERROR` | PageSpeed API error |
| `EMAIL_ERROR` | Email sending failed |
| `PDF_ERROR` | PDF generation failed |

## Performance Optimization

### Parallel Execution

Use `Promise.all` for independent operations:

```javascript
const [versionResult, themeResult, pluginResult] = await Promise.all([
  this.versionDetector.detect(url, $, html),
  this.themeDetector.detect(url, $),
  this.pluginDetector.detect(url, $, html)
]);
```

### HTTP Range Requests

For large files, use range requests:

```javascript
const httpRange = new HttpRangeClient();
const header = await httpRange.fetchHead(assetUrl, 1024);
// Only fetches first 1KB
```

### Caching

WordPress.org API responses are cached:

```javascript
// In wordpress-org.js
this.cache = new Map();
this.cacheTTL = 300000; // 5 minutes
```

## Debugging

### Enable Debug Logging

```bash
DEBUG=* node cli.js example.com
```

### Progress Logging

The analyzer logs progress to console:

```javascript
console.log('🔍 Starting WordPress detection...');
console.log('✅ WordPress detected with high confidence');
```

### Verbose Mode

For API debugging:

```javascript
const analyzer = new WordPressAnalyzer({
  verbose: true
});
```

## Contributing

### Code Style

- Use async/await (not callbacks)
- Use ES6+ features
- Use meaningful variable names
- Add JSDoc comments for public methods

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/my-feature`)
3. Make changes with tests
4. Run existing tests
5. Submit pull request

### Commit Messages

Use conventional commits:

```
feat: add new detection method for Gutenberg blocks
fix: resolve timeout issue with large sites
docs: update API documentation
test: add unit tests for version detector
```
