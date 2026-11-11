# Hedera testnet validation — 11 November 2026

Live submission and transaction confirmation work. The original test combined submission and immediate mirror verification in one try/catch, obscuring that the proof lookup was the failing step. A traced transaction returned a successful receipt, record, and `anchored` result (sequence 3). Its immediate mirror proof lookup failed, while a later lookup of the same sequence and expected hash returned `verified:true`.

## Change

`Providers.anchorProof` now retries mirror reads while indexing catches up. It makes at most six requests within a 30-second verification window, with increasing delays. Missing messages, timeouts, rate limits, temporary server errors and connection failures can retry. A mismatched hash or permanent HTTP error fails immediately. Verification never submits a new HCS message or changes the successful anchor result.

Regression checks first reproduced the missing retry behavior, then passed after the change. They cover transient failures followed by a matching proof, bounded failure when the mirror remains unavailable, and immediate rejection of a different hash or permanent HTTP error.

The backend build, secret/type checks, and full suite of 84 backend tests passed with zero failures or skips.

## Live result after change

The actual compiled backend adapter submitted one new synthetic SHA-256 digest to topic `0.0.11410033` on Hedera testnet:

- Transaction reference: `0.0.11392513@1794398156.786998443`.
- Message sequence: `4`.
- Submission, receipt query and record query all succeeded.
- Mirror returned HTTP 200 and the backend verifier returned `verified:true` for the expected digest.
- Consensus timestamp: `1794398260.298695432`.

The live run did not need a mirror retry; deterministic regression checks exercise the delayed-indexing case. Local evidence under the workspace's ignored `tmp/live-hedera-check/` includes `trace-result.json` (diagnosis), `fixed-trace-result.json` (passing live run), and `backend-test.log`.

These changes were subsequently pushed to main in `638a05b`; see `team05-deployment.md` for rollout status. The existing local demo process still selects mock anchoring; this verification directly exercised the live provider using the backend environment file. Credentials remain excluded from Git and from this report.
