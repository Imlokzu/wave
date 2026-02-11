# Custom Email Templates Setup

This guide explains how to use your own email templates with Clerk authentication.

## Overview

We've created a custom email service that sends beautiful, branded emails for:
- **Welcome emails** - When a user signs up
- **Email verification** - When a user needs to verify their email
- **Password reset** - When a user requests a password reset

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `nodemailer` - For sending emails via SMTP
- `svix` - For verifying Clerk webhook signatures
- `@types/nodemailer` - TypeScript types

### 2. Configure Environment Variables

Your `.env` file should have the Brevo (Sendinblue) SMTP configuration:

```env
# Email Configuration
BREVO_API_KEY="your_brevo_api_key_here"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="your_smtp_user@smtp-brevo.com"
SMTP_PASS="bski0jEZT0ZEFgK"
EMAIL_FROM="noreply@waveio.me"
EMAIL_FROM_NAME="Wave Messenger"

# Add this new variable for webhook verification
CLERK_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
```

### 3. Set Up Clerk Webhooks

1. Go to your Clerk Dashboard: https://dashboard.clerk.com/apps/feasible-mantis-66/webhooks

2. Click **"Add Endpoint"**

3. Configure the webhook:
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/clerk`
   - **Subscribe to events**:
     - ✅ `user.created` (for welcome emails)
     - ✅ `user.updated` (optional, for future use)

4. Copy the **Signing Secret** (starts with `whsec_`)

5. Add it to your `.env` file:
   ```env
   CLERK_WEBHOOK_SECRET="whsec_abc123..."
   ```

### 4. Build and Start the Server

```bash
npm run build
npm start
```

Or for development:
```bash
npm run dev:server
```

### 5. Test the Email Flow

1. Sign up a new user on your app
2. Clerk will trigger the `user.created` webhook
3. Your backend will receive the webhook and send a welcome email
4. Check the email inbox for the branded welcome email

## Email Templates

The email templates are defined in `backend/src/services/EmailService.ts`:

### Welcome Email
- Sent when a user signs up
- Includes a "Start Chatting" button
- Highlights key features (Instant Sync, Secure)

### Verification Email
- Sent when email verification is needed
- Includes a "Verify Email Address" button
- Shows the verification link as fallback

### Password Reset Email
- Sent when a user requests password reset
- Includes a "Reset Password" button
- Has a security warning

## Customizing Templates

To customize the email templates:

1. Open `backend/src/services/EmailService.ts`
2. Find the template methods:
   - `getWelcomeEmailTemplate()`
   - `getVerificationEmailTemplate()`
   - `getPasswordResetEmailTemplate()`
3. Edit the HTML to match your brand
4. Rebuild: `npm run build`
5. Restart the server

## Template Features

All templates include:
- ✅ Responsive design (mobile-friendly)
- ✅ Dark theme matching Wave's brand
- ✅ Wave logo and colors (#0db9f2)
- ✅ Professional layout with proper spacing
- ✅ Call-to-action buttons
- ✅ Fallback text for email clients that don't support HTML

## Troubleshooting

### Emails not sending?

1. Check SMTP credentials in `.env`
2. Verify Brevo account is active
3. Check server logs for errors: `[Email] Failed to send:`

### Webhook not working?

1. Verify `CLERK_WEBHOOK_SECRET` is set correctly
2. Check webhook endpoint is accessible: `https://yourdomain.com/api/webhooks/clerk`
3. Check Clerk Dashboard → Webhooks → View logs
4. Check server logs for: `[Webhook] Received event:`

### Testing locally?

Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3001
```

Then use the ngrok URL in Clerk webhook settings:
```
https://abc123.ngrok.io/api/webhooks/clerk
```

## Alternative: Use Clerk's Email Templates

If you prefer to use Clerk's built-in email system:

1. Go to Clerk Dashboard → **Customization** → **Emails**
2. Edit each template (Welcome, Verification, Password Reset)
3. Customize the HTML/text to match your brand
4. Use Clerk variables: `{{verification_url}}`, `{{user.first_name}}`, etc.

This approach is simpler but gives you less control over the email design.

## Production Checklist

Before going to production:

- [ ] Install dependencies: `npm install`
- [ ] Set `CLERK_WEBHOOK_SECRET` in production `.env`
- [ ] Update webhook URL in Clerk Dashboard to production domain
- [ ] Test all email flows (signup, verification, password reset)
- [ ] Verify emails are not going to spam
- [ ] Set up email monitoring/logging
- [ ] Consider adding email rate limiting

## Support

For issues with:
- **Clerk webhooks**: https://clerk.com/docs/integrations/webhooks
- **Nodemailer**: https://nodemailer.com/
- **Brevo SMTP**: https://developers.brevo.com/docs/send-a-transactional-email

---

**Note**: The email templates use inline CSS for maximum compatibility with email clients. The design matches Wave's dark theme with the primary color #0db9f2.
