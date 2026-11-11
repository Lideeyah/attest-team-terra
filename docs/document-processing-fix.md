# Document processing recovery

The reported uploads were still pending with zero processing attempts. General background work was occupied by slow payment requery jobs. Hosted document jobs now use a separate, bounded processing lane with the existing durable claim and retry rules. The extraction guard checks active payments only in the same project, rather than globally blocking unrelated projects.

Setup polls explicit document status rather than interpreting a successful read as completion. It distinguishes queued, running, failed and manual-review results, and offers Check progress without uploading again. Project references are retained in session storage, access is revalidated on reload, and existing setups can be selected for resumption. No identity details or documents are stored in that browser reference. Invalid file extensions are rejected in the boundary step with a clear instruction to upload PDFs in the document step.

Validation: 75 backend tests and 25 frontend tests passed, including new queue isolation, exclusive claims and scoped document-status tests. Type checks and onboarding lint passed. Hosted recovery and reload checks are performed after deployment.
