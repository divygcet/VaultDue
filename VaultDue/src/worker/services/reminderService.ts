import { NotificationService } from './notificationService';

interface Document {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  document_type: string | null;
  expiration_date: string;
  renewal_period_days: number | null;
  is_critical: boolean;
  status: string;
  last_renewed_date: string | null;
  next_reminder_date: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  user_id: string;
  phone_number: string | null;
  business_name: string | null;
  role: string | null;
  preferred_reminder_channel: 'whatsapp' | 'email' | 'sms';
  reminder_frequency: '30_days' | '14_days' | '7_days' | '3_days' | '1_day';
  reminder_time_preference: 'morning' | 'evening';
  two_factor_enabled: boolean;
}

interface User {
  id: string;
  email: string;
  google_user_data?: {
    name?: string;
    picture?: string;
  };
}

export class ReminderService {
  private notificationService: NotificationService;

  constructor(private env: Env, private db: D1Database) {
    this.notificationService = new NotificationService(this.env);
  }

  async processReminders(): Promise<void> {
    try {
      console.log('Starting reminder processing...');
      
      // Get all active documents that might need reminders
      const { results: documents } = await this.db.prepare(`
        SELECT d.*, u.email, u.google_user_data,
               p.preferred_reminder_channel, p.reminder_frequency, p.phone_number
        FROM documents d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN user_profiles p ON d.user_id = p.user_id
        WHERE d.status = 'active'
          AND d.expiration_date IS NOT NULL
      `).all() as { results: (Document & User & UserProfile)[] };

      console.log(`Found ${documents.length} active documents to check`);

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Process each document
      for (const doc of documents) {
        await this.processDocumentReminder(doc, today);
      }

      console.log('Reminder processing completed');
    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }

  private async processDocumentReminder(
    doc: Document & User & UserProfile, 
    today: string
  ): Promise<void> {
    try {
      const expirationDate = new Date(doc.expiration_date);
      const todayDate = new Date(today);
      const daysUntilExpiry = Math.ceil((expirationDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine if we should send a reminder
      const shouldSendReminder = this.shouldSendReminder(doc, daysUntilExpiry);
      
      if (!shouldSendReminder) {
        return;
      }

      // Check if we already sent a reminder for this date
      const { results: existingReminders } = await this.db.prepare(`
        SELECT id FROM reminders 
        WHERE document_id = ? AND reminder_date = ? AND is_sent = 1
      `).bind(doc.id, today).all();

      if (existingReminders.length > 0) {
        return; // Already sent reminder for today
      }

      // Create reminder record
      const reminderType = this.getReminderType(daysUntilExpiry);
      const reminderResult = await this.db.prepare(`
        INSERT INTO reminders (
          document_id, user_id, reminder_date, reminder_type, is_sent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?)
      `).bind(
        doc.id,
        doc.user_id,
        today,
        reminderType,
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      if (!reminderResult.success) {
        console.error(`Failed to create reminder for document ${doc.id}`);
        return;
      }

      // Send notification
      const sent = await this.sendNotification(doc, daysUntilExpiry);
      
      // Update reminder as sent
      if (sent) {
        await this.db.prepare(`
          UPDATE reminders 
          SET is_sent = 1, updated_at = ?
          WHERE id = ?
        `).bind(new Date().toISOString(), reminderResult.meta.last_row_id).run();

        // Log activity
        await this.db.prepare(`
          INSERT INTO activity_logs (
            user_id, action_type, description, related_document_id, created_at
          ) VALUES (?, 'reminder_sent', ?, ?, ?)
        `).bind(
          doc.user_id,
          `Reminder sent for "${doc.title}" (${daysUntilExpiry} days to expiry)`,
          doc.id,
          new Date().toISOString()
        ).run();

        console.log(`Reminder sent for document "${doc.title}" to user ${doc.user_id}`);
      }
    } catch (error) {
      console.error(`Error processing reminder for document ${doc.id}:`, error);
    }
  }

  private shouldSendReminder(
    doc: Document & UserProfile, 
    daysUntilExpiry: number
  ): boolean {
    // Always send for expired documents (once per day)
    if (daysUntilExpiry < 0) {
      return true;
    }

    // Get reminder frequency (default to 30 days if not set)
    const frequency = doc.reminder_frequency || '30_days';
    
    const reminderDays: Record<string, number[]> = {
      '30_days': [30, 14, 7, 3, 1, 0],
      '14_days': [14, 7, 3, 1, 0],
      '7_days': [7, 3, 1, 0],
      '3_days': [3, 1, 0],
      '1_day': [1, 0]
    };

    const daysToRemind = reminderDays[frequency] || reminderDays['30_days'];
    return daysToRemind.includes(daysUntilExpiry);
  }

  private getReminderType(daysUntilExpiry: number): string {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry === 0) return 'expires_today';
    if (daysUntilExpiry <= 3) return 'expires_soon';
    if (daysUntilExpiry <= 7) return 'expires_week';
    if (daysUntilExpiry <= 14) return 'expires_two_weeks';
    return 'expires_month';
  }

  private async sendNotification(
    doc: Document & User & UserProfile,
    daysUntilExpiry: number
  ): Promise<boolean> {
    const channel = doc.preferred_reminder_channel || 'email';
    
    const payload = {
      to: this.getNotificationAddress(doc, channel),
      documentTitle: doc.title,
      expirationDate: doc.expiration_date,
      daysUntilExpiry,
      isCritical: Boolean(doc.is_critical),
      message: '', // Will be formatted by notification service
    };

    if (!payload.to) {
      console.warn(`No ${channel} address available for user ${doc.user_id}`);
      return false;
    }

    try {
      switch (channel) {
        case 'whatsapp':
          if (!payload.to) {
            console.warn(`No WhatsApp number available for user ${doc.user_id}, falling back to email`);
            payload.to = doc.email;
            return await this.notificationService.sendEmailNotification(payload);
          }
          return await this.notificationService.sendWhatsAppNotification(payload);
          
        case 'sms':
          return await this.notificationService.sendSMSNotification(payload);
          
        case 'email':
        default:
          return await this.notificationService.sendEmailNotification(payload);
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);
      
      // Fallback to email if primary channel fails
      if (channel !== 'email' && doc.email) {
        payload.to = doc.email;
        return await this.notificationService.sendEmailNotification(payload);
      }
      
      return false;
    }
  }

  private getNotificationAddress(
    doc: Document & User & UserProfile,
    channel: string
  ): string {
    switch (channel) {
      case 'whatsapp':
      case 'sms':
        return doc.phone_number || '';
      case 'email':
      default:
        return doc.email || '';
    }
  }

  // Manual reminder trigger for testing
  async sendTestReminder(userId: string, documentId: number): Promise<boolean> {
    try {
      const { results: documents } = await this.db.prepare(`
        SELECT d.*, u.email, u.google_user_data,
               p.preferred_reminder_channel, p.reminder_frequency, p.phone_number
        FROM documents d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN user_profiles p ON d.user_id = p.user_id
        WHERE d.id = ? AND d.user_id = ?
      `).bind(documentId, userId).all() as { results: (Document & User & UserProfile)[] };

      if (documents.length === 0) {
        return false;
      }

      const doc = documents[0];
      const expirationDate = new Date(doc.expiration_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return await this.sendNotification(doc, daysUntilExpiry);
    } catch (error) {
      console.error('Error sending test reminder:', error);
      return false;
    }
  }
}
