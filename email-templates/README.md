# Wave Messenger Email Templates

Professional HTML email templates for Wave Messenger notifications.

## Available Templates

### 1. welcome.html
**Purpose**: Welcome new users to Wave  
**Variables**:
- `{{username}}` - User's username
- `{{app_url}}` - Application URL

**When to send**: After successful registration

---

### 2. pro-approved.html
**Purpose**: Notify users when their Pro request is approved  
**Variables**:
- `{{username}}` - User's username
- `{{app_url}}` - Application URL

**When to send**: When admin approves a Pro request

---

### 3. report-received.html
**Purpose**: Confirm report submission  
**Variables**:
- `{{username}}` - Reporter's username
- `{{report_type}}` - Type of report (scam, message, bug)
- `{{report_id}}` - Unique report ID
- `{{submitted_date}}` - Date of submission
- `{{app_url}}` - Application URL

**When to send**: Immediately after report submission

---

### 4. password-reset.html
**Purpose**: Password reset link  
**Variables**:
- `{{username}}` - User's username
- `{{reset_url}}` - Password reset URL with token
- `{{app_url}}` - Application URL

**When to send**: When user requests password reset

---

### 5. friend-invite.html
**Purpose**: Notify user of friend request  
**Variables**:
- `{{to_username}}` - Recipient's username
- `{{from_username}}` - Sender's username
- `{{from_initial}}` - First letter of sender's username
- `{{from_bio}}` - Sender's bio (optional)
- `{{invite_id}}` - Invite ID for accept/decline
- `{{app_url}}` - Application URL

**When to send**: When someone sends a friend request

---

## Usage

### Node.js Example

\`\`\`javascript
const fs = require('fs');
const nodemailer = require('nodemailer');

// Load template
const template = fs.readFileSync('./email-templates/welcome.html', 'utf8');

// Replace variables
const emailHtml = template
  .replace(/{{username}}/g, 'john_doe')
  .replace(/{{app_url}}/g, 'https://wave.example.com');

// Send email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

await transporter.sendMail({
  from: 'Wave <noreply@wave.example.com>',
  to: 'user@example.com',
  subject: 'Welcome to Wave!',
  html: emailHtml
});
\`\`\`

### TypeScript Email Service Example

\`\`\`typescript
import fs from 'fs';
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  private loadTemplate(name: string, variables: Record<string, string>): string {
    let template = fs.readFileSync(\`./email-templates/\${name}.html\`, 'utf8');
    
    // Replace all variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(\`{{$\{key}}}\`, 'g');
      template = template.replace(regex, value);
    });
    
    return template;
  }
  
  async sendWelcome(email: string, username: string) {
    const html = this.loadTemplate('welcome', {
      username,
      app_url: process.env.APP_URL || 'http://localhost:3001'
    });
    
    await this.transporter.sendMail({
      from: 'Wave <noreply@wave.example.com>',
      to: email,
      subject: 'Welcome to Wave!',
      html
    });
  }
  
  async sendProApproved(email: string, username: string) {
    const html = this.loadTemplate('pro-approved', {
      username,
      app_url: process.env.APP_URL || 'http://localhost:3001'
    });
    
    await this.transporter.sendMail({
      from: 'Wave <noreply@wave.example.com>',
      to: email,
      subject: '⭐ You\'re Now Wave Pro!',
      html
    });
  }
  
  async sendReportReceived(
    email: string,
    username: string,
    reportType: string,
    reportId: string
  ) {
    const html = this.loadTemplate('report-received', {
      username,
      report_type: reportType,
      report_id: reportId,
      submitted_date: new Date().toLocaleDateString(),
      app_url: process.env.APP_URL || 'http://localhost:3001'
    });
    
    await this.transporter.sendMail({
      from: 'Wave <noreply@wave.example.com>',
      to: email,
      subject: 'Report Received - Wave',
      html
    });
  }
  
  async sendPasswordReset(email: string, username: string, resetToken: string) {
    const resetUrl = \`\${process.env.APP_URL}/reset-password.html?token=\${resetToken}\`;
    
    const html = this.loadTemplate('password-reset', {
      username,
      reset_url: resetUrl,
      app_url: process.env.APP_URL || 'http://localhost:3001'
    });
    
    await this.transporter.sendMail({
      from: 'Wave <noreply@wave.example.com>',
      to: email,
      subject: 'Reset Your Wave Password',
      html
    });
  }
  
  async sendFriendInvite(
    email: string,
    toUsername: string,
    fromUsername: string,
    fromBio: string,
    inviteId: string
  ) {
    const html = this.loadTemplate('friend-invite', {
      to_username: toUsername,
      from_username: fromUsername,
      from_initial: fromUsername.charAt(0).toUpperCase(),
      from_bio: fromBio || 'New Wave user',
      invite_id: inviteId,
      app_url: process.env.APP_URL || 'http://localhost:3001'
    });
    
    await this.transporter.sendMail({
      from: 'Wave <noreply@wave.example.com>',
      to: email,
      subject: \`\${fromUsername} wants to connect on Wave\`,
      html
    });
  }
}
\`\`\`

## Environment Variables

Add these to your `.env` file:

\`\`\`env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
APP_URL=http://localhost:3001
\`\`\`

## Testing

You can test templates by opening them directly in a browser. They're designed to work standalone with placeholder variables visible.

## Customization

All templates use Wave's brand colors:
- Primary: `#0db9f2` (Wave Blue)
- Background: `#101e23` (Dark)
- Surface: `#16262c` (Dark Surface)
- Text: `#ffffff` (White) and `#90bccb` (Light Blue)

Feel free to customize colors, fonts, and layout to match your branding.

## Email Client Compatibility

These templates are tested and compatible with:
- Gmail
- Outlook
- Apple Mail
- Yahoo Mail
- Mobile email clients (iOS, Android)

They use inline CSS for maximum compatibility.
