# Recovered Specification: WordPress Site Analyzer

**Version:** 2.0.0
**Generated:** 2026-01-20
**Source:** Code analysis

## 1. Overview

### 1.1 Purpose

WordPress Site Analyzer is a non-invasive reconnaissance tool that analyzes WordPress websites to detect:
- Whether a site is running WordPress
- WordPress core version
- Active theme and version
- Installed plugins and versions
- Performance metrics and recommendations

### 1.2 Scope

The tool operates entirely from public-facing information without requiring admin access. It is designed for:
- Security auditing
- Competitive analysis
- Migration planning
- Compliance checking
- Development research

## 2. Functional Requirements

### 2.1 WordPress Detection

#### FR-WP-001: CMS Detection
**Priority:** High

The system shall detect whether a website is running WordPress using multiple detection methods:

| ID | Method | Confidence |
|----|--------|------------|
| FR-WP-001.1 | Meta generator tags | High |
| FR-WP-001.2 | HTML structure analysis (wp-content paths) | High |
| FR-WP-001.3 | Asset path analysis (scripts/stylesheets) | High |
| FR-WP-001.4 | JavaScript variable detection (wpApiSettings) | High |
| FR-WP-001.5 | CSS class/ID analysis (wp-* classes) | Medium |
| FR-WP-001.6 | HTML comment analysis | Medium |
| FR-WP-001.7 | REST API endpoint detection (/wp-json/) | High |
| FR-WP-001.8 | WordPress file detection (wp-login.php) | High |
| FR-WP-001.9 | HTTP header analysis (X-Powered-By) | High |
| FR-WP-001.10 | Sitemap analysis | Medium |
| FR-WP-001.11 | Robots.txt analysis | Medium |
| FR-WP-001.12 | Feed endpoint detection (/feed/) | Medium |
| FR-WP-001.13 | Admin endpoint detection (/wp-admin/) | High |
| FR-WP-001.14 | Plugin/theme directory detection | High |
| FR-WP-001.15 | Inline script analysis | Medium |

**Acceptance Criteria:**
- Detection shall return a boolean `isWordPress` result
- Detection shall return a confidence score (0-100)
- Detection shall list all indicators found
- False positive rate shall be < 5%

#### FR-WP-002: Confidence Calculation
**Priority:** High

The system shall calculate an overall confidence score based on:
- Number of indicators found
- Weight of each indicator type
- Presence of high-confidence indicators

**Calculation:**
- High confidence indicators: 15-20 points each
- Medium confidence indicators: 8-12 points each
- Low confidence indicators: 3-5 points each
- Maximum score: 100

### 2.2 Version Detection

#### FR-VER-001: WordPress Version Detection
**Priority:** High

The system shall detect WordPress core version using multiple methods:

| ID | Method | Confidence |
|----|--------|------------|
| FR-VER-001.1 | Meta generator tag | High |
| FR-VER-001.2 | WordPress core files (version.php) | High |
| FR-VER-001.3 | REST API endpoints | High |
| FR-VER-001.4 | README.html file | High |
| FR-VER-001.5 | OPML file (/wp-links-opml.php) | Medium |
| FR-VER-001.6 | RSS feed analysis | Medium |
| FR-VER-001.7 | WordPress HTML comments | Medium |

**Acceptance Criteria:**
- Version shall match pattern: `X.Y.Z` or `X.Y`
- System shall validate detected versions against known WP patterns
- System shall not return plugin/theme versions as WP version

#### FR-VER-002: Version Validation
**Priority:** Medium

The system shall validate detected versions:
- Match WordPress version format (e.g., 6.4.1)
- Reject versions that match plugin patterns
- Reject versions outside reasonable WordPress range (1.0 - 10.0)

### 2.3 Theme Detection

#### FR-THEME-001: Active Theme Detection
**Priority:** High

The system shall detect the active theme:

| ID | Method | Output |
|----|--------|--------|
| FR-THEME-001.1 | CSS stylesheet analysis | Theme name, path |
| FR-THEME-001.2 | style.css parsing | Name, version, author, URI |
| FR-THEME-001.3 | Body class examination | Theme slug |
| FR-THEME-001.4 | Asset path scanning | Theme directory |
| FR-THEME-001.5 | Template hints in HTML | Parent/child theme |

**Output:**
```json
{
  "detected": true,
  "name": "theme-slug",
  "displayName": "Theme Display Name",
  "version": "1.0.0",
  "author": "Theme Author",
  "authorUri": "https://author.com",
  "path": "/wp-content/themes/theme-slug/",
  "isChild": false,
  "parent": null
}
```

### 2.4 Plugin Detection

#### FR-PLUGIN-001: Plugin Discovery
**Priority:** High

The system shall detect installed plugins using:

