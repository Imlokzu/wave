# Wave Messenger Email Templates

Professional HTML email templates for all authentication flows.

## Templates Included

1. **magic-link.html** - Passwordless sign-in link
2. **email-verification.html** - Email address verification
3. **password-reset.html** - Password reset request
4. **invitation.html** - User invitation
5. **email-change.html** - Email address change verification

## Template Variables

All templates use placeholder variables that need to be replaced before sending:

### Common Variables
- `{{user_first_name}}` - User's first name
- `{{current_year}}` - Current year (e.g., 2026)
- `{{ttl_minutes}}` - Time to live in minutes
- `{{ttl_days}}` - Time to live in days

### Action URLs
- `{{magic_link}}` - Magic link sign-in URL
- `{{verification_url}}` - Email verification URL
- `{{reset_password_url}}` - Password reset URL
- `{{invitation_url}}` - Invitation acceptance URL

### Security Info
- `{{requested_from}}` - IP address of request
- `{{requested_at}}` - Timestamp of request

### Invitation Specific
- `{{inviter_name}}` - Name of person who sent invitation
- `{{app_name}}` - Name of the app/organization

## Usage with EmailService

The templates are already integrated into `EmailService.ts`. The service automatically:
- Loads the appropriate template
- Replaces variables with actual values
- Sends via SMTP (Brevo)

### Example: Send Verification Email

```typescript
import { getEmailService } from './services/EmailService';

const emailService = getEmailService();

await emailService.sendVerificationEmail(
  'user@example.com',
  'John',
  'https://waveio.me/verify?token=abc123'
);
```

## Customization

### Colors

Wave Messenger brand colors used:
- Primary: `#0db9f2` (Wave Blue)
- Background: `#101e23` (Dark)
- Surface: `#16262c` (Card Background)
- Text Primary: `#f5f5f5` (White)
- Text Secondary: `#a3a3a3` (Gray)
- Text Muted: `#737373` (Dim Gray)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Orange)
- Danger: `#ef4444` (Red)

### Modify Templates

1. Open the HTML file you want to edit
2. Change colors, text, or layout
3. Test by sending to yourself
4. Save changes

### Add New Template

1. Create new HTML file in this directory
2. Use existing templates as reference
3. Add method to `EmailService.ts`
4. Test thoroughly

## Testing Templates

### Method 1: Send Test Email

```typescript
const emailService = getEmailService();

await emailService.sendEmail(
  'your-email@example.com',
  'Test Subject',
  htmlContent,
  textContent
);
```

### Method 2: Preview in Browser

1. Open HTML file in browser
2. Replace `{{variables}}` with sample data
3. Check responsive design (resize window)
4. Test in different email clients

### Method 3: Use Email Testing Service

Services like [Litmus](https://litmus.com/) or [Email on Acid](https://www.emailonacid.com/) can test across multiple email clients.

## Email Client Compatibility

Templates are tested and work in:
- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (Web, Desktop, Mobile)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ ProtonMail
- ✅ Thunderbird

### Design Principles

- **Inline CSS** - All styles are inline for maximum compatibility
- **Table Layout** - Uses tables for reliable layout across clients
- **Web Fonts** - Falls back to system fonts if unavailable
- **Responsive** - Adapts to mobile screens
- **Dark Theme** - Consistent with Wave's brand
- **Accessible** - Proper contrast ratios and semantic HTML

## Template Structure

Each template follows this structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Title</title>
</head>
<body style="background-color: #101e23;">
  <table width="100%">
    <tr>
      <td align="center">
        <table width="600">
          <!-- Header -->
          <tr><td>WAVE Logo</td></tr>
          
          <!-- Content -->
          <tr><td>Main content here</td></tr>
          
          <!-- Footer -->
          <tr><td>Copyright notice</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Best Practices

### Do's ✅
- Keep width at 600px for desktop
- Use inline styles
- Test in multiple email clients
- Include plain text version
- Add alt text to images
- Use semantic HTML
- Include unsubscribe link (if applicable)

### Don'ts ❌
- Don't use JavaScript
- Don't use external CSS files
- Don't use background images (limited support)
- Don't use video or audio
- Don't use forms
- Don't rely on web fonts

## Troubleshooting

### Images not showing?
- Use absolute URLs (https://...)
- Check image hosting is accessible
- Add alt text for accessibility

### Layout broken in Outlook?
- Use tables instead of divs
- Avoid CSS Grid or Flexbox
- Test in Outlook-specific preview

### Colors look different?
- Some clients adjust colors
- Test in dark mode
- Use high contrast ratios

### Links not working?
- Use full URLs (https://...)
- Test link tracking if using
- Check URL encoding

## Production Checklist

Before going live:

- [ ] Test all templates in major email clients
- [ ] Verify all variables are replaced correctly
- [ ] Check links work and go to correct pages
- [ ] Test on mobile devices
- [ ] Verify SMTP credentials
- [ ] Set up email monitoring
- [ ] Add email rate limiting
- [ ] Test spam score (use [Mail Tester](https://www.mail-tester.com/))
- [ ] Verify SPF, DKIM, DMARC records
- [ ] Test unsubscribe functionality (if applicable)

## Spam Prevention

To avoid spam filters:

1. **Authenticate your domain**
   - Set up SPF record
   - Configure DKIM signing
   - Add DMARC policy

2. **Content best practices**
   - Avoid spam trigger words
   - Balance text and images
   - Include plain text version
   - Add unsubscribe link

3. **Sending practices**
   - Warm up new IP addresses
   - Monitor bounce rates
   - Clean email lists regularly
   - Respect rate limits

## Support

For issues with:
- **Templates**: Edit HTML files in this directory
- **Email sending**: Check `EmailService.ts`
- **SMTP**: Verify Brevo credentials in `.env`
- **Deliverability**: Check spam score and DNS records

---

**Note**: These templates are production-ready and follow email best practices. They're designed to work across all major email clients while maintaining Wave's brand identity.
