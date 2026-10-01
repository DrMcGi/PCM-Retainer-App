CREATE TABLE IF NOT EXISTS retainer_agreements (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE,
  contract_number TEXT NOT NULL UNIQUE,
  agreement_version TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  monthly_fee INTEGER NOT NULL CHECK (monthly_fee > 0),
  list_fee INTEGER NOT NULL CHECK (list_fee >= monthly_fee),
  company_name TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  representative_role TEXT NOT NULL,
  representative_email TEXT NOT NULL,
  signature_png BYTEA NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  signer_ip TEXT,
  signer_user_agent TEXT,
  agreement_snapshot JSONB NOT NULL,
  pdf_bytes BYTEA NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sent', 'partial', 'failed')),
  email_error TEXT,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS retainer_agreements_signed_at_idx
  ON retainer_agreements (signed_at DESC);