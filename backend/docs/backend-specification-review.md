# Review and plan: backend specification dated 10 November 2026

Implementation update, 11 November: the executable changes in this review are now implemented and tested. See [specification alignment](specification-alignment.md). The PDD-edition gap remains explicitly recorded; this document preserves the original review findings.

Reviewed `Attest-Backend-Specification (1).docx` against the original `Attest-Backend-Specification.docx` and the current implementation. This is a planning review. Application code, database schemas, provider implementations and the author-supplied specifications were not changed.

## Context correction: apply to pitch and explanatory copy

The user's correction takes precedence over section 0, which still contains the earlier wording in the new Word document:

- Plan Vivo: **at least 60%**, rather than an unqualified fixed 60% standard-wide claim.
- Acorn: farmers receive **up to 80%**, rather than a flat 80%.
- Kenya: the land-based segment's minimum is **40%** under the Climate Change (Carbon Markets) Regulations 2024. The 25% figure belongs to the non-land-based category.
- Farm Africa: **7,375 of 21,658 enrolled farmers had sold any carbon by the close of 2023**, according to *Growing Green*. This does not establish how many had been paid.

These corrections do not change payment arithmetic, API contracts, schema, providers or integrations. A project's actual accepted commitment remains sourced from its own document. In particular, they do not justify replacing the real TGB PDD's 60% commitment with another number. Existing original concept/product/backend documents may still carry superseded pitch wording; flag that wording wherever it is reused rather than treating it as evidence of payment coverage.

## What changed between the two Word documents

| Topic | Original document | New document |
| --- | --- | --- |
| Authority/version | 9 November backend specification | Dated 10 November; explicitly supersedes the original and folds in patches 01/02 and demo seed values |
| Segment | General carbon benefit sharing | Explicitly community-led land-based projects; excludes cookstove/distributed-energy projects |
| Registry | Gold Standard seed | Plan Vivo project reference and Markit issuance history |
| Bulk enquiry | Incomplete probes; uncertainty about per-item enquiry references | Explicit `auto_name_enquiry: true`; account-name enquiry still occurs at enrolment |
| Identity | Partly inferred verification request | Explicit `first_name`, `last_name`, `date_of_birth`; retain per-field decisions and `watchlisted` |
| Boundary contract | Registry auto-fetch assumed | `BOUNDARY_NOT_AVAILABLE`, KML upload, and `POST /api/registry/boundary` accepting `{kml, name}` and returning `{name, points, areaHectares}` |
| Seed | An unspecified real Gold Standard project | Trees for Global Benefits, ECOTRUST, Uganda; named reference statistics and a particular commitment locator |
| Commitment source | Generic real source quotation | A.13.1 / Table 5; 60%, gross, staged against verification, participating farmers, verbatim quotation |
| Demo disclosure | Synthetic identifiers and seeded scenarios | Explicit demonstration label and synthetic-payment notice on the public register row and project page; simulated values must not read as ECOTRUST performance |
| Annual-report asset | Not prescribed in the original | Published 2024 report downloaded into `demo/` |
| Report | Signed attestations and standard verifier export | A benefit-sharing payment summary, PDF with crop marks and machine-readable payload, at `GET /api/attestations/:id/report` |
| Bank item errors | Per-transfer states/error classes | Explicit mapping of item `status`, `error_code` and `message` |
| Open questions | Auto-enquiry, egress and bulk request behavior unresolved | Auto-enquiry and egress marked answered; request accounting and resolved per-item account names still listed for confirmation |

The new Word document does **not** itself contain the corrected Plan Vivo/Acorn/Kenya/Farm Africa paragraph supplied by the user. Treat that correction as a separate editorial override.

## What is already in this build, and what remains different

| Requirement | Current implementation | Remaining work |
| --- | --- | --- |
| Land-based / Plan Vivo demo | Implemented using TGB reference data | Verify and add the newly prescribed reference statistics with provenance; keep them distinct from the 500 simulated payment households |
| Auto-enquiry and identity fields | Implemented; auto-enquiry accepted in a small live mixed-bank batch | Retain existing behavior; no replacement banking integration is needed |
| 200-item batches | Durable batches, stable keys, safe unknown-outcome recovery and shared request budget | Preserve this; the new prose's 500-item single-request claim conflicts with the participant contract |
| KML parsing and storage | Secure XML parsing, polygons/multipolygons/holes, PostGIS validation, missing-boundary state; existing project-scoped multipart upload | Add the exact new global JSON preview/parse contract and calculate area in hectares; agree the `points` representation in shared types |
| Benefit-sharing report | Signed JSON/PDF already implemented at `/benefit-sharing` and `/benefit-sharing/pdf` | Expose the specified `/report` route and its PDF/payload format selection, reusing the generator and authorization |
| Commitment provenance | Pinned PDD is version 2.1, May 2020; relevant text is J2.1 on page 47 | Resolve the different edition/locator requested by A.13.1 / Table 5 before changing seed provenance |
| Cadence | Calendar `monthly`, `quarterly`, `annual`; demo reporting cadence is annual | Clarify/model payment milestones separately from reporting cadence; do not silently label annual as staged |
| Demo labels | Fixture name includes a synthetic-payment suffix; PDFs and attestations disclose mock evidence | Publish explicit structured demonstration metadata so frontend register/project screens can reliably show the required labels |
| Per-item errors | `rejected` maps to failure and `error_code` is retained as `failureClass` | Add a bounded, appropriately scoped bank error message field; prevent it leaking on public/verifier routes |
| Annual-report file | Already downloaded and checked under `output/plan-vivo/tgb-annual-report-2024.pdf` | Provide the requested `demo/` path through the asset preparation workflow |
| Core correctness/security | Existing authorization, immutability, signatures, privacy, corrections and payment safety tests | Extend checks around the added contracts and source/cadence changes rather than rebuild the backend |

