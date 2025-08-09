
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  business_name TEXT,
  role TEXT,
  preferred_reminder_channel TEXT DEFAULT 'whatsapp',
  reminder_frequency TEXT DEFAULT '30_days',
  reminder_time_preference TEXT DEFAULT 'morning',
  whatsapp_verified BOOLEAN DEFAULT 0,
  two_factor_enabled BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_document_id INTEGER,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
