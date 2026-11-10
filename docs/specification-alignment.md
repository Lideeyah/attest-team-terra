# Consolidated backend specification alignment

Implemented against `Attest-Backend-Specification (1).docx`, 11 November 2026. The original Word documents remain source snapshots. The user's corrected section-0 figures are editorial context, not payment constants: Plan Vivo at least 60%, Acorn up to 80%, Kenya's land-based minimum 40%; Farm Africa's 7,375/21,658 figure concerns farmers who had sold carbon by the close of 2023, not a verified paid count.

## API contract

### Boundary preview and onboarding

`POST /api/registry/boundary` accepts JSON `{ "kml": "<kml>...</kml>", "name": "Project boundary" }`. Developer administrators/operators authenticate normally and supply `Idempotency-Key`.

The existing success envelope contains:

```ts
interface BoundaryPreview {
  name: string;
  points: [number, number][];
  areaHectares: number;
  geometry: Boundary;
  boundaryId: string;
  sha256: string;
}
```

`points` is the primary exterior ring, in GeoJSON longitude/latitude order. `geometry` retains all parcels and holes; use it to render a complete multipart boundary. Production area uses PostGIS geography in square metres divided by 10,000. The offline memory store uses a spherical approximation. Invalid topology, malicious XML, unclosed rings and oversized inputs are rejected.

Pass the returned `boundaryId` to `POST /api/projects`, either at the top level or inside `registryRecord`. The backend retrieves the validated geometry and checks the upload's organisation; it does not trust client-edited preview coordinates. The existing project-scoped multipart upload remains supported.

### Benefit-sharing report

`GET /api/attestations/:id/report` returns signed JSON in the normal envelope. `?format=pdf` or `Accept: application/pdf` returns the PDF attachment. `?format=json` explicitly selects the payload. Owning developer roles and verifiers have access. Other organisations and unauthenticated callers are rejected.

Existing `/benefit-sharing` and `/benefit-sharing/pdf` routes remain compatible. Verifier PDF exports now link to `/report?format=pdf`.

The report includes source quotation, numeric page, section locator, payment cadence, reporting cadence, synthetic-data disclosure, settlement-derived figures, original signed attestation, Merkle/anchor references and a separately verifiable report signature. PDF output retains registration marks and embedded JSON. CSV exports now include explicit demonstration/provenance columns too.

## Staged payment cadence

Commitments support `cadence: "staged"` alongside the existing monthly/quarterly/annual values. Staged commitments must specify `reportingCadence` before run creation or acceptance through the review APIs. `REPORTING_CADENCE_REQUIRED` identifies a missing calendar cadence. A caller cannot bypass this requirement by supplying an arbitrary close date.

The TGB demo uses:

```json
{
  "percentage": 60,
  "basis": "gross",
  "cadence": "staged",
  "reportingCadence": "annual",
  "beneficiary_definition": "Participating farmers",
  "paymentSchedule": {
    "type": "verification_milestones",
    "description": "Staged against verified performance milestones; individual payments follow the published PES agreements."
  }
}
```

The staged declaration describes the payment mechanism. Annual reporting controls scheduled period closure. The new document does not define a household milestone approval API or enough stage allocations to invent automated eligibility rules. Existing evidence review, preflight exclusions with reasons and settlement-based computation remain in force; aggregate MRV is not silently treated as proof of individual farmer performance.

Calendar commitments retain their previous scheduling behavior. The legacy quarterly fallback remains for old records without an explicit cadence; staged records always require an explicit reporting cadence.

## Demonstration disclosures and source statistics

Public register/project responses and signed-record response wrappers include `isDemonstration`, `paymentData`, and `demonstrationNotice`. Mark's frontend can display the required row/page labels directly. Private bank error messages and household fields are excluded from these responses.

Real reference statistics are a separate allowlisted object. The published 2024 annual report, page 5, supports 51,874 participating households and 7,518,071 PVCs issued; these are not the demo's paid count, coverage or disbursed amount. The source labels/period are retained. Project start year 2003 is not presented as an independently verified certification date. The specification's 14-district claim is not published as verified without a matching source.

The local fixture upgrader appends a new staged commitment, updates demonstration metadata and moves only untouched draft runs to that commitment. Existing signed attestations, historical source quotations and already-used run commitment references remain intact. Re-running the upgrade does not append duplicate commitments.

## Source edition status

The available verified PDD is version 2.1, May 2020. Its benefit-sharing quotation is on page 47 in **J2.1** and its performance payment table is **Table 12**. The consolidated specification instead names **A.13.1 / Table 5** but supplies no matching PDD or verbatim quotation.

The seed/report retain the actual verified locator and record:

```json
{
  "sourceLocator": "J2.1",
  "specifiedSourceLocator": "A.13.1 / Table 5",
  "sourceAlignment": "edition_pending"
}
```

This identifies the remaining source-input gap without falsely relabelling the verified quotation. The stated 60/30/7 allocation totals 97%; no percentage or fee is invented for the missing remainder. A matching PDD can be imported/reviewed as a new commitment record when supplied.

Run `npm run demo:assets` to verify the pinned PDD and create `demo/tgb-annual-report-2024.pdf` plus `demo/sources.json`. The PDFs are ignored by Git. `data/plan-vivo-tgb.json` contains URLs, hashes, source locators and explicit source-alignment status.

## Bank behavior retained

The participant contract's 200-item cap overrides the revised backend prose's single-500-item-request claim. One execute action still prepares 200/200/100 bank batches for a 500-recipient run. Automatic enquiry, stable idempotency keys, shared request budgeting, unknown-outcome requery, sparse-evidence hydration and amount/charge validation remain enforced.

Per-item bank rejection messages are now stored as `failureMessage` for authorised transfer reads, limited to 500 characters, stripped of control characters and redacted for long numeric identifiers. They are excluded from public/verifier project and report payloads. Retries preserve the prior attempt's message and clear it from the new attempt.

No cluster deployment, image push or new live banking mutation was performed for this alignment. Existing release requirements remain: authentic KML, provenance-backed issuance export, frontend integration and production/provider credentials.

## Validation

- 70 tests passed, zero failures/cancellations, including the new route, permission, hectare-area, staged-cadence, signed-report, CSV-disclosure and historical-evidence regressions.
- Production API/worker/migrator bundling and development-route exclusion passed.
- Prisma validation passed; no SQL migration is required for these JSON-backed metadata additions.
- Dependency audit passed at the high threshold; the existing eight low-severity transitive elliptic advisories remain.
- The 500-household offline demo completed through three batches; proof/chain checks passed. The updated signed report records staged payments and annual reporting.
- The source-document workflow verified the PDD and created the annual report in `demo/`.

Restart an already-running local backend to load the new routes. `npm run local` applies the fixture metadata/commitment upgrade during startup. The frontend still needs to consume the new demonstration flags and report controls.
