# User Guide

**WordPress Site Analyzer v2.0.0**

## Introduction

WordPress Site Analyzer is a powerful tool for analyzing WordPress websites without requiring admin access. It detects WordPress installations, versions, themes, plugins, and provides performance insights.

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wordpress-site-analyzer.git
cd wordpress-site-analyzer

# Install dependencies
npm install
```

### Basic Usage

```bash
# Analyze a site
node cli.js example.com

# With HTML report
node cli.js example.com --html

# With JSON output
node cli.js example.com --json
```

## Command Line Usage

### Syntax

```bash
node cli.js <url> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--html` | Generate HTML report |
| `--json` | Generate JSON report |
| `--output <file>` | Save to specific file |
| `--performance` | Include PageSpeed analysis |
| `--help` | Show help information |

### Examples

```bash
# Basic analysis
node cli.js wordpress.org

# Generate HTML report
node cli.js wordpress.org --html

# Save to custom file
node cli.js wordpress.org --output my-report.html

# Include performance analysis (requires PSI_API_KEY)
node cli.js wordpress.org --performance

# Analyze local development site
node cli.js http://localhost/mysite --html
```

## Web Interface

### Starting the Server

```bash
# Start the web server
npm run web

# Or
node server.js
```

The server starts at `http://localhost:3000` by default.

### Using the Web UI

1. Open `http://localhost:3000` in your browser
2. Enter a WordPress site URL
3. Click "Analyze"
4. View results in the browser
5. Download PDF or send via email

### API Endpoints

#### Analyze Site

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### Generate PDF

```bash
curl -X POST http://localhost:3000/api/analyze/pdf \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  --output report.pdf
```

#### Send via Email

```bash
curl -X POST http://localhost:3000/api/analyze/email \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "email": "client@example.com"}'
```

## Understanding Results

### WordPress Detection

The analyzer uses 15+ methods to detect WordPress:

| Confidence | Description |
|------------|-------------|
| **High** | Multiple strong indicators found (meta tags, REST API) |
| **Medium** | Some indicators found (CSS classes, paths) |
| **Low** | Few weak indicators found |

### Version Detection

WordPress version is detected from:
- Meta generator tag (most reliable)
- README.html file
- Script/stylesheet versions
- REST API responses

### Plugin Detection

Plugins are detected through:
- Script and stylesheet paths
- HTML patterns and comments
- REST API endpoints
- JavaScript variables

**Outdated Check:** Detected versions are compared against WordPress.org to identify outdated plugins.

### Theme Detection

Theme information includes:
- Theme name and slug
- Version number
- Author information
- Parent theme (if child theme)

### Performance Metrics

When enabled, performance analysis includes:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤2.5s | 2.5-4s | >4s |
| CLS (Cumulative Layout Shift) | ≤0.1 | 0.1-0.25 | >0.25 |
| INP (Interaction to Next Paint) | ≤200ms | 200-500ms | >500ms |

## Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Server Configuration
PORT=3000

# PageSpeed Insights API (optional)
PSI_API_KEY=your-google-api-key

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_SECURE=false
```

### PageSpeed Insights Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable PageSpeed Insights API
4. Create API credentials
5. Add key to `.env` file as `PSI_API_KEY`

### Email Setup (Gmail)

1. Enable 2-Factor Authentication on Gmail
2. Generate an App Password:
   - Go to Google Account → Security → App Passwords
   - Generate password for "Mail"
3. Add credentials to `.env` file

## Report Formats

### Console Report

Text-based output shown in terminal:

```
WordPress Site Analysis Report
=====================================
URL: https://example.com
Is WordPress: Yes

WordPress Version:
  Version: 6.4.1
  Confidence: high

Active Theme:
  Name: twentytwentythree
  Version: 1.3

Detected Plugins (3):
  1. contact-form-7 (v5.8.4) [OUTDATED]
  2. yoast-seo (v21.5) [OUTDATED]
  3. elementor (v3.17.3) [UP TO DATE]
```

### HTML Report

Professional HTML document with:
- Styled sections for each analysis area
- Plugin status table with color coding
- Performance charts (if enabled)
- Print-friendly formatting

### JSON Report

Structured data for programmatic use:

```json
{
  "meta": {
    "url": "https://example.com",
    "analyzedAt": "2024-01-20T10:30:00.000Z"
  },
  "wordpress": {
    "detected": true,
    "confidence": "high"
  },
  "plugins": {
    "list": [...]
  }
}
```

### PDF Report

Professional PDF document:
- **Standard**: A4 portrait
- **Print**: Optimized for printing
- **Landscape**: Wide format

## Programmatic Usage

### As a Module

```javascript
const WordPressAnalyzer = require('wordpress-site-analyzer');

async function analyze() {
  const analyzer = new WordPressAnalyzer({
    timeout: 15000,
    includePerformance: true
  });

  const results = await analyzer.analyzeSite('https://example.com');

  console.log('WordPress:', results.wordpress.detected);
  console.log('Version:', results.version.version);
  console.log('Theme:', results.theme.name);
  console.log('Plugins:', results.plugins.list.length);
}

analyze();
```

### Quick Detection

```javascript
const analyzer = new WordPressAnalyzer();
const result = await analyzer.quickDetect('example.com');
console.log(result.isWordPress); // true or false
```

### Multiple Sites

```javascript
const analyzer = new WordPressAnalyzer();
const sites = ['site1.com', 'site2.com', 'site3.com'];
const results = await analyzer.analyzeMultipleSites(sites);

results.forEach(result => {
  console.log(`${result.meta.url}: ${result.wordpress.detected}`);
});
```

## Troubleshooting

### Common Issues

#### "Failed to fetch page"

**Cause:** Network error or site not accessible

**Solutions:**
- Verify URL is correct
- Check if site is accessible in browser
- Site may be blocking automated requests

#### "Not a WordPress site"

**Cause:** No WordPress indicators found

**Solutions:**
- Verify site is actually WordPress
- Site may be heavily customized
- Security plugins may be hiding indicators

#### "PDF generation failed"

**Cause:** Puppeteer/Chrome issues

**Solutions:**
- Run `npm run postinstall` to install Chrome
- Check system has sufficient memory
- Verify Puppeteer installation

#### "Email sending failed"

**Cause:** SMTP configuration issues

**Solutions:**
- Verify SMTP credentials in `.env`
- For Gmail, use App Password not regular password
- Check firewall allows SMTP ports

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* node cli.js example.com
```

## Best Practices

### Rate Limiting

The tool includes built-in delays to be respectful:
- Don't analyze too many sites in quick succession
- WordPress.org API has rate limits (100 req/min)
- PageSpeed Insights has quotas (400 req/100s with key)

### Ethical Use

- Only analyze sites you have permission to analyze
- Don't use for malicious purposes
- Respect robots.txt where applicable

### Accuracy

- Results depend on publicly visible information
- Some plugins may not be detectable
- Cached sites may show outdated information
- Security plugins may hide indicators

## Support

### Getting Help

1. Check the documentation
2. Review [tests/README.md](../tests/README.md) for test instructions
3. Check existing GitHub issues
4. Open a new issue with details

### Reporting Issues

Include:
- Node.js version (`node --version`)
- Operating system
- Error message and stack trace
- URL being analyzed (if not sensitive)
