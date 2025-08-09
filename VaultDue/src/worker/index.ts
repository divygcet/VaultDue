import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import {
  CreateDocumentSchema,
  UpdateDocumentSchema,
  DOCUMENT_TYPES,
  REMINDER_TYPES,
} from "@/shared/types";
import { z } from "zod";
import { ReminderService } from "./services/reminderService";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use("*", cors());

// Scheduled job for document reminders
export default {
  ...app,
  
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduledReminders(env));
  }
};

async function handleScheduledReminders(env: Env): Promise<void> {
  try {
    console.log('Scheduled reminder job started');
    const reminderService = new ReminderService(env, env.DB);
    await reminderService.processReminders();
    console.log('Scheduled reminder job completed');
  } catch (error) {
    console.error('Scheduled reminder job failed:', error);
  }
}

// Auth routes
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", zValidator("json", z.object({ code: z.string() })), async (c) => {
  const { code } = c.req.valid("json");

  const sessionToken = await exchangeCodeForSessionToken(code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Document routes
app.get("/api/documents", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM documents WHERE user_id = ? ORDER BY expiration_date ASC, is_critical DESC"
  )
    .bind(user.id)
    .all();

  return c.json(results);
});

app.post("/api/documents", authMiddleware, zValidator("json", CreateDocumentSchema), async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const document = c.req.valid("json");
  
  const now = new Date().toISOString();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO documents (
      user_id, title, description, document_type, expiration_date, 
      renewal_period_days, is_critical, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  )
    .bind(
      user.id,
      document.title,
      document.description || null,
      document.document_type || null,
      document.expiration_date,
      document.renewal_period_days || null,
      document.is_critical ? 1 : 0,
      now,
      now
    )
    .run();

  // Log the activity
  await c.env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action_type, description, related_document_id, created_at) 
     VALUES (?, 'document_created', ?, ?, ?)`
  )
    .bind(user.id, `Created document "${document.title}"`, result.meta.last_row_id, now)
    .run();

  if (!result.success) {
    return c.json({ error: "Failed to create document" }, 500);
  }

  // Get the created document
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM documents WHERE id = ?"
  )
    .bind(result.meta.last_row_id)
    .all();

  return c.json(results[0], 201);
});

app.get("/api/documents/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const id = c.req.param("id");
  
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM documents WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .all();

  if (results.length === 0) {
    return c.json({ error: "Document not found" }, 404);
  }

  return c.json(results[0]);
});

app.put("/api/documents/:id", authMiddleware, zValidator("json", UpdateDocumentSchema), async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const id = c.req.param("id");
  const updates = c.req.valid("json");
  
  // Check if document exists and belongs to user
  const { results: existing } = await c.env.DB.prepare(
    "SELECT * FROM documents WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .all();

  if (existing.length === 0) {
    return c.json({ error: "Document not found" }, 404);
  }

  // Build update query dynamically
  const updateFields = [];
  const updateValues = [];
  
  if (updates.title !== undefined) {
    updateFields.push("title = ?");
    updateValues.push(updates.title);
  }
  if (updates.description !== undefined) {
    updateFields.push("description = ?");
    updateValues.push(updates.description || null);
  }
  if (updates.document_type !== undefined) {
    updateFields.push("document_type = ?");
    updateValues.push(updates.document_type || null);
  }
  if (updates.expiration_date !== undefined) {
    updateFields.push("expiration_date = ?");
    updateValues.push(updates.expiration_date);
  }
  if (updates.renewal_period_days !== undefined) {
    updateFields.push("renewal_period_days = ?");
    updateValues.push(updates.renewal_period_days || null);
  }
  if (updates.is_critical !== undefined) {
    updateFields.push("is_critical = ?");
    updateValues.push(updates.is_critical ? 1 : 0);
  }
  
  updateFields.push("updated_at = ?");
  updateValues.push(new Date().toISOString());
  updateValues.push(id);
  updateValues.push(user.id);

  await c.env.DB.prepare(
    `UPDATE documents SET ${updateFields.join(", ")} WHERE id = ? AND user_id = ?`
  )
    .bind(...updateValues)
    .run();

  // Log the activity
  const documentTitle = existing[0].title;
  await c.env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action_type, description, related_document_id, created_at) 
     VALUES (?, 'document_updated', ?, ?, ?)`
  )
    .bind(user.id, `Updated document "${documentTitle}"`, id, new Date().toISOString())
    .run();

  // Return updated document
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM documents WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .all();

  return c.json(results[0]);
});

