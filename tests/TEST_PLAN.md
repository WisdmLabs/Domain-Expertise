# Test Plan

**Project:** WordPress Site Analyzer v2.0.0
**Generated:** 2026-01-20
**Test Framework:** Jest (recommended)

## Overview

This test plan defines the testing strategy for WordPress Site Analyzer, covering unit tests, integration tests, and end-to-end tests.

## Test Strategy

### Test Levels

| Level | Scope | Framework | Coverage Target |
|-------|-------|-----------|-----------------|
| Unit | Individual functions/methods | Jest | 80% |
| Integration | Module interactions | Jest | 70% |
| E2E | Full workflows | Playwright | 60% |
| Manual | Edge cases, UI | Manual | As needed |

### Test Categories

1. **Functional Tests** - Core functionality works correctly
2. **Security Tests** - Input validation, sanitization
3. **Performance Tests** - Response times, resource usage
4. **Error Handling Tests** - Error cases handled gracefully
5. **Edge Case Tests** - Boundary conditions

## Unit Test Scope

### Detectors

#### EnhancedWordPressDetector

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| WPD-001 | Detect from meta generator tag | High |
| WPD-002 | Detect from wp-content paths | High |
| WPD-003 | Detect from wp-includes paths | High |
| WPD-004 | Detect from body CSS classes | Medium |
| WPD-005 | Detect from JavaScript variables | Medium |
| WPD-006 | Detect from REST API | High |
| WPD-007 | Detect from admin-ajax endpoint | Medium |
| WPD-008 | Calculate confidence score correctly | High |
| WPD-009 | Return false for non-WordPress site | High |
| WPD-010 | Handle missing HTML gracefully | Medium |

#### EnhancedVersionDetector

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| VER-001 | Detect version from meta generator | High |
| VER-002 | Detect version from readme.html | High |
| VER-003 | Detect version from script ver params | Medium |
| VER-004 | Validate version format correctly | High |
| VER-005 | Reject plugin versions as WP version | High |
| VER-006 | Handle missing version gracefully | Medium |
| VER-007 | Select highest confidence version | High |

#### ThemeDetector

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| THM-001 | Detect theme from stylesheet link | High |
| THM-002 | Parse theme name from style.css | High |
| THM-003 | Extract theme version | Medium |
| THM-004 | Extract theme author | Medium |
| THM-005 | Detect child theme | Medium |
| THM-006 | Detect parent theme | Medium |
| THM-007 | Handle missing theme gracefully | Medium |

#### PluginDetector

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| PLG-001 | Detect plugins from asset paths | High |
| PLG-002 | Detect plugins from HTML patterns | Medium |
| PLG-003 | Detect plugins from CSS selectors | Medium |
| PLG-004 | Detect plugins from JS variables | Medium |
| PLG-005 | Extract plugin versions | High |
| PLG-006 | Merge duplicate detections | High |
| PLG-007 | Handle unknown plugins | Medium |
| PLG-008 | Detect Elementor | High |
| PLG-009 | Detect Contact Form 7 | High |
| PLG-010 | Detect WooCommerce | High |
| PLG-011 | Detect Yoast SEO | High |
| PLG-012 | Detect caching plugins | Medium |

### Reporters

#### ConsoleReporter

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| CON-001 | Generate header section | High |
| CON-002 | Generate WordPress section | High |
| CON-003 | Generate plugin list | High |
| CON-004 | Format outdated plugins | High |
| CON-005 | Handle empty results | Medium |

#### JsonReporter

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| JSN-001 | Generate valid JSON | High |
| JSN-002 | Include all sections | High |
| JSN-003 | Include metadata | High |
| JSN-004 | Handle null values | Medium |

#### HtmlReporter

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| HTM-001 | Generate valid HTML | High |
| HTM-002 | Include CSS styles | High |
| HTM-003 | Render plugin table | High |
| HTM-004 | Show performance charts | Medium |

#### PdfReporter

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| PDF-001 | Generate PDF successfully | High |
| PDF-002 | Include header/footer | High |
| PDF-003 | Generate print format | Medium |
| PDF-004 | Generate landscape format | Medium |

### Utilities

