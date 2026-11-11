# Huawei MaaS live validation — 11 November 2026

The real `Providers` and queued `Service` workers were exercised against Huawei MaaS from a temporary pod in `team05`. The configured primary model, `glm-5.2`, returned HTTP 200 for every request; no fallback model was needed. Inputs were fictional documents, names and a complaint. The application store used for this probe was ephemeral memory.

## Issue found and fixed

The gateway returned valid JSON enclosed in a single Markdown code fence despite `response_format: {type: "json_object"}`. Main at `10cc871754db4e9fba4bbfd2d6f064318353da26` parsed the entire content directly as JSON, causing `EXTRACTION_LOW_CONFIDENCE`. Two pre-fix runs each received four successful HTTP responses but failed application checks.

`Providers.model` now accepts either a bare JSON object or one complete JSON/unlabelled code fence. Extra commentary, multiple fences, malformed JSON, arrays and null remain rejected. Existing extraction/source validation, category validation and review requirements remain in force. A regression test covers valid and rejected response formats.

## Result after the fix

| Check | Observed result |
| --- | --- |
| Document extraction through queue | Extracted 60%, gross, annual, page 2; quotation matched original page; `accepted:false`, `requiresReview:true`. |
| Name review through legacy queue payload | Proposed `match` for reordered fictional name; original uncertain status and mismatch flag retained. Project derived from participant. |
| Complaint triage through legacy queue payload | Proposed `wrong_amount`; dispute remained open and unresolved. Project derived from dispute. |
| Document with no commitment | Returned `PDD_NO_COMMITMENT`, pending review, no invented percentage. |
| Cache replay | Repeated extraction, name review and triage produced zero additional model requests. |

All five checks passed. The final run made four actual inference calls, used 747 reported total tokens, and made zero bank requests. Individual calls took approximately 4.6–7.9 seconds.

Local validation after the fix also passed: backend build, secret/type checks, and all 81 backend tests (zero failures or skips), including the new response-format regression test and all five queue/project regression tests.

Final request IDs: `d892294457b9307c1227b7f8926f1912`, `a18fa729ff6172b9be804ecb0fc2fd5c`, `100ac969e6ecbf7b744fc3d578569d0f`, `deb80647d71a2c88ad8e4e9099d5aa56`.

## Scope and deployment

This verifies the live MaaS adapter and real queue handlers, including the legacy job/project fix. It does not establish that a persistent deployed application has switched to live providers. The existing local app still uses mocks. This parser change was tested in the temporary pod and subsequently pushed to main in `638a05b`; see `team05-deployment.md` for rollout status.

The gateway credential remained in the cluster secret. Kubernetes transport verified the configured cluster CA. The temporary pod `attest-maas-1468ff78` was deleted and its absence verified after testing.

Local evidence is under the workspace's ignored `tmp/live-maas-check/`: `result-2.json` and `result-3.json` contain pre-fix failures, `result-4.json` contains the passing run, `source-evidence.json` identifies tested source/bundle hashes, and `run.json` records cleanup. Attempt 1 failed at Kubernetes transport before making a MaaS request.
