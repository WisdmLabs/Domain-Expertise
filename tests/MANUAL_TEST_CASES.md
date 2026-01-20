# Manual Test Cases

**Project:** WordPress Site Analyzer v2.0.0
**Generated:** 2026-01-20

## Overview

This document contains manual test scenarios for functionality that requires human verification or real-world site testing.

## Test Environment Setup

### Prerequisites

1. Node.js 14+ installed
2. Project dependencies installed (`npm install`)
3. Environment variables configured (`.env` file)
4. For email tests: Valid SMTP credentials
5. For PSI tests: Google PageSpeed API key

### Test Sites

| Site | Purpose | Expected Results |
|------|---------|------------------|
| wordpress.org | Official WP site | High confidence detection |
| developer.wordpress.org | WP developer docs | WP detected |
| github.com | Non-WordPress | Not detected |
| woocommerce.com | WooCommerce | Multiple plugins detected |

---

## CLI Test Cases

### TC-CLI-001: Basic Analysis

**Objective:** Verify basic CLI analysis works correctly

**Steps:**
1. Open terminal
2. Navigate to project directory
3. Run: `node cli.js wordpress.org`

**Expected Results:**
- [ ] Analysis completes without errors
- [ ] WordPress detected with high confidence
- [ ] Version displayed
- [ ] Theme detected
- [ ] Plugins listed

**Actual Results:** _______________

---

### TC-CLI-002: HTML Report Generation

**Objective:** Verify HTML report is generated correctly

**Steps:**
1. Run: `node cli.js wordpress.org --html`

**Expected Results:**
- [ ] HTML file created in `reports/` directory
- [ ] File opens in browser correctly
- [ ] All sections present (WP, version, theme, plugins)
- [ ] Styling applied correctly
- [ ] No JavaScript errors in console

**Actual Results:** _______________

---

### TC-CLI-003: JSON Report Generation

**Objective:** Verify JSON report is valid and complete

**Steps:**
1. Run: `node cli.js wordpress.org --json`
2. Copy output
3. Validate JSON at jsonlint.com

**Expected Results:**
- [ ] Valid JSON output
- [ ] Contains meta section
- [ ] Contains wordpress section
- [ ] Contains version section
- [ ] Contains theme section
- [ ] Contains plugins section

**Actual Results:** _______________

---

### TC-CLI-004: Custom Output File

**Objective:** Verify custom output path works

**Steps:**
1. Run: `node cli.js wordpress.org --output /tmp/my-report.html`
2. Check file exists at specified path

**Expected Results:**
- [ ] File created at specified path
- [ ] File contains valid HTML report
- [ ] No file in default reports/ directory

**Actual Results:** _______________

---

### TC-CLI-005: Invalid URL Handling

**Objective:** Verify graceful handling of invalid URLs

**Steps:**
1. Run: `node cli.js not-a-valid-url`
2. Run: `node cli.js http://does-not-exist-12345.com`

**Expected Results:**
- [ ] Clear error message displayed
- [ ] No crash or stack trace
- [ ] Exit code is non-zero

**Actual Results:** _______________

---

### TC-CLI-006: Non-WordPress Site

**Objective:** Verify correct detection of non-WordPress sites

**Steps:**
1. Run: `node cli.js github.com`

**Expected Results:**
- [ ] Site analyzed without error
- [ ] WordPress: Not detected
- [ ] Clear indication site is not WordPress

**Actual Results:** _______________

---

## Web Server Test Cases

### TC-WEB-001: Server Startup

**Objective:** Verify web server starts correctly

**Steps:**
1. Run: `npm run web`
2. Open browser to http://localhost:3000

**Expected Results:**
- [ ] Server starts without errors
- [ ] Console shows "Server running on port 3000"
- [ ] Web interface loads in browser
- [ ] No JavaScript console errors

**Actual Results:** _______________

---

### TC-WEB-002: Web UI Analysis

**Objective:** Verify web interface analysis works

**Steps:**
1. Start server (`npm run web`)
2. Open http://localhost:3000
3. Enter "wordpress.org" in URL field
4. Click "Analyze" button
5. Wait for results