app.delete("/api/documents/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const id = c.req.param("id");
  
  // Get document title before deletion for logging
  const { results: docToDelete } = await c.env.DB.prepare(
    "SELECT title FROM documents WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .all();

  if (docToDelete.length === 0) {
    return c.json({ error: "Document not found" }, 404);
  }

  const result = await c.env.DB.prepare(
    "DELETE FROM documents WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .run();

  if (!result.success) {
    return c.json({ error: "Document not found" }, 404);
  }

  // Also delete related reminders
  await c.env.DB.prepare(
    "DELETE FROM reminders WHERE document_id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .run();

  // Log the activity
  await c.env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action_type, description, created_at) 
     VALUES (?, 'document_deleted', ?, ?)`
  )
    .bind(user.id, `Deleted document "${docToDelete[0].title}"`, new Date().toISOString())
    .run();

  return c.json({ success: true });
});

// Mark document as renewed
app.post("/api/documents/:id/renew", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const id = c.req.param("id");
  
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];
  
  const result = await c.env.DB.prepare(
    `UPDATE documents SET 
      status = 'renewed', 
      last_renewed_date = ?, 
      updated_at = ? 
     WHERE id = ? AND user_id = ?`
  )
    .bind(today, now, id, user.id)
    .run();

  if (!result.success) {
    return c.json({ error: "Document not found" }, 404);
  }

  // Get updated document
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM documents WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .all();

  // Log the activity
  await c.env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action_type, description, related_document_id, created_at) 
     VALUES (?, 'document_renewed', ?, ?, ?)`
  )
    .bind(user.id, `Marked document "${results[0].title}" as renewed`, id, new Date().toISOString())
    .run();

  return c.json(results[0]);
});

// Get dashboard stats
app.get("/api/dashboard", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Get total documents
  const { results: totalDocs } = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM documents WHERE user_id = ?"
  )
    .bind(user.id)
    .all();

  // Get critical documents
  const { results: criticalDocs } = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM documents WHERE user_id = ? AND is_critical = 1"
  )
    .bind(user.id)
    .all();

  // Get expiring soon (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringSoonDate = thirtyDaysFromNow.toISOString().split('T')[0];
  
  const { results: expiringSoon } = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM documents WHERE user_id = ? AND expiration_date <= ? AND status = 'active'"
  )
    .bind(user.id, expiringSoonDate)
    .all();

  // Get expired documents
  const today = new Date().toISOString().split('T')[0];
  const { results: expired } = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM documents WHERE user_id = ? AND expiration_date < ? AND status = 'active'"
  )
    .bind(user.id, today)
    .all();

  return c.json({
    totalDocuments: totalDocs[0].count,
    criticalDocuments: criticalDocs[0].count,
    expiringSoon: expiringSoon[0].count,
    expired: expired[0].count,
  });
});

// Utility endpoints
app.get("/api/document-types", (c) => {
  return c.json(DOCUMENT_TYPES);
});

app.get("/api/reminder-types", (c) => {
  return c.json(REMINDER_TYPES);
});

// User profile routes
app.get("/api/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM user_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .all();

  if (results.length === 0) {
    // Return default profile
    return c.json({
      preferred_reminder_channel: 'whatsapp',
      reminder_frequency: '30_days',
      reminder_time_preference: 'morning',
      two_factor_enabled: false,
    });
  }

  return c.json(results[0]);
});

