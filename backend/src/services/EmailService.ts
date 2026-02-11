import nodemailer from 'nodemailer';

/**
 * Email Service for sending custom emails
 * Uses Brevo (formerly Sendinblue) SMTP
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@waveio.me';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Wave Messenger';

    if (!smtpUser || !smtpPass) {
      console.warn('⚠️  Email service not configured - SMTP credentials missing');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // Use TLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  /**
   * Send welcome email after user signs up
   */
  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    const subject = 'Welcome to Wave Messenger! 🌊';
    const html = this.getWelcomeEmailTemplate(username);
    const text = `Welcome to Wave Messenger, ${username}!\n\nYour account has been created successfully. Start connecting with friends and family today.\n\nBest regards,\nThe Wave Team`;

    await this.sendEmail(to, subject, html, text);
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(to: string, username: string, verificationUrl: string): Promise<void> {
    const subject = 'Verify your Wave Messenger email';
    const html = this.getVerificationEmailTemplate(username, verificationUrl);
    const text = `Hi ${username},\n\nPlease verify your email address by clicking this link:\n${verificationUrl}\n\nIf you didn't create this account, you can safely ignore this email.\n\nBest regards,\nThe Wave Team`;

    await this.sendEmail(to, subject, html, text);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, username: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your Wave Messenger password';
    const html = this.getPasswordResetEmailTemplate(username, resetUrl);
    const text = `Hi ${username},\n\nWe received a request to reset your password. Click this link to reset it:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nBest regards,\nThe Wave Team`;

    await this.sendEmail(to, subject, html, text);
  }

  /**
   * Send new device login alert email
   */
  async sendNewDeviceAlert(
    to: string,
    username: string,
    deviceInfo: {
      device: string;
      browser: string;
      os: string;
      ip: string;
      location: string;
      city: string;
      country: string;
      time: Date;
    }
  ): Promise<void> {
    const subject = '🔐 New device login detected - Wave Messenger';
    const html = this.getNewDeviceAlertTemplate(username, deviceInfo);
    const text = `Hi ${username},\n\nWe detected a new login to your Wave Messenger account:\n\nDevice: ${deviceInfo.device}\nBrowser: ${deviceInfo.browser}\nOS: ${deviceInfo.os}\nLocation: ${deviceInfo.city}, ${deviceInfo.country}\nIP Address: ${deviceInfo.ip}\nTime: ${deviceInfo.time.toLocaleString()}\n\nIf this was you, you can safely ignore this email.\n\nIf you don't recognize this activity, please secure your account immediately by changing your password.\n\nBest regards,\nThe Wave Team`;

    await this.sendEmail(to, subject, html, text);
  }

  /**
   * Generic email sender
   */
  private async sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    } catch (error) {
      console.error('[Email] Failed to send:', error);
      throw error;
    }
  }

  /**
   * Welcome email HTML template
   */
  private getWelcomeEmailTemplate(username: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Wave</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #101e23;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #101e23; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16262c; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0db9f2 0%, #0a9dd1 100%); padding: 40px 40px 60px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                Welcome to Wave! 🌊
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #f5f5f5; font-size: 16px; line-height: 1.6;">
                Hi <strong>${username}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #a3a3a3; font-size: 16px; line-height: 1.6;">
                Your account has been created successfully! You're now part of the Wave community.
              </p>
              
              <p style="margin: 0 0 30px; color: #a3a3a3; font-size: 16px; line-height: 1.6;">
                Start connecting with friends and family, share moments, and experience the next generation of messaging.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://waveio.me/chat.html" style="display: inline-block; background-color: #0db9f2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Start Chatting
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: rgba(13, 185, 242, 0.1); border-radius: 8px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #0db9f2; font-weight: 600; font-size: 14px;">⚡ Instant Sync</p>
                    <p style="margin: 5px 0 0; color: #a3a3a3; font-size: 14px;">Messages sync instantly across all your devices</p>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background-color: rgba(13, 185, 242, 0.1); border-radius: 8px;">
                    <p style="margin: 0; color: #0db9f2; font-weight: 600; font-size: 14px;">🔒 Secure</p>
                    <p style="margin: 5px 0 0; color: #a3a3a3; font-size: 14px;">End-to-end encryption keeps your conversations private</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #101e23; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 10px; color: #737373; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #0db9f2;">The Wave Team</strong>
              </p>
              <p style="margin: 20px 0 0; color: #5a7d8a; font-size: 12px;">
                © ${new Date().getFullYear()} Wave Messenger. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Email verification template
   */
  private getVerificationEmailTemplate(username: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #101e23;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #101e23; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16262c; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0db9f2 0%, #0a9dd1 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Verify Your Email
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #f5f5f5; font-size: 16px; line-height: 1.6;">
                Hi <strong>${username}</strong>,
              </p>
              
              <p style="margin: 0 0 30px; color: #a3a3a3; font-size: 16px; line-height: 1.6;">
                Please verify your email address to complete your Wave Messenger registration.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; background-color: #0db9f2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #737373; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #0db9f2; word-break: break-all;">${verificationUrl}</a>
              </p>
              
              <p style="margin: 30px 0 0; color: #737373; font-size: 14px; line-height: 1.6;">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #101e23; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 10px; color: #737373; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #0db9f2;">The Wave Team</strong>
              </p>
              <p style="margin: 20px 0 0; color: #5a7d8a; font-size: 12px;">
                © ${new Date().getFullYear()} Wave Messenger. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Password reset template
   */
  private getPasswordResetEmailTemplate(username: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #101e23;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #101e23; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16262c; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Reset Your Password
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #f5f5f5; font-size: 16px; line-height: 1.6;">
                Hi <strong>${username}</strong>,
              </p>
              
              <p style="margin: 0 0 30px; color: #a3a3a3; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #737373; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #ef4444; word-break: break-all;">${resetUrl}</a>
              </p>
              
              <div style="margin: 30px 0; padding: 15px; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                <p style="margin: 0; color: #ef4444; font-size: 14px; font-weight: 600;">
                  ⚠️ Security Notice
                </p>
                <p style="margin: 5px 0 0; color: #a3a3a3; font-size: 14px;">
                  If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #101e23; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 10px; color: #737373; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #0db9f2;">The Wave Team</strong>
              </p>
              <p style="margin: 20px 0 0; color: #5a7d8a; font-size: 12px;">
                © ${new Date().getFullYear()} Wave Messenger. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * New device alert template
   */
  private getNewDeviceAlertTemplate(username: string, deviceInfo: any): string {
    const formattedTime = deviceInfo.time.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Device Login Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #101e23;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #101e23; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16262c; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                New Device Login Detected
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #f5f5f5; font-size: 16px; line-height: 1.6;">
                Hi <strong>${username}</strong>,
              </p>
              
              <p style="margin: 0 0 30px; color: #a3a3a3; font-size: 16px; line-height: 1.6;">
                We detected a new login to your Wave Messenger account. Here are the details:
              </p>
              
              <!-- Device Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #f59e0b; font-weight: 600; font-size: 14px;">📱 Device:</span>
                          <span style="color: #f5f5f5; font-size: 14px; margin-left: 10px;">${deviceInfo.device}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #f59e0b; font-weight: 600; font-size: 14px;">🌐 Browser:</span>
                          <span style="color: #f5f5f5; font-size: 14px; margin-left: 10px;">${deviceInfo.browser} on ${deviceInfo.os}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #f59e0b; font-weight: 600; font-size: 14px;">📍 Location:</span>
                          <span style="color: #f5f5f5; font-size: 14px; margin-left: 10px;">${deviceInfo.city}, ${deviceInfo.country}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #f59e0b; font-weight: 600; font-size: 14px;">🔢 IP Address:</span>
                          <span style="color: #f5f5f5; font-size: 14px; margin-left: 10px;">${deviceInfo.ip}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #f59e0b; font-weight: 600; font-size: 14px;">🕐 Time:</span>
                          <span style="color: #f5f5f5; font-size: 14px; margin-left: 10px;">${formattedTime}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Was this you? -->
              <div style="margin: 30px 0; padding: 20px; background-color: rgba(13, 185, 242, 0.1); border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 15px; color: #0db9f2; font-weight: 600; font-size: 16px;">
                  Was this you?
                </p>
                <p style="margin: 0; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                  If you recognize this activity, you can safely ignore this email. We're just keeping you informed about account access.
                </p>
              </div>
              
              <!-- Security Warning -->
              <div style="margin: 30px 0; padding: 20px; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #ef4444; font-size: 16px; font-weight: 600;">
                  ⚠️ Don't recognize this activity?
                </p>
                <p style="margin: 0 0 15px; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                  If you didn't log in from this device, your account may be compromised. Take action immediately:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #a3a3a3; font-size: 14px; line-height: 1.8;">
                  <li>Change your password right away</li>
                  <li>Review your active sessions and terminate unknown devices</li>
                  <li>Enable two-factor authentication for extra security</li>
                </ul>
              </div>
              
              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center" style="padding: 10px;">
                    <a href="https://waveio.me/settings.html" style="display: inline-block; background-color: #0db9f2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 5px;">
                      View Active Sessions
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 10px;">
                    <a href="https://waveio.me/settings.html" style="display: inline-block; background-color: transparent; color: #ef4444; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; border: 2px solid #ef4444; margin: 0 5px;">
                      Change Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Tips -->
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="margin: 0 0 15px; color: #0db9f2; font-weight: 600; font-size: 14px;">
                  🛡️ Security Tips
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #737373; font-size: 13px; line-height: 1.8;">
                  <li>Never share your password with anyone</li>
                  <li>Use a unique password for Wave Messenger</li>
                  <li>Enable two-factor authentication</li>
                  <li>Regularly review your active sessions</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #101e23; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 10px; color: #737373; font-size: 14px;">
                This is an automated security alert from<br>
                <strong style="color: #0db9f2;">Wave Messenger</strong>
              </p>
              <p style="margin: 20px 0 0; color: #5a7d8a; font-size: 12px;">
                © ${new Date().getFullYear()} Wave Messenger. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

// Export singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
