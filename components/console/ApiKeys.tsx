"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import type { ApiKey } from "@/lib/api/contract";
import { SETTINGS_COPY } from "@/lib/copy/console";
import { formatDate } from "@/lib/record";

/** A key is shown once, at creation. Nothing holds it afterwards, here or on
    the server, so the panel says so before it is created rather than after it
    has gone. */
export function ApiKeys({
  projectId,
  keys,
}: {
  projectId: string;
  keys: ApiKey[];
}) {
  const [rows, setRows] = useState(keys);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<ApiKey | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  async function create(): Promise<void> {
    setRefused(null);
    const result = await api.createApiKey(projectId, { label }, `create-key:${label}`);
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    setCreated(result.data);
    setRows((previous) => [...previous, { ...result.data, secret: null }]);
    setLabel("");
  }

  async function revoke(key: ApiKey): Promise<void> {
    setRefused(null);
    const result = await api.revokeApiKey(key.id, `revoke-key:${key.id}`);
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    setRows((previous) => previous.filter((candidate) => candidate.id !== key.id));
  }

  return (
    <section className="panel stack" aria-label={SETTINGS_COPY.keysHeading}>
      <h2 className="h3-display">{SETTINGS_COPY.keysHeading}</h2>
      <Rule />
      <p className="note">{SETTINGS_COPY.keyMasked}</p>

      {created ? (
        <Notice tone="flagged" title="This key is shown once">
          <p data-key-once="true">{SETTINGS_COPY.keyShownOnce}</p>
          <pre className="console-bed" data-key-secret="true">
            {created.secret}
          </pre>
          <p>
            <Button
              type="button"
              variant="outline"
              small
              onClick={() => setCreated(null)}
              data-key-dismiss="true"
            >
              I have recorded it
            </Button>
          </p>
        </Notice>
      ) : null}

      <ul className="stack-tight">
        {rows.map((key) => (
          <li key={key.id}>
            <Strip>
              <div className="settings-row" data-key={key.id}>
                <span className="record-cell">{key.label}</span>
                <span className="record-cell">{key.prefix}·········</span>
                <span className="record-cell">Created {formatDate(key.createdAt)}</span>
                <span className="record-cell">
                  {key.lastUsedAt
                    ? `Last used ${formatDate(key.lastUsedAt)}`
                    : "Never used"}
                </span>
                <span>
                  <Button
                    type="button"
                    variant="quiet"
                    small
                    onClick={() => void revoke(key)}
                    data-key-revoke={key.id}
                  >
                    Revoke
                  </Button>
                </span>
              </div>
            </Strip>
          </li>
        ))}
      </ul>

      <div className="field">
        <label className="label" htmlFor="key-label">
          What this key is for
        </label>
        <input
          id="key-label"
          className="input"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <Button
        type="button"
        disabled={label.trim().length === 0}
        onClick={() => void create()}
        data-key-create="true"
      >
        Create a key
      </Button>
      {refused ? (
        <Notice tone="blocked" title="The key was not created">
          <p>{refused}</p>
        </Notice>
      ) : null}
      <p className="note">
        A revoked key stops working at once, and the calls it made stay
        attributed to it.
      </p>
    </section>
  );
}
