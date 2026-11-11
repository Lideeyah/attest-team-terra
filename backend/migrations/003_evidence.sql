CREATE TABLE evidence(id text PRIMARY KEY,data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND data->>'id'=id),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX evidence_project_idx ON evidence((data->>'projectId'));
CREATE TABLE registry_history(id text PRIMARY KEY,data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND data->>'id'=id),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER registry_history_immutable BEFORE UPDATE OR DELETE ON registry_history FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();
GRANT SELECT,INSERT ON registry_history TO attest_app;
GRANT SELECT,INSERT ON evidence TO attest_app;
CREATE TRIGGER commitments_immutable BEFORE UPDATE OR DELETE ON commitments FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();
REVOKE UPDATE,DELETE,TRUNCATE ON commitments FROM attest_app;
