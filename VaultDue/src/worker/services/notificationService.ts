interface NotificationPayload {
  to: string;
  documentTitle: string;
  expirationDate: string;
  daysUntilExpiry: number;
  isCritical: boolean;
  message: string;
}

export class NotificationService {
  constructor(private env: Env) {}

  async sendWhatsAppNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      if (!this.env.WHATSAPP_ACCESS_TOKEN || !this.env.WHATSAPP_PHONE_NUMBER_ID) {
        console.error('WhatsApp credentials not configured');
        return false;
      }

      // Clean and validate phone number
      const phoneNumber = this.formatPhoneNumber(payload.to);
      if (!phoneNumber) {
        console.error('Invalid phone number:', payload.to);
        return false;
      }

      const message = this.formatWhatsAppMessage(payload);
      
      const whatsappPayload = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { 
          body: message 
        }
      };

      console.log(`Sending WhatsApp reminder to: ${phoneNumber}`);
      
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(whatsappPayload),
        }
      );

      const responseData = await response.json() as any;
      
      if (!response.ok) {
        console.error('WhatsApp API error:', responseData);
        return false;
      }

      console.log('WhatsApp reminder sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
      return false;
    }
  }

  async sendSMSNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      if (!this.env.TWILIO_ACCOUNT_SID || !this.env.TWILIO_AUTH_TOKEN || !this.env.TWILIO_PHONE_NUMBER) {
        console.error('Twilio SMS credentials not configured');
        return false;
      }

      const phoneNumber = this.formatPhoneNumber(payload.to);
      if (!phoneNumber) {
        console.error('Invalid phone number:', payload.to);
        return false;
      }

      const message = this.formatSMSMessage(payload);
      const auth = btoa(`${this.env.TWILIO_ACCOUNT_SID}:${this.env.TWILIO_AUTH_TOKEN}`);
      
      console.log(`Sending SMS reminder to: ${phoneNumber}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.env.TWILIO_PHONE_NUMBER,
            To: `+${phoneNumber}`,
            Body: message,
          }),
        }
      );

      const responseData = await response.json() as any;
      
      if (!response.ok) {
        console.error('SMS API error:', responseData);
        return false;
      }

      console.log('SMS reminder sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      return false;
    }
  }

  async sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      if (!this.env.RESEND_API_KEY) {
        console.error('Resend API key not configured');
        return false;
      }

      const subject = this.getEmailSubject(payload);
      const htmlContent = this.formatEmailHTML(payload);
      
      console.log(`Sending email reminder to: ${payload.to}`);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'VaultDue Reminders <reminders@vaultdue.com>',
          to: [payload.to],
          subject: subject,
          html: htmlContent,
        }),
      });

      const responseData = await response.json() as any;
      
      if (!response.ok) {
        console.error('Email API error:', responseData);
        return false;
      }

      console.log('Email reminder sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    // Remove all non-digits
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Remove leading + or 00
    cleaned = cleaned.replace(/^(\+|00)/, '');
    
    // If number doesn't start with country code and is 10 digits, assume it's Indian
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Validate length (10-15 digits including country code)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return '';
    }
    
    return cleaned;
  }

  private formatWhatsAppMessage(payload: NotificationPayload): string {
    const { documentTitle, daysUntilExpiry, isCritical, expirationDate } = payload;
    const urgencyEmoji = isCritical ? '🚨' : '📋';
    const expiryFormatted = new Date(expirationDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (daysUntilExpiry < 0) {
      return `${urgencyEmoji} *EXPIRED DOCUMENT ALERT*\n\n` +
             `Your document "${documentTitle}" expired ${Math.abs(daysUntilExpiry)} day(s) ago on ${expiryFormatted}.\n\n` +
             `⚠️ Please renew this document immediately to avoid any issues.\n\n` +
             `Log into VaultDue to update: https://vaultdue.com\n\n` +
             `Reply "RENEWED" once you've updated this document.`;
    } else if (daysUntilExpiry === 0) {
      return `${urgencyEmoji} *DOCUMENT EXPIRES TODAY*\n\n` +
             `Your document "${documentTitle}" expires TODAY (${expiryFormatted}).\n\n` +
             `⚠️ Please take immediate action to renew this document.\n\n` +
             `Log into VaultDue to update: https://vaultdue.com\n\n` +
             `Reply "RENEWED" once you've updated this document.`;
    } else if (daysUntilExpiry === 1) {
      return `${urgencyEmoji} *DOCUMENT EXPIRES TOMORROW*\n\n` +
             `Your document "${documentTitle}" expires tomorrow (${expiryFormatted}).\n\n` +
             `⏰ Don't forget to renew this document!\n\n` +
             `Log into VaultDue to update: https://vaultdue.com\n\n` +
             `Reply "RENEWED" once you've updated this document.`;
    } else {
      return `${urgencyEmoji} *DOCUMENT EXPIRY REMINDER*\n\n` +
             `Your document "${documentTitle}" will expire in ${daysUntilExpiry} day(s) on ${expiryFormatted}.\n\n` +
             `📅 Plan ahead to renew this document on time.\n\n` +
             `Log into VaultDue to manage: https://vaultdue.com\n\n` +
             `Reply "RENEWED" once you've updated this document.`;
    }
  }

  private formatSMSMessage(payload: NotificationPayload): string {
    const { documentTitle, daysUntilExpiry, expirationDate } = payload;
    const expiryFormatted = new Date(expirationDate).toLocaleDateString();

    if (daysUntilExpiry < 0) {
      return `VaultDue Alert: "${documentTitle}" expired ${Math.abs(daysUntilExpiry)} day(s) ago (${expiryFormatted}). Please renew immediately. Visit: vaultdue.com`;
    } else if (daysUntilExpiry === 0) {
      return `VaultDue Alert: "${documentTitle}" expires TODAY (${expiryFormatted}). Take immediate action! Visit: vaultdue.com`;
    } else if (daysUntilExpiry === 1) {
      return `VaultDue Reminder: "${documentTitle}" expires tomorrow (${expiryFormatted}). Don't forget to renew! Visit: vaultdue.com`;
    } else {
      return `VaultDue Reminder: "${documentTitle}" expires in ${daysUntilExpiry} days (${expiryFormatted}). Plan to renew on time. Visit: vaultdue.com`;
    }
  }

  private getEmailSubject(payload: NotificationPayload): string {
    const { documentTitle, daysUntilExpiry, isCritical } = payload;
    const priority = isCritical ? '[CRITICAL] ' : '';

    if (daysUntilExpiry < 0) {
      return `${priority}EXPIRED: ${documentTitle} - Action Required`;
    } else if (daysUntilExpiry === 0) {
      return `${priority}EXPIRES TODAY: ${documentTitle} - Immediate Action Needed`;
    } else if (daysUntilExpiry === 1) {
      return `${priority}EXPIRES TOMORROW: ${documentTitle} - Reminder`;
    } else {
      return `${priority}Reminder: ${documentTitle} expires in ${daysUntilExpiry} days`;
    }
  }

  private formatEmailHTML(payload: NotificationPayload): string {
    const { documentTitle, daysUntilExpiry, isCritical, expirationDate } = payload;
    const expiryFormatted = new Date(expirationDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const urgencyColor = daysUntilExpiry <= 1 ? '#dc2626' : daysUntilExpiry <= 7 ? '#f59e0b' : '#3b82f6';
    const urgencyText = daysUntilExpiry < 0 ? 'EXPIRED' : 
                        daysUntilExpiry === 0 ? 'EXPIRES TODAY' : 
                        daysUntilExpiry === 1 ? 'EXPIRES TOMORROW' : 
                        `EXPIRES IN ${daysUntilExpiry} DAYS`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Expiry Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">VaultDue</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Document Expiry Management</p>
        </div>

        <!-- Alert Banner -->
        <div style="background-color: ${urgencyColor}; color: #ffffff; padding: 16px; text-align: center; font-weight: 600; font-size: 16px;">
            ${isCritical ? '🚨 CRITICAL: ' : '📋 '}${urgencyText}
        </div>

        <!-- Content -->
        <div style="padding: 32px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Document Reminder</h2>
            
            <div style="background-color: #f8fafc; border-left: 4px solid ${urgencyColor}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${documentTitle}</h3>
                <p style="color: #6b7280; margin: 0; font-size: 16px;"><strong>Expiry Date:</strong> ${expiryFormatted}</p>
            </div>

            ${daysUntilExpiry < 0 ? 
                `<p style="color: #374151; line-height: 1.6; font-size: 16px;">Your document has <strong>expired ${Math.abs(daysUntilExpiry)} day(s) ago</strong>. Please renew this document immediately to avoid any compliance issues.</p>` :
                daysUntilExpiry === 0 ? 
                `<p style="color: #374151; line-height: 1.6; font-size: 16px;">Your document <strong>expires today</strong>. Please take immediate action to renew this document.</p>` :
                daysUntilExpiry === 1 ? 
                `<p style="color: #374151; line-height: 1.6; font-size: 16px;">Your document <strong>expires tomorrow</strong>. Don't forget to renew it on time!</p>` :
                `<p style="color: #374151; line-height: 1.6; font-size: 16px;">Your document will expire in <strong>${daysUntilExpiry} days</strong>. Plan ahead to renew this document on time.</p>`
            }

            <!-- Action Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="https://vaultdue.com" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s;">
                    Manage Documents →
                </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">This is an automated reminder from VaultDue. You're receiving this because you have documents that are approaching their expiry dates.</p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                © 2024 VaultDue. All rights reserved.<br>
                <a href="https://vaultdue.com" style="color: #667eea; text-decoration: none;">vaultdue.com</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
