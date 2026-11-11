# Document processing recovery

The reported uploads were still pending with zero processing attempts. General background work was occupied by slow payment requery jobs. Hosted document jobs now use a separate, bounded processing lane with the existing durable claim and retry rules. The extraction guard checks active payments only in the same project, rather than globally blocking unrelated projects.

Setup polls explicit document status rather than interpreting a successful read as completion. It distinguishes queued, running, failed and manual-review results, and offers Check progress without uploading again. Project references are retained in session storage, access is revalidated on reload, and existing setups can be selected for resumption. No identity details or documents are stored in that browser reference. Invalid file extensions are rejected in the boundary step with a clear instruction to upload PDFs in the document step.

Validation: 75 backend tests and 25 frontend tests passed, including new queue isolation, exclusive claims and scoped document-status tests. Type checks and onboarding lint passed. Hosted recovery and reload checks passed after deployment. The exact reported job d081b4a7-6734-40a0-97c4-96d3ebe13a7f is done, its source quotation and extracted percentage render in the mobile review screen, and it remains unaccepted. The browser test also verified that pending work resumes after reload and review form values survive Back/Continue. Source confirmation remains required. Background work is registered before response flush, is shared within each instance, and expensive maintenance starts only during payment/operations activity or the scheduled tick; ordinary setup navigation does not start it.

Frontend release: https://attest-3m0bdzi5z-mc-johnsons-projects.vercel.app

Backend release: https://attest-dls2omike-mc-johnsons-projects.vercel.app

A broader hosted smoke test was updated to allow user-created projects in addition to the three seeded fixtures. Its initial pass reached six API checks before a page-render timeout during the earlier background-worker contention. The focused production onboarding checks and exact document recovery passed after the fix. Extraction remains a demo provider and requires a human check against the source document; no commitment was accepted or published by these checks.