Implementation references: `src/app.ts`, `src/registry.ts`, `src/reports.ts`, `src/batches.ts`, `src/service.ts`, `src/period.ts`, `packages/contracts/src/index.ts`, `scripts/fixtures.ts`, and `data/plan-vivo-tgb.json`.

## Conflicts to resolve before implementation

1. **500 in one bank request.** New sections 2.4a and 5 say that a 500-household run is one bank call. The participant API specification caps a bulk request at 200 items. Keep one Attest run/execute action backed by **three bank batches: 200 + 200 + 100**. `auto_name_enquiry` removes the need for fresh per-item refs; it does not raise the item limit. Distinguish three submission calls from polling and evidence-hydration calls.

2. **Bulk acceptance is not settlement proof.** The new response example is a completed batch with its sole item rejected. Completion alone therefore proves nothing was paid. Our live check also returned sparse bulk items; individual responses supplied the session ID, fee/VAT/stamp-duty breakdown and `completed_at`. Keep evidence hydration and reconciliation before attestation figures change, and retain SSE as the frontend's live-state stream.

3. **Different PDD locator/edition.** The local pinned PDF's cover says version 2.1, May 2020. Its benefit-sharing section is J2.1 on page 47; its Table 5 describes carbon benefits rather than the new specification's benefit-sharing model. Do not relabel the current quotation A.13.1. Identify and pin the actual matching PDD, retaining URL, hash, page and section locator. The new Word file supplies no external PDD hyperlink to resolve the edition.

4. **Payment milestones versus reporting cadence.** “Staged against verification” is a payment schedule, while the current cadence field drives calendar reporting/closure. Recommended design: keep the report/period cadence explicit and represent verified payment milestones separately. Finalize the shared contract and closure/eligibility semantics before extending the enum or changing scheduling behavior.

5. **Incomplete allocation summary.** The new document's 60/30/7 figures total 97%. Read the actual Table 5 before representing other allocations; do not invent the remaining 3% or infer a fee from this summary.

6. **Metric meanings and demo populations.** The new seed prose supplies 51,874 participants, 7,518,071 tonnes verified, 14 districts and certification since 2003. Verify the exact labels/date against their sources. Registry-reported participants/credit figures and 500 synthetic payment households are different datasets and must never share an ambiguous coverage denominator.

The organizer's corrections and higher-priority platform/bank contract remain authoritative for sandbox behavior. The revised Word document does not override the bank's item cap or establish the missing third name-check mode.

## Proposed work sequence

### 1. Reconcile the specification and source inputs

- Apply the corrected context wording to maintained pitch/documentation copy, without financial-code changes.
- Resolve the PDD edition, exact quotation, page/section locator, beneficiary definition and allocation table.
- Verify the real project reference statistics and their source dates/labels.
- Record the three-batch interpretation and the distinction between staged payment eligibility and calendar reporting.

Exit: one source-backed seed definition and an agreed shared contract; no invented quotation, cadence or performance claim.

### 2. Add API compatibility routes and shared types

- Implement authenticated `POST /api/registry/boundary` using the existing parser, with the specified JSON input/output, explicit `points` shape, size limits and PostGIS-backed area calculation.
- Retain the project-scoped upload endpoint for persistence/authorization and connect preview results to project creation safely.
- Expose authenticated `GET /api/attestations/:id/report` for PDF and JSON using the existing report generator. Preserve existing routes for callers already using them.
- Carry a source section locator alongside the numeric source page where required.
- Retain `status`/`error_code` handling and add a bounded bank item message for authorized operational views.

Exit: contract tests cover new route names, formats, area units, malformed XML, topology and role/organisation boundaries.

### 3. Finish explicit demonstration provenance

- Add structured demonstration/synthetic-payment flags and a display notice to the public project/register DTOs.
- Keep public figures tied to simulated settlements and make the simulation visible wherever they could be attributed to the real organisation.
- Keep the real project reference statistics separate from the simulated payment population.
- Preserve already-signed attestation records; new presentation metadata must not rewrite their signed contents.
- Coordinate the register-row/project-page labels and report controls with Mark.

Exit: register/project screens clearly label the demonstration; exports retain the synthetic disclosure and no test value reads as verified ECOTRUST performance.

### 4. Align seed and demo assets

- Create new reviewed commitment records for a newly verified source edition instead of rewriting historical commitment/attestation evidence.
- Model the agreed verification milestones and reporting cadence.
- Make the published annual report available through the prescribed `demo/` asset workflow with source/hash metadata.
- Continue to require an authentic KML for a real boundary; keep the existing test polygon explicitly synthetic.

Exit: a reproducible seed and demo asset set with source citations, explicit simulation labels and preserved histories.

### 5. Verify the delta and then prepare release

- Run meaningful regressions for the new routes, message scoping, provenance, source locators and schedule semantics alongside the existing suite.
- Recheck production exclusion of developer routes, schema validation and the dependency audit if implementation changes warrant them.
- Rehearse 500 simulated recipients across three batches with timeout/replay/correction checks and accurate bank-evidence hydration.
- Finish the previously documented frontend, real-boundary/issuance, credentials and remaining live integration/deployment work.

The existing handover's 63-test result is the previous implementation's validation result. This review did not rerun tests and does not imply compliance with the new route names or staged schedule. No application changes or cluster actions were performed during this review.
