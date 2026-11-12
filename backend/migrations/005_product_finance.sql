DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['incoming_receipts','automation_policies','allocations','funds_events','review_drafts','location_datasets','import_jobs','message_attempts'] LOOP
  EXECUTE format('CREATE TABLE %I (id text PRIMARY KEY,data jsonb NOT NULL CHECK(jsonb_typeof(data)=''object'' AND data->>''id''=id),created_at timestamptz NOT NULL DEFAULT clock_timestamp())',t);
  EXECUTE format('CREATE INDEX ON %I ((data->>''projectId''))',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO attest_app',t);
 END LOOP;
END $$;
CREATE UNIQUE INDEX income_business_unique ON incoming_receipts ((data->>'accountNumber'),(data->>'businessId'));
CREATE UNIQUE INDEX allocation_receipt_unique ON allocations ((data->>'receiptId'));
CREATE UNIQUE INDEX policy_revision_unique ON automation_policies ((data->>'projectId'),((data->>'revision')::integer));
CREATE TRIGGER funds_events_immutable BEFORE UPDATE OR DELETE ON funds_events FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();
CREATE TRIGGER automation_policies_immutable BEFORE UPDATE OR DELETE ON automation_policies FOR EACH ROW EXECUTE FUNCTION forbid_record_mutation();
REVOKE UPDATE ON funds_events,automation_policies FROM attest_app;
DROP INDEX run_project_period_unique;
CREATE UNIQUE INDEX run_project_period_unique ON runs ((data->>'projectId'),(data->>'period')) WHERE data->>'allocationId' IS NULL;
CREATE UNIQUE INDEX run_allocation_unique ON runs ((data->>'allocationId')) WHERE data->>'allocationId' IS NOT NULL;
