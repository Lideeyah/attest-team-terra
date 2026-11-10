"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import { EXPORT_COPY } from "@/lib/copy/verifier";
import type { VerifierKey } from "@/lib/api/contract";
import { formatDate } from "@/lib/record";

/* A read-only key for pulling the same records this screen exports, for a
   verifier whose own systems do the pulling. Shown once at issue and never
   again: only the prefix is kept, here or on the server. */
export function VerifierKeys() {
  const [label, setLabel] = useState("");
  const [issued, setIssued] = useState<VerifierKey | null>(null);
  const [keys, setKeys] = useState<VerifierKey[]>([]);
  const [refused, setRefused] = useState<string | null>(null);

  async function issue(): Promise<void> {
    setRefused(null);
    const result = await api.issueVerifierKey({ label }, `verifier-key:${label}`);
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    setIssued(result.data);
    setKeys((current) => [...current, { ...result.data, secret: null }]);
    setLabel("");
  }

  return (
    <section className="stack" aria-label="API keys">
      <h2 className="h3-display">API keys</h2>
      <Rule />
      <p className="note">
        A read-only key for the records this screen exports. It reads what the
        public register publishes and nothing a project has not published.
      </p>

      {issued ? (
        <Notice tone="flagged" title="This key is shown once">
          <p data-key-once="true">{EXPORT_COPY.keyOnce}</p>
          <pre className="console-bed" data-key-secret="true">
            {issued.secret}
          </pre>
          <p>
            <Button
              type="button"
              variant="outline"
              small
              onClick={() => setIssued(null)}
              data-key-dismiss="true"
            >
              I have recorded it
            </Button>
          </p>
        </Notice>
      ) : null}

      {keys.length > 0 ? (
        <ul className="stack-tight">
          {keys.map((key) => (
            <li key={key.id} className="verifier-row" data-key={key.id}>
              <span className="record-cell">{key.label}</span>
              <span className="record-cell">{key.prefix}·········</span>
              <span className="record-cell">Issued {formatDate(key.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="verifier-key-label">
          What this key is for
        </label>
        <input
          id="verifier-key-label"
          className="input"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <Button
        type="button"
        disabled={label.trim().length === 0}
        onClick={() => void issue()}
        data-key-issue="true"
      >
        Issue a key
      </Button>
      {refused ? (
        <Notice tone="blocked" title="The key was not issued">
          <p>{refused}</p>
        </Notice>
      ) : null}
    </section>
  );
}
