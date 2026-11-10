-- Typed, indexed projections keep the wire document and relational model consistent.
CREATE FUNCTION attest_audit_state() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE snapshot jsonb; prior jsonb; audit_id text;
BEGIN
  snapshot := CASE WHEN TG_OP='DELETE' THEN OLD.data ELSE NEW.data END;
  prior := CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.data END;
  IF TG_OP='UPDATE' AND OLD.data=NEW.data THEN RETURN NEW; END IF;
  audit_id := md5(random()::text || clock_timestamp()::text || (snapshot->>'id'));
  INSERT INTO audit(id,data) VALUES(audit_id,jsonb_build_object(
    'id',audit_id,'createdAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'principal',coalesce(nullif(current_setting('attest.actor',true),''),'database'),
    'action',lower(TG_TABLE_NAME||'.'||TG_OP),'projectId',snapshot->>'projectId',
    'entityId',snapshot->>'id','before',prior,'after',CASE WHEN TG_OP='DELETE' THEN NULL ELSE NEW.data END));
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE TRIGGER participants_state_audit AFTER INSERT OR UPDATE OR DELETE ON participants FOR EACH ROW EXECUTE FUNCTION attest_audit_state();
CREATE TRIGGER runs_state_audit AFTER INSERT OR UPDATE OR DELETE ON runs FOR EACH ROW EXECUTE FUNCTION attest_audit_state();
CREATE TRIGGER disputes_state_audit AFTER INSERT OR UPDATE OR DELETE ON disputes FOR EACH ROW EXECUTE FUNCTION attest_audit_state();
CREATE TRIGGER cases_state_audit AFTER INSERT OR UPDATE OR DELETE ON cases FOR EACH ROW EXECUTE FUNCTION attest_audit_state();
CREATE TRIGGER rosters_state_audit AFTER INSERT OR UPDATE OR DELETE ON rosters FOR EACH ROW EXECUTE FUNCTION attest_audit_state();

CREATE FUNCTION forbid_participant_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'PARTICIPANT_DELETE_NOT_PERMITTED' USING ERRCODE='42501'; END $$;
CREATE TRIGGER participant_no_delete BEFORE DELETE ON participants FOR EACH ROW EXECUTE FUNCTION forbid_participant_delete();
REVOKE DELETE,TRUNCATE ON participants FROM attest_app;

CREATE FUNCTION attest_text_array(value jsonb) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(array_agg(x),'{}') FROM jsonb_array_elements_text(coalesce(value,'[]'::jsonb)) x $$;

ALTER TABLE projects ADD COLUMN organisation_id text GENERATED ALWAYS AS (data->>'organisationId') STORED,
 ADD COLUMN registry_id text GENERATED ALWAYS AS (data->>'registryId') STORED,
 ADD COLUMN name text GENERATED ALWAYS AS (data->>'name') STORED,
 ADD COLUMN country text GENERATED ALWAYS AS (data->>'country') STORED,
 ADD COLUMN methodology text GENERATED ALWAYS AS (data->>'methodology') STORED,
 ADD COLUMN status text GENERATED ALWAYS AS (data->>'status') STORED;

ALTER TABLE commitments ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN percentage numeric(7,4) GENERATED ALWAYS AS ((data->>'percentage')::numeric) STORED,
 ADD COLUMN basis text GENERATED ALWAYS AS (data->>'basis') STORED,
 ADD COLUMN cadence text GENERATED ALWAYS AS (data->>'cadence') STORED,
 ADD COLUMN beneficiary_definition text GENERATED ALWAYS AS (data->>'beneficiary_definition') STORED,
 ADD COLUMN source_quote text GENERATED ALWAYS AS (data->>'source_quote') STORED,
 ADD COLUMN source_page integer GENERATED ALWAYS AS ((data->>'page')::integer) STORED,
 ADD COLUMN accepted boolean GENERATED ALWAYS AS ((data->>'accepted')::boolean) STORED,
 ADD CONSTRAINT commitment_percentage_range CHECK (percentage BETWEEN 0 AND 100),
 ADD CONSTRAINT commitment_basis CHECK (basis IN ('gross','net'));

ALTER TABLE participants ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN agent_id text GENERATED ALWAYS AS (data->>'agentId') STORED,
 ADD COLUMN name text GENERATED ALWAYS AS (data->>'name') STORED,
 ADD COLUMN phone text GENERATED ALWAYS AS (data->>'phone') STORED,
 ADD COLUMN identity_hash text GENERATED ALWAYS AS (data->>'identityHash') STORED,
 ADD COLUMN identity_last_four text GENERATED ALWAYS AS (data->>'identityLastFour') STORED,
 ADD COLUMN account_number text GENERATED ALWAYS AS (data->>'accountNumber') STORED,
 ADD COLUMN bank_code text GENERATED ALWAYS AS (data->>'bankCode') STORED,
 ADD COLUMN kyc_level integer GENERATED ALWAYS AS ((data->>'kycLevel')::integer) STORED,
 ADD COLUMN resolved_account_name text GENERATED ALWAYS AS (data->>'resolvedAccountName') STORED,
 ADD COLUMN name_match text GENERATED ALWAYS AS (data->>'nameMatch') STORED,
 ADD COLUMN status text GENERATED ALWAYS AS (data->>'status') STORED,
 ADD COLUMN flags text[] GENERATED ALWAYS AS (attest_text_array(data->'flags')) STORED;

