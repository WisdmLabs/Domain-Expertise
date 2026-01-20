# REST API Contract

**Version:** 2.0.0
**Base URL:** `http://localhost:3000`
**Generated:** 2026-01-20

## Overview

This document specifies the REST API contracts for the WordPress Site Analyzer service.

## Authentication

Currently, the API does not require authentication. All endpoints are public.

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": {...}
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Endpoints

---

### 1. Analyze WordPress Site

Performs a complete analysis of a WordPress website.

**Endpoint:** `POST /api/analyze`

**Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL of the WordPress site to analyze |
| `format` | string | No | Response format: `json` (default), `html` |
| `includePerformance` | boolean | No | Include PageSpeed analysis (default: false) |
| `includeRecommendations` | boolean | No | Include recommendations (default: true) |

**Example Request:**
```json
{
  "url": "https://example.com",
  "format": "json",
  "includePerformance": true
}
```

#### Response (200 OK)

```json
{
  "meta": {
    "url": "https://example.com",
    "analyzedAt": "2024-01-20T10:30:00.000Z",
    "duration": 2340,
    "analyzer": {
      "name": "WordPress Site Analyzer",
      "version": "2.0.0"
    }
  },
  "wordpress": {
    "detected": true,
    "confidence": "high",
    "score": 95,
    "indicators": [
      {
        "type": "meta_generator",
        "description": "WordPress 6.4.1",
        "confidence": "high"
      }
    ]
  },
  "version": {
    "detected": true,
    "version": "6.4.1",
    "method": "meta_generator",
    "confidence": "high"
  },
  "theme": {
    "detected": true,
    "name": "twentytwentythree",
    "displayName": "Twenty Twenty-Three",
    "version": "1.3",
    "author": "WordPress Team",
    "path": "/wp-content/themes/twentytwentythree/"
  },
  "plugins": {
    "statistics": {
      "total": 3,
      "outdated": 1,
      "upToDate": 2
    },
    "list": [
      {
        "name": "contact-form-7",
        "displayName": "Contact Form 7",
        "version": "5.8.4",
        "latestVersion": "5.8.6",
        "isOutdated": true,
        "confidence": "high",
        "category": "forms"
      }
    ]
  },
  "performance": {
    "mobile": {
      "score": 75,
      "coreWebVitals": {
        "lcp": 2.5,
        "cls": 0.1,
        "inp": 200
      }
    },
    "desktop": {
      "score": 90,
      "coreWebVitals": {
        "lcp": 1.8,
        "cls": 0.05,
        "inp": 150
      }
    }
  },
  "recommendations": {
    "summary": {
      "total": 5,
      "critical": 1,
      "high": 2,
      "medium": 2
    },
    "items": [...]
  }
}
```

#### Error Responses

**400 Bad Request - Missing URL:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "URL is required"
  }
}
```

**400 Bad Request - Invalid URL:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "Invalid URL format"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "ANALYSIS_FAILED",
    "message": "Failed to analyze site: Network error"
  }
}
```

---

### 2. Generate PDF Report

Generates a PDF report for a WordPress site analysis.

**Endpoint:** `POST /api/analyze/pdf`

**Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL of the WordPress site |
| `format` | string | No | PDF format: `standard` (default), `print`, `landscape`, `with-filename` |
| `filename` | string | No | Custom filename (only with `with-filename` format) |

**Example Request:**
```json
{
  "url": "https://example.com",
  "format": "print"
}
```

#### Response (200 OK)

**Content-Type:** `application/pdf`

Returns binary PDF data.

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="wordpress-analysis-example-com.pdf"
```

#### Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "URL is required"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "PDF_GENERATION_FAILED",
    "message": "Failed to generate PDF"
  }
}
```

---

### 3. Send Email Report

Sends the analysis report via email with PDF attachment.

**Endpoint:** `POST /api/analyze/email`

**Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL of the WordPress site |
| `email` | string | Yes | Recipient email address |
| `format` | string | No | PDF format: `standard` (default), `print` |

**Example Request:**
```json
{
  "url": "https://example.com",
  "email": "client@example.com",
  "format": "standard"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Analysis report sent to client@example.com"
}
```

#### Error Responses

**400 Bad Request - Missing Fields:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "URL and email are required"
  }
}
```

**400 Bad Request - Invalid Email:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Invalid email format"
  }
}
```

**500 Internal Server Error - Email Not Configured:**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_CONFIGURED",
    "message": "Email service is not configured"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_SEND_FAILED",
    "message": "Failed to send email"
  }
}
```

---

### 4. Test Email

Sends a test email to verify email configuration.

**Endpoint:** `POST /api/email/test`

**Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Recipient email address |

**Example Request:**
```json
{
  "email": "test@example.com"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Test email sent to test@example.com"
}
```

#### Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Email address is required"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_SEND_FAILED",
    "message": "Failed to send test email"
  }
}
```

---

### 5. Check Email Configuration

Returns the current email configuration status.

**Endpoint:** `GET /api/email/config`

#### Response (200 OK)

```json
{
  "configured": true,
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "from": "noreply@example.com"
}
```

**When Not Configured:**
```json
{
  "configured": false,
  "message": "Email service is not configured. Set SMTP environment variables."
}
```

---

### 6. Health Check

Returns the health status of the API service.

**Endpoint:** `GET /api/health`

#### Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "version": "2.0.0"
}
```

---

## Data Types

### Indicator

```typescript
interface Indicator {
  type: string;
  description: string;
  confidence: "high" | "medium" | "low";
}
```

### Plugin

```typescript
interface Plugin {
  name: string;
  displayName: string;
  version: string | null;
  latestVersion: string | null;
  isOutdated: boolean | null;
  confidence: "high" | "medium" | "low";
  category: string | null;
  author: string | null;
  authorUri: string | null;
  requiresWp: string | null;
  testedWp: string | null;
  activeInstalls: number | null;
  rating: number | null;
}
```

### CoreWebVitals

```typescript
interface CoreWebVitals {
  lcp: number;   // Largest Contentful Paint (seconds)
  cls: number;   // Cumulative Layout Shift (score)
  inp: number;   // Interaction to Next Paint (milliseconds)
  fcp?: number;  // First Contentful Paint (seconds)
  ttfb?: number; // Time to First Byte (milliseconds)
}
```

### Recommendation

```typescript
interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  estimatedEffort: string;
  expectedImpact: string;
  plugins?: string[];
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request is missing required fields |
| `INVALID_URL` | 400 | URL format is invalid |
| `INVALID_EMAIL` | 400 | Email format is invalid |
| `ANALYSIS_FAILED` | 500 | Site analysis failed |
| `PDF_GENERATION_FAILED` | 500 | PDF generation failed |
| `EMAIL_NOT_CONFIGURED` | 500 | Email service not configured |
| `EMAIL_SEND_FAILED` | 500 | Email sending failed |
| `NETWORK_ERROR` | 500 | Network request failed |
| `TIMEOUT` | 500 | Request timed out |

## Rate Limiting

Currently, there is no rate limiting on the API. For production deployments, it is recommended to implement:
- 10 requests per minute per IP for `/api/analyze`
- 5 requests per minute per IP for `/api/analyze/pdf`
- 5 requests per minute per IP for `/api/analyze/email`

## CORS

CORS is enabled for all origins. For production, this should be restricted to specific domains.

```javascript
// Current configuration
app.use(cors());

// Recommended production configuration
app.use(cors({
  origin: ['https://your-domain.com'],
  methods: ['GET', 'POST']
}));
```