**Expected Results:**
- [ ] Loading indicator shown during analysis
- [ ] Results displayed after completion
- [ ] WordPress detection shown
- [ ] Version displayed
- [ ] Theme displayed
- [ ] Plugin list displayed
- [ ] No UI errors

**Actual Results:** _______________

---

### TC-WEB-003: PDF Download

**Objective:** Verify PDF download from web UI

**Steps:**
1. Start server and perform analysis (TC-WEB-002)
2. Click "Download PDF" button
3. Open downloaded file

**Expected Results:**
- [ ] PDF downloads without error
- [ ] PDF opens correctly
- [ ] Contains all analysis data
- [ ] Proper formatting and styling
- [ ] Header and footer present

**Actual Results:** _______________

---

## API Test Cases

### TC-API-001: Health Check

**Objective:** Verify health endpoint works

**Steps:**
1. Start server
2. Run: `curl http://localhost:3000/api/health`

**Expected Results:**
- [ ] Returns JSON response
- [ ] Status is "healthy"
- [ ] Contains timestamp

**Actual Results:** _______________

---

### TC-API-002: Analyze Endpoint

**Objective:** Verify analyze API endpoint

**Steps:**
1. Start server
2. Run:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "wordpress.org"}'
```

**Expected Results:**
- [ ] Returns 200 status
- [ ] Returns JSON response
- [ ] Contains meta section
- [ ] Contains wordpress section
- [ ] Contains plugins section

**Actual Results:** _______________

---

### TC-API-003: PDF Endpoint

**Objective:** Verify PDF generation endpoint

**Steps:**
1. Start server
2. Run:
```bash
curl -X POST http://localhost:3000/api/analyze/pdf \
  -H "Content-Type: application/json" \
  -d '{"url": "wordpress.org"}' \
  --output test-report.pdf
```
3. Open test-report.pdf

**Expected Results:**
- [ ] Returns 200 status
- [ ] File is valid PDF
- [ ] Contains analysis data
- [ ] Proper formatting

**Actual Results:** _______________

---

### TC-API-004: Email Endpoint

**Objective:** Verify email sending endpoint

**Prerequisites:**
- SMTP configured in `.env`

**Steps:**
1. Start server
2. Run:
```bash
curl -X POST http://localhost:3000/api/analyze/email \
  -H "Content-Type: application/json" \
  -d '{"url": "wordpress.org", "email": "your-email@example.com"}'
```
3. Check email inbox

**Expected Results:**
- [ ] Returns success message
- [ ] Email received
- [ ] Email contains HTML summary
- [ ] PDF attachment included
- [ ] Attachment opens correctly

**Actual Results:** _______________

---

### TC-API-005: Invalid Request Handling

**Objective:** Verify API handles invalid requests

**Steps:**
1. Run without URL:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{}'
```

