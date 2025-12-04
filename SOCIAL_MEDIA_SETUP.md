# Social Media OAuth Setup Guide

FlowMind now supports real OAuth connections to social media platforms. To enable this feature, you need to configure OAuth credentials for each platform you want to connect.

## Overview

The social media integration allows you to:
- Connect multiple social media accounts (TikTok, Instagram, YouTube, Facebook, X/Twitter)
- Schedule posts across multiple platforms simultaneously
- Auto-publish posts at scheduled times
- Track posting status and analytics

## Prerequisites

Before you begin, make sure you have:
1. A Supabase account with your project set up
2. Developer accounts on the platforms you want to integrate

## Setting Up Environment Variables

You need to add OAuth credentials to your Supabase project. Go to your Supabase Dashboard:
1. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following environment variables for each platform you want to support:

---

## Platform Setup Instructions

### 1. Instagram (Meta/Facebook)

Instagram uses the Meta Graph API for content posting.

**Steps:**
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or select an existing one
3. Add **Instagram Graph API** to your app
4. Configure OAuth redirect URI: `https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/social-oauth-callback`
5. Get your credentials from App Settings → Basic

**Required Environment Variables:**
```
INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret
```

**Permissions Required:**
- `user_profile`
- `user_media`
- `instagram_basic`
- `instagram_content_publish`

---

### 2. Facebook Pages

For posting to Facebook Pages (not personal profiles).

**Steps:**
1. Use the same Meta app as Instagram (or create a new one)
2. Add **Facebook Login** product to your app
3. Configure OAuth redirect URI: `https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/social-oauth-callback`
4. Get your credentials from App Settings → Basic

**Required Environment Variables:**
```
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

**Permissions Required:**
- `pages_manage_posts`
- `pages_read_engagement`
- `pages_show_list`

---

### 3. TikTok

TikTok uses the TikTok for Developers API.

**Steps:**
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Enable **Login Kit** and **Content Posting API**
4. Add redirect URI: `https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/social-oauth-callback`
5. Get your credentials from the app dashboard

**Required Environment Variables:**
```
TIKTOK_CLIENT_ID=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
```

**Permissions Required:**
- `user.info.basic`
- `video.publish`
- `video.upload`

---

### 4. YouTube (Google)

YouTube uses Google's OAuth 2.0 system.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**
4. Go to **APIs & Services** → **Credentials**
5. Create OAuth 2.0 Client ID
6. Add authorized redirect URI: `https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/social-oauth-callback`
7. Get your credentials

**Required Environment Variables:**
```
YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret
```

**Scopes Required:**
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube`

---

### 5. X (formerly Twitter)

X uses OAuth 2.0 with PKCE.

**Steps:**
1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Create a new app or select existing one
3. Enable **OAuth 2.0**
4. Add callback URI: `https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/social-oauth-callback`
5. Get your credentials from **Keys and tokens**

**Required Environment Variables:**
```
X_CLIENT_ID=your_twitter_client_id
X_CLIENT_SECRET=your_twitter_client_secret
```

**Scopes Required:**
- `tweet.read`
- `tweet.write`
- `users.read`

---

## How to Add Secrets to Supabase

### Method 1: Using Supabase Dashboard
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions**
4. Click on **Add secret** for each environment variable
5. Enter the secret name (e.g., `INSTAGRAM_CLIENT_ID`) and value

### Method 2: Using Supabase CLI (Advanced)
```bash
# Set a secret
supabase secrets set INSTAGRAM_CLIENT_ID=your_value

# List all secrets
supabase secrets list

# Unset a secret
supabase secrets unset SECRET_NAME
```

---

## Testing Your Integration

1. **Connect an Account:**
   - Go to FlowMind → Social Hub → Accounts tab
   - Click "Hubungkan" (Connect) on a platform
   - You'll be redirected to the platform's OAuth page
   - Authorize the app
   - You should be redirected back with a success message

2. **Create a Post:**
   - Go to "Buat Post" (Create Post) tab
   - Select connected platforms
   - Add caption and media
   - Set scheduled time
   - Click "Jadwalkan Postingan" (Schedule Post)

3. **Auto-Publishing:**
   - Posts will automatically publish to connected platforms at the scheduled time
   - Check the Dashboard tab to see posting status

---

## Troubleshooting

### "Platform not configured" Error
- Make sure you've added the required environment variables to Supabase
- Verify the secret names match exactly (e.g., `INSTAGRAM_CLIENT_ID`)
- Restart your edge functions or redeploy them

### OAuth Popup Closes Immediately
- Check that your redirect URI is correctly configured in the platform's developer console
- Verify it matches: `https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/social-oauth-callback`

### Posts Fail to Publish
- Verify your access tokens haven't expired
- Check that you have the required permissions/scopes
- Look at the error message in the post details
- Ensure your media URLs are publicly accessible

### Access Token Expired
- Most platforms require token refresh
- The edge functions handle token refresh automatically for supported platforms
- If issues persist, disconnect and reconnect the account

---

## Important Notes

### Security
- Never commit your client secrets to version control
- All secrets are stored securely in Supabase
- Access tokens are encrypted in the database

### Rate Limits
- Each platform has different rate limits
- Instagram: 25 posts per day
- TikTok: Varies by account type
- YouTube: 6 videos per day (standard)
- Facebook: Varies by page
- X: 300 posts per 3 hours

### Content Requirements
- **Instagram**: Square images (1:1) or vertical (4:5), videos up to 60 seconds
- **TikTok**: Vertical videos (9:16), 15-60 seconds
- **YouTube**: Videos, various formats supported
- **Facebook**: Images and videos, various formats
- **X**: Images and videos, max 280 characters for text

---

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure your OAuth apps are in production mode (not development)
4. Check that redirect URIs match exactly

For platform-specific issues, refer to their official documentation:
- [Instagram API Docs](https://developers.facebook.com/docs/instagram-api/)
- [Facebook API Docs](https://developers.facebook.com/docs/graph-api/)
- [TikTok API Docs](https://developers.tiktok.com/doc/)
- [YouTube API Docs](https://developers.google.com/youtube/v3/)
- [X API Docs](https://developer.twitter.com/en/docs)
