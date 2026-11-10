CREATE TABLE transfer_batches (
 id text PRIMARY KEY,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND data->>'id'=id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(jsonb_array_length(data->'request'->'items') BETWEEN 1 AND 200)
);
CREATE UNIQUE INDEX transfer_batches_reference_idx ON transfer_batches((data->>'reference'));
CREATE INDEX transfer_batches_run_idx ON transfer_batches((data->>'runId'));
GRANT SELECT,INSERT,UPDATE ON transfer_batches TO attest_app;

-- KML may contain multiple project parcels and interior exclusion rings.
ALTER TABLE projects ALTER COLUMN boundary TYPE geometry(MultiPolygon,4326)
 USING ST_Multi(boundary);
ALTER TABLE projects ADD CONSTRAINT projects_valid_boundary CHECK(boundary IS NULL OR ST_IsValid(boundary));