2. Run with invalid JSON:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d 'not-json'
```

**Expected Results:**
- [ ] Returns 400 status
- [ ] Returns error message
- [ ] Server doesn't crash

**Actual Results:** _______________

---

## Plugin Detection Test Cases

### TC-PLG-001: Elementor Detection

**Objective:** Verify Elementor plugin detection

**Test Site:** A site known to use Elementor

**Steps:**
1. Run: `node cli.js [elementor-site-url]`

**Expected Results:**
- [ ] Elementor detected in plugin list
- [ ] Version detected (if visible)
- [ ] Confidence is medium or high

**Actual Results:** _______________

---

### TC-PLG-002: WooCommerce Detection

**Objective:** Verify WooCommerce detection

**Test Site:** woocommerce.com or a WooCommerce store

**Steps:**
1. Run: `node cli.js woocommerce.com`

**Expected Results:**
- [ ] WooCommerce detected
- [ ] Related plugins detected
- [ ] Version information if available

**Actual Results:** _______________

---

### TC-PLG-003: Contact Form 7 Detection

**Objective:** Verify CF7 detection

**Test Site:** A site with Contact Form 7

**Steps:**
1. Run analysis on test site

**Expected Results:**
- [ ] Contact Form 7 detected
- [ ] Plugin name displayed correctly

**Actual Results:** _______________

---

### TC-PLG-004: Yoast SEO Detection

**Objective:** Verify Yoast SEO detection

**Test Site:** A site with Yoast SEO

**Steps:**
1. Run analysis on test site
2. View page source for Yoast comments

**Expected Results:**
- [ ] Yoast SEO detected
- [ ] Detection method appropriate

**Actual Results:** _______________

---

## Performance Test Cases

### TC-PERF-001: PageSpeed Integration

**Prerequisites:**
- PSI_API_KEY configured

**Objective:** Verify PageSpeed Insights integration

**Steps:**
1. Run: `node cli.js wordpress.org --performance`

**Expected Results:**
- [ ] Performance data included
- [ ] Mobile score displayed
- [ ] Desktop score displayed
- [ ] Core Web Vitals shown (LCP, CLS, INP)
- [ ] Recommendations included

**Actual Results:** _______________

---

### TC-PERF-002: Analysis Time

**Objective:** Verify analysis completes in reasonable time

**Steps:**
1. Time the analysis: `time node cli.js wordpress.org`

**Expected Results:**
- [ ] Completes in under 30 seconds
- [ ] Without performance: under 15 seconds

**Actual Results:** _______________

---

## Edge Case Test Cases

### TC-EDGE-001: Very Large Plugin List

**Test Site:** A site with 20+ detectable plugins

**Objective:** Verify handling of many plugins

**Steps:**
1. Run analysis on plugin-heavy site

**Expected Results:**
- [ ] All plugins detected
- [ ] No timeout
- [ ] Report generated correctly

**Actual Results:** _______________

---

### TC-EDGE-002: Slow Loading Site

**Objective:** Verify handling of slow sites

**Steps:**
1. Run analysis on a slow-loading site

**Expected Results:**
- [ ] Analysis completes or times out gracefully
- [ ] Clear error if timeout occurs
- [ ] No crash

**Actual Results:** _______________

---

### TC-EDGE-003: Site with Security Plugin

**Objective:** Verify detection when security plugins hide info

**Test Site:** A site with Wordfence or similar

**Steps:**
1. Run analysis

**Expected Results:**
- [ ] Best effort detection
- [ ] May have lower confidence
- [ ] No false positives

**Actual Results:** _______________

---

### TC-EDGE-004: Child Theme Detection

**Objective:** Verify child theme detection

**Test Site:** A site with a child theme

**Steps:**
1. Run analysis

**Expected Results:**
- [ ] Child theme detected
- [ ] Parent theme identified if possible

**Actual Results:** _______________

---

## Email Test Cases

### TC-EML-001: Test Email Connection

**Prerequisites:**
- SMTP configured

**Steps:**
1. Start server
2. Run:
```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

**Expected Results:**
- [ ] Returns success message
- [ ] Test email received
- [ ] Email content is correct

**Actual Results:** _______________

---

### TC-EML-002: Email Configuration Check

**Steps:**
1. Run: `curl http://localhost:3000/api/email/config`

**Expected Results:**
- [ ] Returns configuration status
- [ ] Shows host, port (not credentials)
- [ ] Indicates if configured or not

**Actual Results:** _______________

---

## Security Test Cases

### TC-SEC-001: URL Injection Prevention

**Objective:** Verify no URL injection vulnerabilities

**Steps:**
1. Test with malicious URLs:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -d '{"url": "javascript:alert(1)"}'

curl -X POST http://localhost:3000/api/analyze \
  -d '{"url": "file:///etc/passwd"}'
```

**Expected Results:**
- [ ] Returns error for invalid URLs
- [ ] No code execution
- [ ] No file access

**Actual Results:** _______________

---

### TC-SEC-002: Email Header Injection

**Objective:** Verify no email header injection

**Steps:**
1. Test with malicious email:
```bash
curl -X POST http://localhost:3000/api/analyze/email \
  -d '{"url": "wordpress.org", "email": "test@example.com\nBcc: spam@evil.com"}'
```

**Expected Results:**
- [ ] Returns error for invalid email
- [ ] No email sent to injected address

**Actual Results:** _______________

---

## Test Results Summary

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| CLI | 6 | | | |
| Web Server | 3 | | | |
| API | 5 | | | |
| Plugin Detection | 4 | | | |
| Performance | 2 | | | |
| Edge Cases | 4 | | | |
| Email | 2 | | | |
| Security | 2 | | | |
| **Total** | **28** | | | |

**Tester:** _______________
**Date:** _______________
**Version Tested:** _______________