app.put("/api/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profileData = await c.req.json();
  const now = new Date().toISOString();

  // Check if profile exists
  const { results: existing } = await c.env.DB.prepare(
    "SELECT * FROM user_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .all();

  if (existing.length === 0) {
    // Create new profile
    await c.env.DB.prepare(
      `INSERT INTO user_profiles (
        user_id, phone_number, business_name, role, preferred_reminder_channel,
        reminder_frequency, reminder_time_preference, two_factor_enabled, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user.id,
        profileData.phone_number || null,
        profileData.business_name || null,
        profileData.role || null,
        profileData.preferred_reminder_channel || 'whatsapp',
        profileData.reminder_frequency || '30_days',
        profileData.reminder_time_preference || 'morning',
        profileData.two_factor_enabled ? 1 : 0,
        now,
        now
      )
      .run();
  } else {
    // Update existing profile
    await c.env.DB.prepare(
      `UPDATE user_profiles SET 
        phone_number = ?, business_name = ?, role = ?, preferred_reminder_channel = ?,
        reminder_frequency = ?, reminder_time_preference = ?, two_factor_enabled = ?, 
        updated_at = ?
       WHERE user_id = ?`
    )
      .bind(
        profileData.phone_number || null,
        profileData.business_name || null,
        profileData.role || null,
        profileData.preferred_reminder_channel || 'whatsapp',
        profileData.reminder_frequency || '30_days',
        profileData.reminder_time_preference || 'morning',
        profileData.two_factor_enabled ? 1 : 0,
        now,
        user.id
      )
      .run();
  }

  // Log the activity
  await c.env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action_type, description, created_at) 
     VALUES (?, 'profile_update', 'Updated profile settings', ?)`
  )
    .bind(user.id, now)
    .run();

  return c.json({ success: true });
});

// Activity logs route
app.get("/api/activity-logs", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
  )
    .bind(user.id)
    .all();

  return c.json(results);
});

// Send test reminder
app.post("/api/documents/:id/test-reminder", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const id = parseInt(c.req.param("id"));
  
  try {
    const reminderService = new ReminderService(c.env, c.env.DB);
    const sent = await reminderService.sendTestReminder(user.id, id);
    
    if (sent) {
      return c.json({ success: true, message: "Test reminder sent successfully" });
    } else {
      return c.json({ error: "Failed to send test reminder" }, 500);
    }
  } catch (error) {
    console.error('Test reminder error:', error);
    return c.json({ error: "Failed to send test reminder" }, 500);
  }
});

// Get reminder history for a document
app.get("/api/documents/:id/reminders", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const id = c.req.param("id");
  
  const { results } = await c.env.DB.prepare(
    `SELECT r.*, d.title as document_title 
     FROM reminders r
     JOIN documents d ON r.document_id = d.id
     WHERE r.document_id = ? AND r.user_id = ? 
     ORDER BY r.reminder_date DESC LIMIT 50`
  )
    .bind(id, user.id)
    .all();

  return c.json(results);
});

// Get all reminders for user
app.get("/api/reminders", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT r.*, d.title as document_title, d.expiration_date, d.is_critical
     FROM reminders r
     JOIN documents d ON r.document_id = d.id
     WHERE r.user_id = ? 
     ORDER BY r.reminder_date DESC LIMIT 100`
  )
    .bind(user.id)
    .all();

  return c.json(results);
});

// Manual trigger for reminder processing (admin endpoint)
app.post("/api/admin/process-reminders", async (c) => {
  try {
    const reminderService = new ReminderService(c.env, c.env.DB);
    await reminderService.processReminders();
    return c.json({ success: true, message: "Reminder processing completed" });
  } catch (error) {
    console.error('Manual reminder processing error:', error);
    return c.json({ error: "Failed to process reminders" }, 500);
  }
});



// Feedback routes
app.post("/api/feedback", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const feedbackData = await c.req.json();
  const now = new Date().toISOString();

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO feedback (
        user_id, feedback_type, subject, message, user_email, user_name, 
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)`
    )
      .bind(
        user.id,
        feedbackData.feedback_type || 'general',
        feedbackData.subject || null,
        feedbackData.message,
        user.email,
        user.google_user_data?.name || null,
        now,
        now
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to save feedback');
    }

    // Log the activity
    await c.env.DB.prepare(
      `INSERT INTO activity_logs (user_id, action_type, description, created_at) 
       VALUES (?, 'feedback_submitted', 'Submitted feedback', ?)`
    )
      .bind(user.id, now)
      .run();

    return c.json({ success: true, message: "Feedback submitted successfully" });
  } catch (error) {
    console.error('Failed to save feedback:', error);
    return c.json({ error: "Failed to submit feedback" }, 500);
  }
});

app.get("/api/admin/feedback", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT f.*, u.google_user_data 
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC LIMIT 100`
    ).all();

    return c.json(results);
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return c.json({ error: "Failed to fetch feedback" }, 500);
  }
});