ALTER TABLE rosters ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN period text GENERATED ALWAYS AS (data->>'period') STORED,
 ADD COLUMN participant_ids text[] GENERATED ALWAYS AS (attest_text_array(data->'participantIds')) STORED;

ALTER TABLE runs ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN roster_id text GENERATED ALWAYS AS (data->>'rosterId') STORED,
 ADD COLUMN commitment_id text GENERATED ALWAYS AS (data->>'commitmentId') STORED,
 ADD COLUMN period text GENERATED ALWAYS AS (data->>'period') STORED,
 ADD COLUMN state text GENERATED ALWAYS AS (data->>'state') STORED,
 ADD COLUMN declared_gross numeric(18,2) GENERATED ALWAYS AS ((data->>'declaredGross')::numeric) STORED,
 ADD COLUMN declared_net numeric(18,2) GENERATED ALWAYS AS ((data->>'declaredNet')::numeric) STORED,
 ADD COLUMN funded numeric(18,2) GENERATED ALWAYS AS ((data->>'fundingAmount')::numeric) STORED;

ALTER TABLE transfers ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN run_id text GENERATED ALWAYS AS (data->>'runId') STORED,
 ADD COLUMN participant_id text GENERATED ALWAYS AS (data->>'participantId') STORED,
 ADD COLUMN reference text GENERATED ALWAYS AS (data->>'reference') STORED,
 ADD COLUMN amount numeric(18,2) GENERATED ALWAYS AS ((data->>'amount')::numeric) STORED,
 ADD COLUMN fee numeric(18,2) GENERATED ALWAYS AS ((data->>'fee')::numeric) STORED,
 ADD COLUMN vat numeric(18,2) GENERATED ALWAYS AS ((data->>'vat')::numeric) STORED,
 ADD COLUMN stamp_duty numeric(18,2) GENERATED ALWAYS AS ((data->>'stampDuty')::numeric) STORED,
 ADD COLUMN total_debit numeric(18,2) GENERATED ALWAYS AS ((data->>'totalDebit')::numeric) STORED,
 ADD COLUMN session_id text GENERATED ALWAYS AS (data->>'sessionId') STORED,
 ADD COLUMN state text GENERATED ALWAYS AS (data->>'state') STORED,
 ADD COLUMN failure_class text GENERATED ALWAYS AS (data->>'failureClass') STORED,
 ADD CONSTRAINT positive_transfer_amount CHECK (amount > 0);

ALTER TABLE confirmations ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN transfer_id text GENERATED ALWAYS AS (data->>'transferId') STORED,
 ADD COLUMN participant_id text GENERATED ALWAYS AS (data->>'participantId') STORED;
ALTER TABLE attestations ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN run_id text GENERATED ALWAYS AS (data->>'runId') STORED,
 ADD COLUMN period text GENERATED ALWAYS AS (data->>'period') STORED,
 ADD COLUMN hash text GENERATED ALWAYS AS (data->>'hash') STORED,
 ADD COLUMN signature text GENERATED ALWAYS AS (data->>'signature') STORED,
 ADD COLUMN document jsonb GENERATED ALWAYS AS (data->'document') STORED,
 ADD COLUMN amount_moved numeric(18,2) GENERATED ALWAYS AS ((data->'document'->>'amountMovedToHouseholds')::numeric) STORED,
 ADD COLUMN charges_borne numeric(18,2) GENERATED ALWAYS AS ((data->'document'->>'chargesBorne')::numeric) STORED;
ALTER TABLE disputes ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN transfer_id text GENERATED ALWAYS AS (data->>'transferId') STORED,
 ADD COLUMN category text GENERATED ALWAYS AS (data->>'category') STORED,
 ADD COLUMN status text GENERATED ALWAYS AS (data->>'status') STORED,
 ADD COLUMN resolution_basis text GENERATED ALWAYS AS (data->>'resolutionBasis') STORED;
ALTER TABLE signals ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN class text GENERATED ALWAYS AS (data->>'class') STORED,
 ADD COLUMN participant_ids text[] GENERATED ALWAYS AS (attest_text_array(data->'participantIds')) STORED;
ALTER TABLE agents ADD COLUMN project_id text GENERATED ALWAYS AS (data->>'projectId') STORED,
 ADD COLUMN name text GENERATED ALWAYS AS (data->>'name') STORED,
 ADD COLUMN status text GENERATED ALWAYS AS (data->>'status') STORED,
 ADD COLUMN device_key text GENERATED ALWAYS AS (data->>'deviceKey') STORED;
ALTER TABLE audit ADD COLUMN principal text GENERATED ALWAYS AS (data->>'principal') STORED,
 ADD COLUMN action text GENERATED ALWAYS AS (data->>'action') STORED,
 ADD COLUMN before_data jsonb GENERATED ALWAYS AS (data->'before') STORED,
 ADD COLUMN after_data jsonb GENERATED ALWAYS AS (data->'after') STORED;
CREATE INDEX participants_project_status_idx ON participants(project_id,status);
CREATE INDEX transfers_run_state_idx ON transfers(run_id,state);
CREATE INDEX attestations_project_period_idx ON attestations(project_id,period);
CREATE INDEX projects_organisation_idx ON projects(organisation_id);
