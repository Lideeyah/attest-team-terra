# Review job project context

The production merge includes a fix for the missing `projectId` regression in name review and dispute triage. The project-specific payment guard previously rejected older payloads as `INVALID_REQUEST`, marking them permanently failed before the model ran.

Enrolment, account-name refresh and dispute intake now put `projectId` into every new review job. The worker resolves the authoritative project from the referenced participant or dispute, allowing existing pending jobs without that field to complete. A supplied ID must match the subject record; another project's ID cannot bypass the payment guard.

Reviews defer with `RATE_LIMITED` while their own project has executing or partially complete payments. Payments in another project do not block them. Review results remain proposals; triage does not resolve a dispute or change settlement evidence.

The worker also recovers the specific historical failure once: a failed name-review/triage job with `INVALID_REQUEST`, no project ID, and an existing referenced subject. Recovery fills the canonical project ID under the same database lock as job claims. Completed jobs, other failure causes, missing subjects and jobs already carrying project context are not reset. Concurrent workers cannot revive or execute the same recovered job twice.

`backend/tests/review-queue.test.ts` covers all three producers, pending legacy payloads, project-specific deferral/retry, mismatched project IDs, and concurrent recovery of already failed legacy jobs. The initial four regression tests failed against the incoming production worker before this correction.
