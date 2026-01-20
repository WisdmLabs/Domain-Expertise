# Quick Start Guide - CF7 Integration

## 🚀 What Changed?

Your plugin now integrates with **Contact Form 7** instead of using a custom shortcode.

---

## 📋 Setup (5 Minutes)

### Step 1: Install Contact Form 7
```
WordPress Admin → Plugins → Add New → Search "Contact Form 7" → Install & Activate
```

### Step 2: Create Your Form

Go to **Contact → Contact Forms → Add New**

Use this form code:
```
<div class="form-group">
    <label>Website URL <span class="required">*</span></label>
    [url* website-url id:website-url placeholder "https://example.com"]
</div>

<div class="form-group">
    <label>Email Address <span class="required">*</span></label>
    [email* email id:email placeholder "you@example.com"]
</div>

[submit "Get My Analysis"]
```

**Save the form**

**Get the Post ID:**
1. Click **Edit** on your form
2. Look at the browser URL: `admin.php?page=wpcf7&post=27348&action=edit`
3. The number after `post=` is your Form ID (e.g., **27348**)

**Important:** You do NOT need to configure the "Mail" tab in CF7. The plugin automatically skips email sending since your API handles it.

### Step 3: Configure Plugin

1. Go to **Settings → WP Analyzer Form**
2. Enter your **CF7 Post ID** (the numeric value like 27348)
3. Click **Save Settings**

### Step 4: Add Form to Page

Use CF7's shortcode on any page:
```
[contact-form-7 id="YOUR_FORM_ID"]
```

**Done!** 🎉

---

## ⚠️ Important Field Names

Your CF7 form **MUST** have these exact field names:
- `website-url` (URL field)
- `email` (Email field)

If field names don't match, the integration won't work.

---

## 🔍 How It Works

1. User submits CF7 form
2. CF7 validates and shows success message immediately
3. **In background**: Your plugin sends data to analyzer API
4. User receives analysis report via email

**Benefits:**
- ⚡ Fast form submission (non-blocking)
- ✅ Better user experience
- 🎨 Easy to customize via CF7 UI
- 🛡️ Built-in spam protection

---

## 🐛 Troubleshooting

### Form Not Sending to API?

**Check WordPress debug.log for:**
```
WP Analyzer Form - Processing CF7 form ID: X
WP Analyzer Form - Sending to API: {...}
```

**Common Issues:**
1. Wrong form ID in settings
2. Field names don't match (`website-url`, `email`)
3. CF7 plugin not activated

### Where is debug.log?

`wp-content/debug.log`

Enable it in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```