| ID | Method | Confidence |
|----|--------|------------|
| FR-PLUGIN-001.1 | Asset path scanning | High |
| FR-PLUGIN-001.2 | HTTP range requests for headers | High |
| FR-PLUGIN-001.3 | Source map analysis | High |
| FR-PLUGIN-001.4 | REST API endpoint patterns | High |
| FR-PLUGIN-001.5 | JavaScript variable detection | High |
| FR-PLUGIN-001.6 | CSS class/ID patterns | Medium |
| FR-PLUGIN-001.7 | Meta tag analysis | Medium |
| FR-PLUGIN-001.8 | HTML comment analysis | Medium |
| FR-PLUGIN-001.9 | Content pattern matching | Medium |
| FR-PLUGIN-001.10 | Plugin header parsing | High |

**Supported Plugin Categories:**
- SEO (Yoast, Rank Math)
- Page Builders (Elementor, WPBakery)
- E-commerce (WooCommerce)
- Forms (Contact Form 7, WPForms, Gravity Forms)
- Caching (WP Rocket, W3 Total Cache, LiteSpeed)
- Security (Wordfence, Jetpack, Akismet)
- Optimization (Autoptimize, Smush)
- Sliders (Slider Revolution, LayerSlider)
- Fields (ACF)

#### FR-PLUGIN-002: Plugin Version Detection
**Priority:** High

The system shall detect plugin versions:
- From asset file headers (using HTTP range requests)
- From readme.txt files
- From source map comments
- From script/style version parameters

#### FR-PLUGIN-003: Outdated Plugin Detection
**Priority:** High

The system shall:
- Query WordPress.org API for latest versions
- Compare detected version with latest version
- Flag plugins as outdated if version differs

**Output:**
```json
{
  "name": "plugin-slug",
  "version": "5.8.4",
  "latestVersion": "5.8.6",
  "isOutdated": true,
  "author": "Plugin Author",
  "confidence": "high"
}
```

### 2.5 Performance Analysis

#### FR-PERF-001: PageSpeed Integration
**Priority:** Medium

The system shall integrate with Google PageSpeed Insights API:
- Fetch mobile and desktop scores
- Extract Core Web Vitals (LCP, CLS, INP)
- Identify performance opportunities
- Extract accessibility scores
- Extract SEO scores
- Extract best practices scores

**Metrics Extracted:**
- Performance Score (0-100)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Interaction to Next Paint (INP)
- First Contentful Paint (FCP)
- Time to First Byte (TTFB)
- Speed Index

#### FR-PERF-002: Plugin Performance Impact
**Priority:** Medium

The system shall analyze:
- Number of scripts per plugin
- Number of stylesheets per plugin
- File sizes
- Blocking resources
- Estimated performance impact

### 2.6 Recommendations

#### FR-REC-001: Plugin Recommendations
**Priority:** Medium

The system shall generate plugin recommendations based on:
- Detected functionality gaps
- Outdated plugins (suggest updates)
- Performance issues (suggest alternatives)
- Security concerns (suggest replacements)

#### FR-REC-002: Performance Recommendations
**Priority:** Medium

The system shall generate performance recommendations:
- Caching recommendations
- Image optimization recommendations
- Minification recommendations
- Lazy loading recommendations
- CDN recommendations

#### FR-REC-003: Implementation Priority
**Priority:** Low

Recommendations shall include:
- Priority level (critical, high, medium, low)
- Estimated effort (hours)
- Expected impact (improvement percentage)

### 2.7 Reporting

#### FR-REP-001: Console Report
**Priority:** High

The system shall generate formatted console output with:
- WordPress detection status
- Version information
- Theme details
- Plugin list with outdated status
- Performance summary

#### FR-REP-002: JSON Report
**Priority:** High

The system shall generate structured JSON output:
- Complete analysis data
- Metadata (timestamp, duration, analyzer version)
- All detection results
- Performance metrics
- Recommendations

#### FR-REP-003: HTML Report
**Priority:** High

The system shall generate HTML reports:
- Professional styling
- Interactive sections
- Plugin status table
- Performance charts
- Responsive design
- Print-friendly

#### FR-REP-004: PDF Report
**Priority:** High

The system shall generate PDF reports:
- Standard format (A4)
- Print-optimized format
- Landscape format
- Custom filename support
- Header with branding
- Footer with page numbers

### 2.8 Email Delivery

#### FR-EMAIL-001: Email Reports
**Priority:** Medium

The system shall send analysis reports via email:
- PDF attachment
- HTML email body
- Summary statistics
- Critical issues highlight
- Branding (WisdmLabs)

#### FR-EMAIL-002: Email Configuration
**Priority:** Medium

The system shall support SMTP configuration:
- Host, port, user, password
- Secure connection (TLS)
- Custom from address

### 2.9 API Endpoints

#### FR-API-001: Analyze Endpoint
**Priority:** High

`POST /api/analyze`

**Request:**
```json
{
  "url": "https://example.com",
  "format": "json|html",
  "includePerformance": true
}
```

**Response:**
```json
{
  "meta": {...},
  "wordpress": {...},
  "version": {...},
  "theme": {...},
  "plugins": {...},
  "performance": {...},
  "recommendations": {...}
}
```

#### FR-API-002: PDF Endpoint
**Priority:** High

