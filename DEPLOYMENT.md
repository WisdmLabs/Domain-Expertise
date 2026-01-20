# Deployment Guide: WordPress Site Analyzer with Async Webhook Pattern

This guide covers deploying the updated WordPress Site Analyzer system that uses an async webhook pattern for reliable report generation and email delivery.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   WordPress     │────▶│  Vercel API      │────▶│  Upstash QStash │
│   (CF7 Form)    │     │  /api/analyze/   │     │  (Job Queue)    │
└─────────────────┘     │  report          │     └────────┬────────┘
        ▲               └──────────────────┘              │
        │                                                 │
        │               ┌──────────────────┐              │
        │               │  Vercel API      │◀─────────────┘
        └───────────────│  /api/internal/  │
    (webhook callback)  │  process-report  │
                        └──────────────────┘
```

1. User submits form on WordPress
2. WordPress calls `/api/analyze/report` which queues the job and returns immediately
3. QStash triggers `/api/internal/process-report` to do the actual work
4. When complete, the API calls the WordPress webhook with the PDF
5. WordPress sends the email with the PDF attachment

## Prerequisites

- Vercel account with the project deployed
- Upstash account (free tier available)
- WordPress site with the wp-analyzer-form plugin

---

## Step 1: Set Up Upstash QStash

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up or log in
3. Navigate to **QStash** from the sidebar
4. Copy your **QSTASH_TOKEN** from the dashboard

---

## Step 2: Configure Vercel Environment Variables

Add the following environment variables in your Vercel project settings:

| Variable | Description | Required |
|----------|-------------|----------|
| `QSTASH_TOKEN` | Your Upstash QStash token | Yes |
| `NODE_ENV` | Set to `production` | Yes |

### How to add:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production** environment
4. Redeploy the project for changes to take effect

---

## Step 3: Deploy to Vercel

```bash
# From the project directory
vercel --prod

# Or if using Git integration, push to main branch
git push origin main
```

The `vercel.json` configuration sets:
- Max function duration: 300 seconds (5 minutes)
- Node.js runtime for server.js

---

## Step 4: Update WordPress Plugin

### Option A: Upload via WordPress Admin

1. Zip the plugin folder:
   ```bash
   cd wp-analyzer-plugin
   zip -r wp-analyzer-form.zip wp-analyzer-form/
   ```
2. Go to WordPress Admin → Plugins → Add New → Upload Plugin
3. Upload `wp-analyzer-form.zip`
4. Activate the plugin

### Option B: Manual Upload via FTP/SFTP

1. Upload the `wp-analyzer-form` folder to `/wp-content/plugins/`
2. Activate from WordPress Admin → Plugins

### Plugin Configuration

The plugin settings are in the admin panel under **WP Analyzer Form**:
- **API Server URL**: `https://domain-expertise.vercel.app`
- **Report Format**: Standard or Detailed

---

## Step 5: Verify Webhook Endpoint

Test that WordPress can receive webhooks:

```bash
# Test the webhook endpoint directly
curl -X POST https://your-wordpress-site.com/wp-json/wp-analyzer/v1/webhook \
  -H "Content-Type: application/json" \
  -d '{"job_id": "test-123", "success": true}'
```

Expected response:
```json
{"received": true, "email_sent": false}
```

---

## Step 6: Test the Full Flow

### Test API Endpoints

1. **Health Check**:
   ```bash
   curl https://domain-expertise.vercel.app/health
   ```

2. **Queue a Report Job**:
   ```bash
   curl -X POST https://domain-expertise.vercel.app/api/analyze/report \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://example.com",
       "webhook_url": "https://your-wordpress-site.com/wp-json/wp-analyzer/v1/webhook",
       "format": "standard"
     }'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "job_id": "uuid-here",
     "status": "queued",
     "message": "Report generation started. Results will be sent to webhook_url when complete."
   }
   ```

### Test via WordPress Form

1. Navigate to the page with the analyzer form
2. Enter a test email and WordPress site URL
3. Submit the form
4. Check the test email for the PDF report (may take 1-2 minutes)

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "QStash client not initialized" | Verify `QSTASH_TOKEN` is set in Vercel environment variables |
| Webhook not receiving callbacks | Check WordPress REST API is accessible; verify permalink settings |
| Email not sending | Check WordPress mail configuration (SMTP plugin recommended) |
| 504 Gateway Timeout | Normal if using old endpoint; use `/api/analyze/report` instead |

### Debug Endpoints

- `/health` - API health check
- `/api/status` - Server status and environment info
- `/api/email/config` - Email configuration status (dev only)

### Logs

- **Vercel Logs**: Vercel Dashboard → Project → Logs
- **WordPress Logs**: Enable `WP_DEBUG_LOG` in `wp-config.php`

---

## Environment Variables Reference

### Vercel (Required)

```env
QSTASH_TOKEN=your_qstash_token_here
NODE_ENV=production
```

### Vercel (Optional - Legacy Email)

These are no longer needed if using WordPress for email:
```env
EMAIL_USER=
EMAIL_PASS=
SMTP_HOST=
SMTP_PORT=
```

---

## Security Notes

1. **Webhook Security**: The WordPress webhook endpoint validates job IDs against stored transients
2. **Transient Expiry**: Job data expires after 1 hour
3. **SSL Verification**: All API calls use SSL verification
4. **Temp File Cleanup**: PDF attachments are deleted immediately after email is sent

---

## Rollback Procedure

If issues occur after deployment:

1. **Vercel**: Redeploy previous version from Vercel Dashboard → Deployments
2. **WordPress Plugin**: Deactivate and reactivate previous plugin version
3. **QStash**: Jobs in queue will fail gracefully and trigger error webhooks

---

## Support

For issues or questions:
- Check Vercel function logs for API errors
- Check WordPress debug log for plugin errors
- Verify QStash dashboard for queued/failed jobs
