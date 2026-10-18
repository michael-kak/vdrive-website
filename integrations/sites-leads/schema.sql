-- Additive, Vdrive-only intake migration. Do not run against Xanadria or an unidentified Site.
CREATE TABLE IF NOT EXISTS vdrive_web_leads (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_digest TEXT NOT NULL,
  site_key TEXT NOT NULL CHECK(site_key = 'vdrive'),
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','closed','discarded')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  intent TEXT NOT NULL,
  contact_channel TEXT NOT NULL,
  request_json TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  consent_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vdrive_web_leads_status ON vdrive_web_leads(status,created_at);
CREATE TABLE IF NOT EXISTS vdrive_lead_outbox (
  lead_id TEXT PRIMARY KEY REFERENCES vdrive_web_leads(id) ON DELETE CASCADE,
  target TEXT NOT NULL CHECK(target = 'yuval'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed')),
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  receipt_id TEXT,
  next_attempt_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vdrive_lead_rate (
  requester_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  PRIMARY KEY(requester_hash,window_start)
);