`POST /api/analyze/pdf`

**Request:**
```json
{
  "url": "https://example.com",
  "format": "standard|print|landscape",
  "filename": "custom-report.pdf"
}
```

**Response:** Binary PDF data

#### FR-API-003: Email Endpoint
**Priority:** Medium

`POST /api/analyze/email`

**Request:**
```json
{
  "url": "https://example.com",
  "email": "recipient@example.com",
  "format": "standard|print"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

#### FR-API-004: Health Endpoint
**Priority:** High

`GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00Z"
}
```

### 2.10 CLI Interface

#### FR-CLI-001: Command Line Usage
**Priority:** High

```bash
# Basic usage
node cli.js example.com

# With HTML output
node cli.js example.com --html

# With JSON output
node cli.js example.com --json

# Custom output file
node cli.js example.com --output report.html

# With performance analysis
node cli.js example.com --performance
```

#### FR-CLI-002: CLI Options
**Priority:** Medium

| Option | Description |
|--------|-------------|
| `--html` | Generate HTML report |
| `--json` | Generate JSON report |
| `--output <file>` | Save to specific file |
| `--performance` | Include performance analysis |
| `--help` | Show help |

## 3. Non-Functional Requirements

### 3.1 Performance

#### NFR-PERF-001: Response Time
- Basic analysis: < 10 seconds
- With performance: < 30 seconds
- PDF generation: < 15 seconds

#### NFR-PERF-002: Concurrent Requests
- API shall handle 10 concurrent requests
- Rate limiting shall be implemented

### 3.2 Reliability

#### NFR-REL-001: Error Handling
- All network errors shall be caught and reported
- Timeout errors shall not crash the application
- Invalid URLs shall return meaningful errors

#### NFR-REL-002: Retry Logic
- HTTP requests shall retry up to 3 times
- PageSpeed API shall retry with exponential backoff

### 3.3 Security

#### NFR-SEC-001: Ethical Use
- Only access publicly available information
- Respect robots.txt where applicable
- Use standard browser user agents
- Include delays between requests

#### NFR-SEC-002: API Security
- No sensitive data logging
- Environment variables for credentials
- No credential exposure in responses

### 3.4 Compatibility

#### NFR-COMP-001: Node.js Version
- Minimum: Node.js 14.0.0
- Recommended: Node.js 18+

#### NFR-COMP-002: Browser Compatibility (Web UI)
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## 4. Data Models

### 4.1 Analysis Result

```typescript
interface AnalysisResult {
  meta: {
    url: string;
    analyzedAt: string;
    duration: number;
    analyzer: {
      name: string;
      version: string;
    }
  };
  wordpress: {
    detected: boolean;
    confidence: string;
    score: number;
    indicators: Indicator[];
  };
  version: {
    detected: boolean;
    version: string;
    method: string;
    confidence: string;
  };
  theme: {
    detected: boolean;
    name: string;
    displayName: string;
    version: string;
    author: string;
    path: string;
  };
  plugins: {
    statistics: {
      total: number;
      outdated: number;
      upToDate: number;
    };
    list: Plugin[];
  };
  performance?: PerformanceData;
  recommendations?: RecommendationData;
}
```

### 4.2 Plugin

```typescript
interface Plugin {
  name: string;
  displayName: string;
  version: string;
  latestVersion?: string;
  isOutdated?: boolean;
  confidence: string;
  category?: string;
  author?: string;
  authorUri?: string;
}
```

### 4.3 Performance Data

```typescript
interface PerformanceData {
  mobile: {
    score: number;
    coreWebVitals: {
      lcp: number;
      cls: number;
      inp: number;
    }
  };
  desktop: {
    score: number;
    coreWebVitals: {
      lcp: number;
      cls: number;
      inp: number;
    }
  };
  opportunities: Opportunity[];
  diagnostics: Diagnostic[];
}
```

## 5. Error Handling

### 5.1 Error Codes

| Code | Description |
|------|-------------|
| `INVALID_URL` | URL format is invalid |
| `NETWORK_ERROR` | Network request failed |
| `TIMEOUT` | Request timed out |
| `NOT_WORDPRESS` | Site is not WordPress |
| `PSI_ERROR` | PageSpeed API error |
| `EMAIL_ERROR` | Email sending failed |
| `PDF_ERROR` | PDF generation failed |

### 5.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "NETWORK_ERROR",
    "message": "Failed to connect to example.com",
    "details": "ECONNREFUSED"
  }
}
```

## 6. Rate Limiting

### 6.1 WordPress.org API
- Maximum 100 requests per minute
- Queue-based request handling
- Automatic throttling

### 6.2 PageSpeed Insights API
- Requires API key for higher limits
- Default: 5 requests per minute
- With key: 400 requests per 100 seconds

## 7. Logging

### 7.1 Log Levels
- `error`: Errors that require attention
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug information

### 7.2 Progress Logging
- WordPress detection progress
- Version detection progress
- Plugin detection progress
- Performance analysis progress
