
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT,
  expiration_date DATE NOT NULL,
  renewal_period_days INTEGER,
  is_critical BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_renewed_date DATE,
  next_reminder_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_type TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT 0,
  whatsapp_message_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  invited_email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
