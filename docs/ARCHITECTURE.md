# Architecture Documentation

**Project:** WordPress Site Analyzer
**Version:** 2.0.0
**Generated:** 2026-01-20

## Overview

WordPress Site Analyzer is a Node.js application that performs non-invasive analysis of WordPress websites. It follows a modular architecture with clear separation of concerns.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│      CLI         │    Web Server    │     Programmatic API             │
│    (cli.js)      │   (server.js)    │      (index.js)                  │
└──────────────────┴──────────────────┴──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATION LAYER                               │
│                                                                          │
│                      WordPressAnalyzer                                   │
│                 (src/wordpress-analyzer.js)                              │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                    Analysis Pipeline                            │    │
│   │  1. Fetch HTML → 2. Detect WP → 3. Detect Version              │    │
│   │  4. Detect Theme → 5. Detect Plugins → 6. Analyze Performance  │    │
│   │  7. Generate Recommendations → 8. Generate Report              │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│    DETECTION     │ │   ANALYSIS   │ │     REPORTING    │
│      LAYER       │ │    LAYER     │ │       LAYER      │
├──────────────────┤ ├──────────────┤ ├──────────────────┤
│ WP Detector      │ │ Performance  │ │ Console Reporter │
│ Version Detector │ │ Analyzer     │ │ JSON Reporter    │
│ Theme Detector   │ │              │ │ HTML Reporter    │
│ Plugin Detector  │ │ Gap Analyzer │ │ PDF Reporter     │
│ Asset Inspector  │ │              │ │                  │
└──────────────────┘ └──────────────┘ └──────────────────┘
            │               │               │
            ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                     │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│   Integrations   │   Recommendations │        Services                  │
├──────────────────┼──────────────────┼──────────────────────────────────┤
│ WordPress.org    │ Plugin Engine    │ Email Service                    │
│ PageSpeed API    │ Performance Eng  │                                  │
│                  │ PSI Engine       │                                  │
└──────────────────┴──────────────────┴──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        UTILITY LAYER                                     │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│   HTTP Client   │  HTTP Range     │   URL Helper    │ Version Compare  │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘
```

## Component Architecture

### Entry Points

#### 1. CLI Interface (`cli.js`)

Command-line interface for direct usage.

```
User Input → Argument Parsing → WordPressAnalyzer → Output
```

**Responsibilities:**
- Parse command-line arguments
- Normalize input URLs
- Select output format
- Write reports to filesystem

#### 2. Web Server (`server.js`)

Express.js server providing REST API.

```
HTTP Request → Route Handler → WordPressAnalyzer → HTTP Response
```

**Responsibilities:**
- Handle HTTP requests
- Input validation
- Response formatting
- Static file serving (web UI)

#### 3. Library API (`index.js`)

Programmatic interface for use as a module.

```javascript
const WordPressAnalyzer = require('wordpress-site-analyzer');
const analyzer = new WordPressAnalyzer(options);
const results = await analyzer.analyzeSite(url);
```

### Core Components

#### WordPressAnalyzer (`src/wordpress-analyzer.js`)

Main orchestrator class that coordinates all analysis operations.

```javascript
class WordPressAnalyzer {
  constructor(options) {
    this.httpClient = new HttpClient(options);
    this.wordpressDetector = new EnhancedWordPressDetector(this.httpClient);
    this.versionDetector = new EnhancedVersionDetector(this.httpClient);
    this.themeDetector = new ThemeDetector(this.httpClient);
    this.pluginDetector = new PluginDetector(this.httpClient);
    // ... other detectors and services
  }

  async analyzeSite(url, options) {
    // 1. Fetch HTML
    // 2. Run all detectors
    // 3. Generate recommendations
    // 4. Return results
  }
}
```

**Design Pattern:** Facade Pattern - provides a simplified interface to complex subsystems.

### Detection Components

#### WordPress Detector

```
┌─────────────────────────────────────────────────────────────┐
│                  EnhancedWordPressDetector                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Meta     │  │    Path     │  │    REST     │         │
│  │  Generator  │  │   Pattern   │  │    API      │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│               ┌──────────────────┐                          │
│               │    Confidence    │                          │
│               │    Calculator    │                          │
│               └──────────────────┘                          │
│                          │                                  │
│                          ▼                                  │
│               ┌──────────────────┐                          │
│               │  Detection Result│                          │
│               │   + Indicators   │                          │
│               └──────────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Design Pattern:** Strategy Pattern - multiple detection methods with unified interface.

#### Plugin Detector

