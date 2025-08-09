import z from "zod";

// Document schema and types
export const DocumentSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  document_type: z.string().nullable(),
  expiration_date: z.string(), // ISO date string
  renewal_period_days: z.number().nullable(),
  is_critical: z.boolean(),
  status: z.string(),
  last_renewed_date: z.string().nullable(),
  next_reminder_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  document_type: z.string().optional(),
  expiration_date: z.string().min(1, "Expiration date is required"),
  renewal_period_days: z.number().min(1).optional(),
  is_critical: z.boolean().default(false),
});

export const UpdateDocumentSchema = CreateDocumentSchema.partial();

// Reminder schema and types
export const ReminderSchema = z.object({
  id: z.number(),
  document_id: z.number(),
  user_id: z.string(),
  reminder_date: z.string(),
  reminder_type: z.string(),
  is_sent: z.boolean(),
  whatsapp_message_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Team member schema and types
export const TeamMemberSchema = z.object({
  id: z.number(),
  document_id: z.number(),
  user_id: z.string(),
  invited_email: z.string(),
  role: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Inferred types
export type Document = z.infer<typeof DocumentSchema>;
export type CreateDocument = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>;
export type Reminder = z.infer<typeof ReminderSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;

// Document types enum
export const DOCUMENT_TYPES = [
  'Contract',
  'License',
  'Insurance',
  'Permit',
  'Lease',
  'Subscription',
  'Certification',
  'Other'
] as const;

export const REMINDER_TYPES = [
  '30_days',
  '14_days',
  '7_days',
  '3_days',
  '1_day'
] as const;

export const DOCUMENT_STATUSES = [
  'active',
  'expired',
  'renewed',
  'cancelled'
] as const;
