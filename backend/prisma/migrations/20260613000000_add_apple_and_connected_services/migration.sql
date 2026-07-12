-- AlterTable: Add Apple sign-in fields, accepted terms version
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_linked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_version TEXT;

-- CreateTable: Connected services (Google Photos, iCloud Photos, etc.)
CREATE TABLE IF NOT EXISTS connected_services (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scopes TEXT,
  expires_at TIMESTAMP,
  linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_connected_services_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_connected_services_user_id ON connected_services(user_id);
