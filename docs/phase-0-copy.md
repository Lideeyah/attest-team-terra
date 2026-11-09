# Phase 0 — copy written without a source

Every sentence in this phase that was written rather than taken from a
decided string. Each is the most plausible real sentence for its slot. They
are collected here so they can be replaced in one pass.

## The landing page

| Where | String | Note |
|---|---|---|
| `app/page.tsx`, Movement 1 | "Carbon projects promise communities a share of what their work earns. The money is paid in cash, which means nobody can prove it arrived. Attest moves that money through the bank and emits a record that cannot be written after the fact." | The product specification's one-line, carried as a placeholder until the hero sentence is chosen from the four proposals in section 5.1 of the foundation document. It is three sentences long and will set as roughly seven lines of display type, so Movement 1 reads correctly only once a one-line sentence replaces it. |

## Metadata

| Where | String |
|---|---|
| `app/layout.tsx`, title | "Attest — a settlement record for carbon project payments" |
| `app/layout.tsx`, description | "Attest moves carbon revenue to households through the bank and emits a record of what was paid, what was not, and against which commitment." |
| `app/dev/kitchen-sink/page.tsx`, title | "Component and motion reference — Attest" |

## Notices and modal copy in the reference

These are written in the product's voice and are the strings most likely to be
reused verbatim on a real surface, so they are worth a read.

| Where | String |
|---|---|
| Notice, period close | "Nine days remain. Coverage is computed from transfers that cleared the bank, so a transfer initiated after the close falls into the next period." |
| Notice, shortfall | "Commitment requires ₦48.2m. You are funding ₦31.4m. Shortfall ₦16.8m, recorded in this period's attestation." |
| Notice, duplicate identity | "Two enrolments carry the same bank verification number. Neither is payable until one is withdrawn by the enrolling agent." |
| Notice, signal | "Four transfers from the 9 November run moved onward to one account within six minutes of settlement. Case 0231 is open with bank operations." |
| Modal, close period | "Closing computes coverage from transfers that cleared the bank, hashes the result, chains it to the previous period and anchors it. Nothing in a closed period can be edited." |
| Period seal, consequence | "Once sealed, no transfer can be added to 2026-Q4 and no figure in it can be edited. A correction becomes a new period." |
| Sheet, unconfirmed transfer | "The transfer settled at 14:22:58 WAT on 9 November 2026 and has not been confirmed by the participant. A reminder was sent by SMS on 10 November." |
| Empty state, no run | "No disbursement run has been created for 2026-Q4. A run needs a roster and a funded account." |
| Empty state, no dispute | "No dispute has been filed against this project." |
| Toast | "Export queued. It will appear in Downloads." |

## Stamp labels

SETTLED, UNCONFIRMED, FAILED, IN FLIGHT, SHORTFALL, DUPLICATE IDENTITY,
UNDER REVIEW, ANCHORED. Each is rendered uppercase by the component, so the
strings themselves are written in sentence case.

## Reference data

`lib/sample.ts` holds the figures used throughout the reference: the Ekuri
Forest Initiative, Plan Vivo PV-NG-0417, Cross River, Akamkpa LGA, 2,090
households enrolled, 1,284 paid, ₦48.2m required, ₦31.4m funded, ₦16.8m short.
The project name is a real community forest initiative in Cross River; the
registry ID, the figures and the participant names are invented and internally
consistent. Replace them with the demo seed when it exists.