```
┌─────────────────────────────────────────────────────────────┐
│                      PluginDetector                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Detection Methods (Parallel Execution):                     │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Asset   │ │   REST   │ │    JS    │ │   CSS    │       │
│  │ Scanning │ │   API    │ │ Variables│ │ Patterns │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                          │                                  │
│                          ▼                                  │
│               ┌──────────────────┐                          │
│               │     Merge &      │                          │
│               │   Deduplicate    │                          │
│               └──────────────────┘                          │
│                          │                                  │
│                          ▼                                  │
│               ┌──────────────────┐                          │
│               │     Enrich       │                          │
│               │  (WordPress.org) │                          │
│               └──────────────────┘                          │
│                          │                                  │
│                          ▼                                  │
│               ┌──────────────────┐                          │
│               │  Check Outdated  │                          │
│               └──────────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Reporting Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Reporter Factory                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Analysis Results                                           │
│         │                                                    │
│         ├──────────────┬──────────────┬──────────────┐      │
│         ▼              ▼              ▼              ▼      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │  Console   │ │    JSON    │ │    HTML    │ │   PDF    │ │
│  │  Reporter  │ │  Reporter  │ │  Reporter  │ │ Reporter │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│         │              │              │              │      │
│         ▼              ▼              ▼              ▼      │
│      Terminal        JSON          HTML File      PDF File  │
│       Output         Data          (styled)     (Puppeteer) │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Design Pattern:** Factory Pattern - selects appropriate reporter based on format.

### External Integrations

```
┌─────────────────────────────────────────────────────────────┐
│                  External Service Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │    WordPress.org API   │  │   PageSpeed Insights   │    │
│  ├────────────────────────┤  ├────────────────────────┤    │
│  │ Rate Limited Queue     │  │ Retry with Backoff     │    │
│  │ Response Caching       │  │ Mobile + Desktop       │    │
│  │ Batch Requests         │  │ CWV Extraction         │    │
│  └────────────────────────┘  └────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Email Service                        │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ SMTP via Nodemailer                                     │ │
│  │ HTML + Text Emails                                      │ │
│  │ PDF Attachments                                         │ │
│  │ Template Rendering                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Analysis Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   URL    │───▶│  Fetch   │───▶│  Parse   │───▶│  Detect  │
│  Input   │    │   HTML   │    │ (Cheerio)│    │    WP    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                    ┌─────────────────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────────────────────────┐
    │              Parallel Detection Phase                 │
    │                                                       │
    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
    │  │ Version │  │  Theme  │  │ Plugins │  │  Perf   │ │
    │  │ Detect  │  │ Detect  │  │ Detect  │  │ Analyze │ │
    │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
    │                                                       │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
            ┌──────────────┐
            │    Enrich    │
            │ (WP.org API) │
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │  Generate    │
            │Recommendations│
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │   Generate   │
            │    Report    │
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │    Output    │
            └──────────────┘
```

### Request Flow (API)

```
HTTP Request
     │
     ▼
┌────────────────┐
│ Express Router │
└────────────────┘
     │
     ├── POST /api/analyze
     │         │
     │         ▼
     │   ┌────────────────┐
     │   │ Validate URL   │
     │   └────────────────┘
     │         │
     │         ▼
     │   ┌────────────────┐
     │   │WordPressAnalyzer│
     │   │ .analyzeSite() │
     │   └────────────────┘
     │         │
     │         ▼
     │   ┌────────────────┐
     │   │  JSON Response │
     │   └────────────────┘
     │
     ├── POST /api/analyze/pdf
     │         │
     │         ▼
     │   ┌────────────────┐
     │   │ Analyze + PDF  │
     │   │   Generation   │
     │   └────────────────┘
     │         │
     │         ▼
     │   ┌────────────────┐
     │   │ Binary Response│
     │   └────────────────┘
     │
     └── POST /api/analyze/email
               │
               ▼
         ┌────────────────┐
         │ Analyze + PDF  │
         │  + Send Email  │
         └────────────────┘
               │
               ▼
         ┌────────────────┐
         │Confirm Response│
         └────────────────┘
```

## Design Patterns Used

### 1. Facade Pattern
The `WordPressAnalyzer` class provides a simplified interface to the complex detection subsystem.

### 2. Strategy Pattern
Multiple detection methods (meta generator, REST API, file detection) implement the same interface and can be selected based on effectiveness.

### 3. Factory Pattern
Reporter selection based on output format requirement.

### 4. Observer Pattern (Implicit)
Progress logging during analysis stages.

### 5. Builder Pattern
Report generation builds complex output from structured data.

### 6. Singleton Pattern
HTTP client and API integrations are instantiated once and reused.

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   Error Handling Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Network Error                                               │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │   Retry?    │──Yes──▶ Retry with backoff                 │
│  └─────────────┘                                            │
│       │ No                                                   │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │ Log Error   │                                            │
│  └─────────────┘                                            │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │Return Error │                                            │
│  │  Response   │                                            │
│  └─────────────┘                                            │
│                                                              │
│  Detection Failure                                           │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │ Mark as     │                                            │
│  │ Not Detected│                                            │
│  └─────────────┘                                            │
│       │                                                      │
│       ▼                                                      │
│  Continue with other detections                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### 1. Input Validation
- URL format validation
- Email format validation
- No command injection vectors

### 2. Network Security
- HTTPS preferred
- Timeout limits
- No credential exposure in logs

### 3. Ethical Considerations
- Only public information accessed
- Rate limiting to avoid abuse
- User-agent identification

## Performance Optimizations

### 1. Parallel Execution
- Version, theme, and plugin detection run in parallel
- `Promise.all()` and `Promise.allSettled()` for concurrent operations

### 2. HTTP Range Requests
- Asset inspection uses range requests to fetch only file headers
- Reduces bandwidth and improves speed

### 3. Caching
- WordPress.org API responses cached
- Prevents redundant API calls

### 4. Early Exit
- Quick detection mode for simple yes/no WordPress checks

## Scalability Considerations

### Current Limitations
- Single process, single thread
- No persistent caching
- No rate limiting on API

### Future Improvements
- Add Redis caching layer
- Implement worker threads for parallel processing
- Add request queuing for high load
- Implement API rate limiting
