"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Disclose } from "@/components/Disclose";
import { Notice } from "@/components/Notice";
import { api } from "@/lib/api/client";
import { ATTESTATION_COPY } from "@/lib/copy/console";

/** A disclosure bundle for one transfer: its own facts, its leaf, the path to
    the period's root and the root's reference. An auditor recomputes the leaf
    from the facts and folds the path; nothing in it is about any other
    household. */
export function DisclosureBuilder({ attestationId }: { attestationId: string }) {
  const [transferId, setTransferId] = useState("");
  const [bundle, setBundle] = useState<string | null>(null);
  const [refused, setRefused] = useState<{ line: string; note: string } | null>(null);

  async function generate(): Promise<void> {
    setRefused(null);
    const result = await api.disclosure(attestationId, { transferId });
    if (!result.ok) {
      setBundle(null);
      setRefused({ line: result.message, note: result.remediation });
      return;
    }
    setBundle(JSON.stringify(result.data, null, 2));
  }

  return (
    <Disclose summary={ATTESTATION_COPY.disclosure} meta="One transfer at a time">
      <p className="note">{ATTESTATION_COPY.disclosureNote}</p>
      <div className="field">
        <label className="label" htmlFor={`disclosure-${attestationId}`}>
          The transfer
        </label>
        <input
          id={`disclosure-${attestationId}`}
          className="input"
          value={transferId}
          onChange={(event) => setTransferId(event.target.value)}
          data-disclosure-transfer="true"
        />
      </div>
      <Button
        type="button"
        disabled={transferId.trim().length === 0}
        onClick={() => void generate()}
        data-disclosure-generate="true"
      >
        Generate the bundle
      </Button>
      {bundle ? (
        <>
          <pre className="console-bed" data-disclosure-bundle="true">
            {bundle}
          </pre>
          <p className="note">
            The bundle carries the transfer&rsquo;s own facts as well as its
            leaf, so a verifier recomputes the leaf rather than trusting it.
          </p>
        </>
      ) : null}
      {refused ? (
        <Notice tone="blocked" title="No bundle was generated">
          <p>{refused.line}</p>
          <p className="note">{refused.note}</p>
        </Notice>
      ) : null}
    </Disclose>
  );
}
