import {
  forceCode,
  setAdmin,
  setOpsEmpty,
  setPeriod,
  setProjectStatus,
  setRegisterSize,
  setRosterSize,
} from "./devControl";

/* Every state each public screen lists, with what has to be arranged for it
   and the screen it is on. The exit checklists say a state is reachable from
   /dev/states; this is what makes that true by clicking rather than by
   editing a fixture. */

type State = { label: string; href: string; arrange: () => Promise<void> };

const clear = async () => {
  await forceCode(null, null, false);
  await setRegisterSize(null);
  await setProjectStatus("proj_ekuri", null);
  await setRosterSize("proj_ekuri", null);
  await setPeriod("proj_ekuri", { closesOn: null, state: null });
  await setOpsEmpty(false);
  /* The admin queues are mutated in place by decisions, so clearing also
     puts them back: without this, every admin state below is one-shot. */
  await setAdmin({ empty: false, reset: true });
};

export const STATE_INDEX: { path: string; states: State[] }[] = [
  {
    path: "/register",
    states: [
      { label: "Populated", href: "/register", arrange: clear },
      {
        label: "Search returns nothing",
        href: "/register?q=zzzz",
        arrange: clear,
      },
      {
        label: "Filter returns nothing",
        href: "/register?country=Kenya",
        arrange: clear,
      },
      { label: "Sorted by coverage", href: "/register?sort=coverage", arrange: clear },
      { label: "Paginated", href: "/register?per_page=20&page=2", arrange: async () => { await clear(); await setRegisterSize(500); } },
      { label: "Register empty", href: "/register", arrange: async () => { await clear(); await setRegisterSize(0); } },
      { label: "Rate limited", href: "/register", arrange: async () => { await clear(); await forceCode("RATE_LIMITED", "/api/public/register", false); } },
    ],
  },
  {
    path: "/register/[projectId]",
    states: [
      { label: "Many periods", href: "/register/proj_ekuri", arrange: clear },
      { label: "One period", href: "/register/proj_delta", arrange: clear },
      { label: "No period closed", href: "/register/proj_oban", arrange: clear },
      { label: "Closed late, marked", href: "/register/proj_ekuri", arrange: clear },
      { label: "Correction, both records", href: "/register/proj_ekuri", arrange: clear },
      { label: "Suspended", href: "/register/proj_ekuri", arrange: async () => { await clear(); await setProjectStatus("proj_ekuri", "suspended"); } },
      { label: "Withdrawn", href: "/register/proj_ekuri_pilot", arrange: clear },
      { label: "Not found", href: "/register/proj_nothing", arrange: clear },
    ],
  },
  {
    path: "/developers/[developerId]",
    states: [
      { label: "Several projects", href: "/developers/dev_ekuri", arrange: clear },
      { label: "Single project", href: "/developers/dev_delta", arrange: clear },
      { label: "One withdrawn", href: "/developers/dev_ekuri", arrange: clear },
      { label: "No closed periods", href: "/developers/dev_oban", arrange: clear },
    ],
  },
  {
    path: "/attestation/[id]",
    states: [
      { label: "Valid", href: "/attestation/att_ekuri_2026q3", arrange: clear },
      { label: "Superseded by a correction", href: "/attestation/att_ekuri_2026q3", arrange: clear },
      { label: "The correction itself", href: "/attestation/att_ekuri_2026q3_correction", arrange: clear },
      { label: "Anchor pending", href: "/attestation/att_ekuri_pilot_2026q1", arrange: clear },
      { label: "Chain discontinuity", href: "/attestation/att_ekuri_2026q2", arrange: async () => { await clear(); await forceCode("CHAIN_DISCONTINUITY", "/api/public/attestations", false); } },
    ],
  },
  {
    path: "/verify",
    states: [
      { label: "Nothing checked", href: "/verify", arrange: clear },
      { label: "Anchor unreachable", href: "/verify", arrange: async () => { await clear(); await forceCode("ANCHOR_UNREACHABLE", "/api/verify", false); } },
    ],
  },
  {
    path: "/report",
    states: [
      { label: "Form", href: "/report", arrange: clear },
      { label: "Rate limited", href: "/report", arrange: async () => { await clear(); await forceCode("RATE_LIMITED", "/api/disputes", false); } },
      { label: "Project not found", href: "/report", arrange: async () => { await clear(); await forceCode("NOT_FOUND", "/api/disputes", false); } },
    ],
  },
  {
    path: "/receipt/[token]",
    states: [
      { label: "Valid", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: clear },
      { label: "No payments yet", href: "/receipt/rct_unpaid_2026q4", arrange: clear },
      { label: "Token expired", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: async () => { await clear(); await forceCode("TOKEN_EXPIRED", "/api/receipt", false); } },
      { label: "Already confirmed", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: async () => { await clear(); await forceCode("ALREADY_CONFIRMED", "/api/receipt", false); } },
      { label: "Dispute already open", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: async () => { await clear(); await forceCode("DISPUTE_ALREADY_OPEN", "/api/receipt", false); } },
      { label: "Unknown token", href: "/receipt/rct_nothing", arrange: clear },
    ],
  },
  {
    path: "/get-started · /signup · /signin",
    states: [
      { label: "Role selection", href: "/get-started", arrange: clear },
      { label: "Sign up, developer", href: "/signup/developer", arrange: clear },
      { label: "Sign up, institution", href: "/signup/institution", arrange: clear },
      { label: "Weak password named", href: "/signup/developer?state=weak-password", arrange: clear },
      { label: "Organisation missing", href: "/signup/developer?state=invalid&field=organisation", arrange: clear },
      { label: "Already registered", href: "/signup/developer?state=error&code=DUPLICATE_REQUEST", arrange: clear },
      { label: "Verification email sent", href: "/signup/developer?state=sent&email=operations%40ekuri-initiative.ng", arrange: clear },
      { label: "Verification complete", href: "/verify-email?token=vrf_live_0041", arrange: clear },
      { label: "Verification link expired", href: "/verify-email?token=vrf_expired_0041", arrange: clear },
      { label: "Verification link unknown", href: "/verify-email?token=vrf_unknown", arrange: clear },
      { label: "A new link sent", href: "/verify-email?state=sent&email=operations%40ekuri-initiative.ng", arrange: clear },
      { label: "Sign in", href: "/signin", arrange: clear },
      { label: "Invalid credentials", href: "/signin?state=error&code=NOT_FOUND", arrange: clear },
      { label: "Account locked", href: "/signin?state=error&code=FORBIDDEN", arrange: clear },
      { label: "Unverified, with resend", href: "/signin?state=unverified&email=unverified%40ekuri-initiative.ng", arrange: clear },
      { label: "Session expired mid-task", href: "/signin?state=expired&next=%2Fapp%2Froster", arrange: clear },
      { label: "Session expired, issued by the console", href: "/app", arrange: async () => { await clear(); await forceCode("FORBIDDEN", "/api/auth/session", false); } },
      { label: "Reset requested", href: "/signin/reset?state=sent", arrange: clear },
      { label: "Reset link expired", href: "/signin/reset?state=error&code=TOKEN_EXPIRED", arrange: clear },
      { label: "Reset complete", href: "/signin/reset?state=done", arrange: clear },
    ],
  },
  {
    path: "/invite/[code]",
    states: [
      { label: "Valid", href: "/invite/inv_7KQ2M4", arrange: clear },
      { label: "Expired", href: "/invite/inv_expired_4M2K", arrange: clear },
      { label: "Already redeemed", href: "/invite/inv_redeemed_8QT1", arrange: clear },
      { label: "Revoked", href: "/invite/inv_revoked_3PX9", arrange: clear },
      { label: "Identity verification pending", href: "/invite/inv_7KQ2M4?state=identity-pending", arrange: clear },
      { label: "Identity mismatch", href: "/invite/inv_7KQ2M4?state=error&code=IDENTITY_MISMATCH", arrange: clear },
      { label: "Identity unreachable", href: "/invite/inv_7KQ2M4?state=error&code=IDENTITY_UNREACHABLE", arrange: clear },
      { label: "Device unbound", href: "/invite/inv_7KQ2M4?state=error&code=DEVICE_UNBOUND", arrange: clear },
      { label: "Device bound", href: "/invite/inv_7KQ2M4?state=bound", arrange: clear },
    ],
  },
  {
    path: "/onboarding/developer",
    states: [
      { label: "1 · Project", href: "/onboarding/developer/project", arrange: clear },
      { label: "1 · Registry not found", href: "/onboarding/developer/project?state=error&code=REGISTRY_NOT_FOUND", arrange: clear },
      { label: "1 · Registry unreachable, manual entry", href: "/onboarding/developer/project?state=error&code=REGISTRY_UNREACHABLE", arrange: clear },
      { label: "1 · Manual entry queued", href: "/onboarding/developer/project?state=queued", arrange: clear },
      { label: "2 · Verify the record", href: "/onboarding/developer/verify", arrange: clear },
      { label: "3 · Commitment", href: "/onboarding/developer/commitment", arrange: clear },
      { label: "3 · PDD unreadable", href: "/onboarding/developer/commitment?state=error&code=PDD_UNREADABLE", arrange: clear },
      { label: "3 · No commitment in it", href: "/onboarding/developer/commitment?state=error&code=PDD_NO_COMMITMENT", arrange: clear },
      { label: "3 · Extraction low confidence", href: "/onboarding/developer/commitment?state=error&code=EXTRACTION_LOW_CONFIDENCE", arrange: clear },
      { label: "3 · Extraction service silent", href: "/onboarding/developer/commitment?state=error&code=MODEL_UNAVAILABLE", arrange: clear },
      { label: "3 · Correction needs a reason", href: "/onboarding/developer/commitment?state=no-reason", arrange: clear },
      { label: "4 · Account", href: "/onboarding/developer/account", arrange: clear },
      { label: "4 · KYB pending", href: "/onboarding/developer/account?state=pending", arrange: clear },
      { label: "4 · KYB rejected", href: "/onboarding/developer/account?state=rejected", arrange: clear },
      { label: "5 · Live, the real page at zero", href: "/onboarding/developer/live", arrange: clear },
      { label: "Resumed from where it was left", href: "/onboarding/developer", arrange: clear },
    ],
  },
  {
    path: "/onboarding/institution",
    states: [
      { label: "1 · Organisation", href: "/onboarding/institution/organisation", arrange: clear },
      { label: "2 · Watchlist", href: "/onboarding/institution/watchlist", arrange: clear },
      { label: "Resumed", href: "/onboarding/institution", arrange: clear },
    ],
  },
  {
    path: "/ops · bank operations",
    states: [
      { label: "This period", href: "/ops", arrange: clear },
      { label: "Nothing open", href: "/ops", arrange: async () => { await clear(); await setOpsEmpty(true); } },
      { label: "The cases could not be read", href: "/ops", arrange: async () => { await clear(); await forceCode("FORBIDDEN", "/api/ops/cases", false); } },
      { label: "Signals", href: "/ops/signals", arrange: clear },
      { label: "Signals, one class", href: "/ops/signals?class=velocity", arrange: clear },
      { label: "Signals, looked at first", href: "/ops/signals?severity=high", arrange: clear },
      { label: "Signals, none", href: "/ops/signals?state=none", arrange: clear },
      { label: "A signal already on a case", href: "/ops/signals?state=attached", arrange: clear },
      { label: "The account graph", href: "/ops/signals/sig_0231", arrange: clear },
      { label: "The graph, drawing", href: "/ops/signals/sig_0231?graph=loading", arrange: clear },
      { label: "No onward movement", href: "/ops/signals/sig_0231?graph=none", arrange: clear },
      { label: "Movement entirely ordinary", href: "/ops/signals/sig_0231?graph=ordinary", arrange: clear },
      { label: "Cases", href: "/ops/cases", arrange: clear },
      { label: "An action awaiting authorisation", href: "/ops/cases?action=pending", arrange: clear },
      { label: "An action refused", href: "/ops/cases", arrange: async () => { await clear(); await forceCode("FORBIDDEN", "/action", false); } },
      { label: "A case substantiated", href: "/ops/cases", arrange: clear },
      { label: "A case closed", href: "/ops/cases", arrange: clear },
      { label: "A period awaiting settlement data", href: "/ops/reconciliation", arrange: clear },
      { label: "Verification exceptions", href: "/ops/exceptions", arrange: clear },
      { label: "No exception open", href: "/ops/exceptions?state=none", arrange: clear },
      { label: "Reconciliation", href: "/ops/reconciliation", arrange: clear },
    ],
  },
  {
    path: "/verifier · the verifier portal",
    states: [
      { label: "Watchlist", href: "/verifier", arrange: clear },
      { label: "Nothing on the watchlist", href: "/verifier?watchlist=empty", arrange: clear },
      { label: "Nothing changed since last visit", href: "/verifier?since=now", arrange: clear },
      { label: "Projects", href: "/verifier/projects", arrange: clear },
      { label: "Projects, filtered", href: "/verifier/projects?q=ekuri", arrange: clear },
      { label: "Projects, filtered to nothing", href: "/verifier/projects?q=zzzzzz", arrange: clear },
      { label: "A project in detail", href: "/verifier/projects/proj_ekuri", arrange: clear },
      { label: "A project with signals", href: "/verifier/projects/proj_delta", arrange: clear },
      { label: "A suspended project", href: "/verifier/projects/proj_ekuri", arrange: async () => { await clear(); await setProjectStatus("proj_ekuri", "suspended"); } },
      { label: "Compare, nothing chosen", href: "/verifier/compare", arrange: clear },
      { label: "Compare, two projects", href: "/verifier/compare?ids=proj_ekuri,proj_hadejia", arrange: clear },
      { label: "Compare, three projects", href: "/verifier/compare?ids=proj_ekuri,proj_hadejia,proj_delta", arrange: clear },
      { label: "Compare, no period in common", href: "/verifier/compare?ids=proj_ekuri,proj_oban", arrange: clear },
      { label: "Export", href: "/verifier/export", arrange: clear },
      { label: "Export ready", href: "/verifier/export?state=ready", arrange: clear },
      { label: "Export failed", href: "/verifier/export?state=failed", arrange: clear },
      { label: "Alerts", href: "/verifier/alerts", arrange: clear },
      { label: "No alert configured", href: "/verifier/alerts?configured=none", arrange: clear },
      { label: "An alert fired", href: "/verifier/alerts?fired=alr_0001", arrange: clear },
    ],
  },
  {
    path: "/field · the field app",
    states: [
      { label: "Today, online", href: "/field", arrange: clear },
      { label: "Today, device not bound", href: "/field", arrange: async () => { await clear(); await forceCode("DEVICE_UNBOUND", "/api/field/me", false); } },
      { label: "Capture, step one", href: "/field/enrol", arrange: clear },
      { label: "Capture, consent not given", href: "/field/enrol?step=identity", arrange: clear },
      { label: "Queue", href: "/field/queue", arrange: clear },
      { label: "Your record", href: "/field/me", arrange: clear },
      { label: "Your record, flag rate above the threshold", href: "/field/me", arrange: clear },
      { label: "A submitted enrolment, read-only", href: "/field/enrolment/enr_000001", arrange: clear },
      { label: "Capture, consent step", href: "/field/enrol?step=consent", arrange: clear },
      { label: "Capture, identity", href: "/field/enrol?step=identity", arrange: clear },
      { label: "Capture, details", href: "/field/enrol?step=details", arrange: clear },
      { label: "Capture, photograph", href: "/field/enrol?step=photograph", arrange: clear },
      { label: "Capture, location", href: "/field/enrol?step=location", arrange: clear },
      { label: "Capture, review", href: "/field/enrol?step=review", arrange: clear },
    ],
  },
  {
    path: "/app · the console",
    states: [
      { label: "Home", href: "/app", arrange: clear },
      { label: "Pre-first-enrolment", href: "/app", arrange: async () => { await clear(); await setRosterSize("proj_ekuri", 0); } },
      { label: "Account suspended", href: "/app", arrange: async () => { await clear(); await setProjectStatus("proj_ekuri", "suspended"); } },
      { label: "Suspended, run builder refuses", href: "/app/runs/new", arrange: async () => { await clear(); await setProjectStatus("proj_ekuri", "suspended"); } },
      { label: "Period closing within 72 hours", href: "/app", arrange: async () => { await clear(); await setPeriod("proj_ekuri", { closesOn: "2026-11-12T23:59:59Z" }); } },
      { label: "Period closed", href: "/app", arrange: async () => { await clear(); await setPeriod("proj_ekuri", { state: "closed" }); } },
      { label: "Pre-flight, exclusions outstanding", href: "/app/runs/new?step=preflight", arrange: clear },
      { label: "Reconciliation mismatch", href: "/app/funding", arrange: async () => { await clear(); await forceCode("RECONCILIATION_MISMATCH", "/api/projects", false); } },
      { label: "Report awaiting the participant", href: "/app/disputes/dsp_0002", arrange: clear },
      { label: "Report substantiated", href: "/app/disputes/dsp_0006", arrange: clear },
      { label: "Roster", href: "/app/roster", arrange: clear },
      { label: "Roster filtered", href: "/app/roster?status=flagged", arrange: clear },
      { label: "Roster filtered to nothing", href: "/app/roster?q=zzzzzz", arrange: clear },
      { label: "Roster empty", href: "/app/roster", arrange: async () => { await clear(); await setRosterSize("proj_ekuri", 0); } },
      { label: "Roster at ten thousand", href: "/app/roster", arrange: async () => { await clear(); await setRosterSize("proj_ekuri", 10000); } },
      { label: "Import partially failed", href: "/app/roster?import=partial", arrange: clear },
      { label: "Household flagged", href: "/app/roster/ptc_000090", arrange: clear },
      { label: "Household excluded", href: "/app/roster/ptc_000174", arrange: clear },
      { label: "Household removed", href: "/app/roster/ptc_000458", arrange: clear },
      { label: "Household duplicate-blocked", href: "/app/roster/ptc_000614", arrange: clear },
      { label: "Agents", href: "/app/agents", arrange: clear },
      { label: "Agent suspended", href: "/app/agents/agt_0004", arrange: clear },
      { label: "Agent with no enrolments", href: "/app/agents/agt_0005", arrange: clear },
      { label: "Runs", href: "/app/runs", arrange: clear },
      { label: "Run builder, arithmetic", href: "/app/runs/new?step=arithmetic", arrange: clear },
      { label: "Run builder, shortfall at confirm", href: "/app/runs/new?step=confirm&funding=short", arrange: clear },
      { label: "Run live", href: "/app/runs/run_2026q4", arrange: clear },
      { label: "Run complete with failures", href: "/app/runs/run_2026q3", arrange: clear },
      { label: "Funding", href: "/app/funding", arrange: clear },
      { label: "Reports", href: "/app/disputes", arrange: clear },
      { label: "Attestations", href: "/app/attestations", arrange: clear },
      { label: "Settings", href: "/app/settings", arrange: clear },
    ],
  },
  {
    /* Platform admin. It was absent from this index while the chain monitor
       was the one screen in the product whose whole reason for existing — a
       record that does not follow the one before it — could not be put on the
       screen. The forced states below are what make it reachable. */
    path: "/admin",
    states: [
      { label: "Something waiting in every queue", href: "/admin", arrange: clear },
      { label: "A queue did not answer", href: "/admin", arrange: async () => { await clear(); await forceCode("MODEL_UNAVAILABLE", "/api/admin/extraction", false); } },
      { label: "Nothing on the screen was read", href: "/admin", arrange: async () => { await clear(); await forceCode("REGISTRY_UNREACHABLE", "/api/admin", false); } },
      { label: "Nothing waiting in any queue", href: "/admin", arrange: async () => { await clear(); await setAdmin({ empty: true }); } },
      { label: "Onboarding review", href: "/admin/onboarding", arrange: clear },
      { label: "Onboarding queue refused", href: "/admin/onboarding", arrange: async () => { await clear(); await forceCode("FORBIDDEN", "/api/admin/onboarding", false); } },
      { label: "Onboarding queue empty", href: "/admin/onboarding", arrange: async () => { await clear(); await setAdmin({ empty: true }); } },
      { label: "Registry sync", href: "/admin/registry", arrange: clear },
      { label: "Registry sync refused", href: "/admin/registry", arrange: async () => { await clear(); await forceCode("FORBIDDEN", "/api/admin/registry", false); } },
      { label: "No registry connected", href: "/admin/registry", arrange: async () => { await clear(); await setAdmin({ empty: true }); } },
      { label: "Extraction review", href: "/admin/extraction", arrange: clear },
      { label: "Extraction queue refused", href: "/admin/extraction", arrange: async () => { await clear(); await forceCode("MODEL_UNAVAILABLE", "/api/admin/extraction", false); } },
      { label: "Extraction queue empty", href: "/admin/extraction", arrange: async () => { await clear(); await setAdmin({ empty: true }); } },
      { label: "Escalations", href: "/admin/escalations", arrange: clear },
      { label: "Escalations refused", href: "/admin/escalations", arrange: async () => { await clear(); await forceCode("FORBIDDEN", "/api/admin/escalations", false); } },
      { label: "No report escalated", href: "/admin/escalations", arrange: async () => { await clear(); await setAdmin({ empty: true }); } },
      { label: "The chain refused", href: "/admin/chain", arrange: async () => { await clear(); await forceCode("FORBIDDEN", "/api/admin/chain", false); } },
      { label: "No record published, no chain", href: "/admin/chain", arrange: async () => { await clear(); await setAdmin({ empty: true }); } },
      { label: "The chain, every record following", href: "/admin/chain", arrange: clear },
      { label: "The chain, a record that does not follow", href: "/admin/chain", arrange: async () => { await clear(); await forceCode("CHAIN_DISCONTINUITY", "/api/admin/chain", false); } },
      { label: "The chain, a record waiting to anchor", href: "/admin/chain", arrange: async () => { await clear(); await forceCode("ANCHOR_PENDING", "/api/admin/chain", false); } },
      { label: "The chain, the anchor unreachable", href: "/admin/chain", arrange: async () => { await clear(); await forceCode("ANCHOR_UNREACHABLE", "/api/admin/chain", false); } },
    ],
  },
];