#### HttpClient

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| HTTP-001 | Fetch page successfully | High |
| HTTP-002 | Handle timeout | High |
| HTTP-003 | Handle network error | High |
| HTTP-004 | Retry on failure | Medium |
| HTTP-005 | Follow redirects | High |

#### UrlHelper

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| URL-001 | Normalize URL with protocol | High |
| URL-002 | Normalize URL without protocol | High |
| URL-003 | Extract domain correctly | High |
| URL-004 | Resolve relative URLs | High |
| URL-005 | Handle invalid URLs | High |

#### VersionComparator

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| CMP-001 | Compare equal versions | High |
| CMP-002 | Compare newer version | High |
| CMP-003 | Compare older version | High |
| CMP-004 | Handle different length versions | Medium |
| CMP-005 | Handle non-numeric versions | Medium |

### Integrations

#### WordPressOrgAPI

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| WPO-001 | Fetch plugin info | High |
| WPO-002 | Handle unknown plugin | High |
| WPO-003 | Extract plugin slug | High |
| WPO-004 | Batch fetch plugins | Medium |
| WPO-005 | Handle rate limiting | Medium |

#### PageSpeedInsights

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| PSI-001 | Fetch mobile results | High |
| PSI-002 | Fetch desktop results | High |
| PSI-003 | Extract Core Web Vitals | High |
| PSI-004 | Handle API errors | High |
| PSI-005 | Retry on failure | Medium |

### Services

#### EmailService

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| EML-001 | Validate email format | High |
| EML-002 | Generate email content | High |
| EML-003 | Send with attachment | High |
| EML-004 | Handle send failure | High |
| EML-005 | Test connection | Medium |

## Integration Test Scope

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| INT-001 | Full analysis pipeline | High |
| INT-002 | WordPress.org enrichment | High |
| INT-003 | PDF generation with analysis | High |
| INT-004 | Email with PDF attachment | High |
| INT-005 | API endpoint to reporter | High |

## E2E Test Scope

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| E2E-001 | Web UI - Analyze WordPress site | High |
| E2E-002 | Web UI - Download PDF | High |
| E2E-003 | Web UI - Send email | Medium |
| E2E-004 | CLI - Basic analysis | High |
| E2E-005 | CLI - HTML output | High |
| E2E-006 | CLI - JSON output | High |
| E2E-007 | API - POST /api/analyze | High |
| E2E-008 | API - POST /api/analyze/pdf | High |
| E2E-009 | API - POST /api/analyze/email | Medium |
| E2E-010 | API - GET /api/health | High |

## Manual Test Cases

See `MANUAL_TEST_CASES.md` for detailed manual testing scenarios.

## Test Data

### Mock WordPress Sites

| Site | Description |
|------|-------------|
| wordpress.org | Official WordPress site |
| developer.wordpress.org | Developer docs |
| localhost/test-wp | Local test installation |

### Mock HTML Fixtures

```
tests/fixtures/
├── wordpress-site.html      # Full WordPress page
├── non-wordpress-site.html  # Non-WordPress page
├── minimal-wp.html          # Minimal WP indicators
├── heavy-plugins.html       # Many plugins
└── performance-issues.html  # Poor performance
```

## Test Environment

### Requirements

- Node.js 18+
- Jest testing framework
- Playwright for E2E tests
- Mock server for integration tests

### Setup

```bash
# Install test dependencies
npm install --save-dev jest @types/jest playwright

# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

## Coverage Goals

| Category | Target | Minimum |
|----------|--------|---------|
| Detectors | 85% | 75% |
| Reporters | 80% | 70% |
| Utilities | 90% | 80% |
| Integrations | 70% | 60% |
| Services | 75% | 65% |
| **Overall** | **80%** | **70%** |

## Test Execution Schedule

| Phase | Tests | Trigger |
|-------|-------|---------|
| Pre-commit | Unit tests | Git hook |
| PR | Unit + Integration | GitHub Actions |
| Nightly | Full suite + E2E | Scheduled |
| Release | Full suite + Manual | Manual trigger |

## Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| External APIs | Rate limiting, downtime | Mock in tests |
| PDF Generation | Puppeteer issues | Increase timeout, retry |
| Email | SMTP configuration | Skip in CI, manual verify |
| Network | Flaky tests | Retry mechanism |
