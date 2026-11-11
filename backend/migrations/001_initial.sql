CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='attest_app') THEN CREATE ROLE attest_app NOLOGIN; END IF; END $$;

CREATE TABLE "users" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "users_data_idx" ON "users" USING gin (data jsonb_path_ops);

CREATE TABLE "sessions" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "sessions_data_idx" ON "sessions" USING gin (data jsonb_path_ops);

CREATE TABLE "tokens" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "tokens_data_idx" ON "tokens" USING gin (data jsonb_path_ops);

CREATE TABLE "invites" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "invites_data_idx" ON "invites" USING gin (data jsonb_path_ops);

CREATE TABLE "projects" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "projects_data_idx" ON "projects" USING gin (data jsonb_path_ops);

CREATE TABLE "commitments" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "commitments_data_idx" ON "commitments" USING gin (data jsonb_path_ops);

CREATE TABLE "participants" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "participants_data_idx" ON "participants" USING gin (data jsonb_path_ops);

CREATE TABLE "agents" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "agents_data_idx" ON "agents" USING gin (data jsonb_path_ops);

CREATE TABLE "rosters" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "rosters_data_idx" ON "rosters" USING gin (data jsonb_path_ops);

CREATE TABLE "runs" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "runs_data_idx" ON "runs" USING gin (data jsonb_path_ops);

CREATE TABLE "transfers" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "transfers_data_idx" ON "transfers" USING gin (data jsonb_path_ops);

CREATE TABLE "confirmations" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "confirmations_data_idx" ON "confirmations" USING gin (data jsonb_path_ops);

CREATE TABLE "attestations" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "attestations_data_idx" ON "attestations" USING gin (data jsonb_path_ops);

CREATE TABLE "anchors" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "anchors_data_idx" ON "anchors" USING gin (data jsonb_path_ops);

CREATE TABLE "disputes" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "disputes_data_idx" ON "disputes" USING gin (data jsonb_path_ops);

CREATE TABLE "signals" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "signals_data_idx" ON "signals" USING gin (data jsonb_path_ops);

CREATE TABLE "cases" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "cases_data_idx" ON "cases" USING gin (data jsonb_path_ops);

CREATE TABLE "audit" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "audit_data_idx" ON "audit" USING gin (data jsonb_path_ops);

CREATE TABLE "jobs" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "jobs_data_idx" ON "jobs" USING gin (data jsonb_path_ops);

CREATE TABLE "receipts" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "receipts_data_idx" ON "receipts" USING gin (data jsonb_path_ops);

CREATE TABLE "events" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "events_data_idx" ON "events" USING gin (data jsonb_path_ops);

CREATE TABLE "idempotency" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "idempotency_data_idx" ON "idempotency" USING gin (data jsonb_path_ops);

CREATE TABLE "watchlist" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "watchlist_data_idx" ON "watchlist" USING gin (data jsonb_path_ops);

CREATE TABLE "alerts" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "alerts_data_idx" ON "alerts" USING gin (data jsonb_path_ops);

CREATE TABLE "notifications" (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data->>'id' = id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX "notifications_data_idx" ON "notifications" USING gin (data jsonb_path_ops);

ALTER TABLE projects ADD COLUMN boundary geometry(Polygon,4326);

CREATE INDEX projects_boundary_idx ON projects USING gist(boundary);

ALTER TABLE participants ADD COLUMN location geometry(Point,4326);

CREATE INDEX participants_location_idx ON participants USING gist(location);

CREATE UNIQUE INDEX participant_identity_unique ON participants ((data->>'identityHash'));

CREATE UNIQUE INDEX transfer_run_participant_unique ON transfers ((data->>'runId'), (data->>'participantId'));

CREATE UNIQUE INDEX transfer_reference_unique ON transfers ((data->>'reference'));

CREATE UNIQUE INDEX confirmation_transfer_unique ON confirmations ((data->>'transferId'));

CREATE UNIQUE INDEX user_email_unique ON users (lower(data->>'email'));

CREATE UNIQUE INDEX run_project_period_unique ON runs ((data->>'projectId'),(data->>'period'));

ALTER TABLE transfers ADD CONSTRAINT transfer_required_fields CHECK (data ?& ARRAY['runId','participantId','reference','amount','state']);

ALTER TABLE participants ADD CONSTRAINT participant_identity_required CHECK (data ?& ARRAY['identityHash','projectId','consent']);

CREATE FUNCTION forbid_record_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable record' USING ERRCODE = '42501'; END $$;

CREATE TRIGGER "attestations_immutable" BEFORE UPDATE OR DELETE ON "attestations" FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();

CREATE TRIGGER "audit_immutable" BEFORE UPDATE OR DELETE ON "audit" FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();

CREATE TRIGGER "confirmations_immutable" BEFORE UPDATE OR DELETE ON "confirmations" FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();

CREATE TRIGGER "events_immutable" BEFORE UPDATE OR DELETE ON "events" FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();

GRANT USAGE ON SCHEMA public TO attest_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO attest_app;

REVOKE UPDATE, DELETE, TRUNCATE ON "attestations" FROM attest_app;

REVOKE UPDATE, DELETE, TRUNCATE ON "audit" FROM attest_app;

REVOKE UPDATE, DELETE, TRUNCATE ON "confirmations" FROM attest_app;

REVOKE UPDATE, DELETE, TRUNCATE ON "events" FROM attest_app;

REVOKE ALL ON schema_migrations FROM attest_app;
