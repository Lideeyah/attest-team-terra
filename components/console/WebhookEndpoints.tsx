"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { NOTIFICATION_EVENTS } from "@/lib/api/contract";
import type { WebhookEndpoint } from "@/lib/api/contract";
import { NOTIFICATION_LABEL, SETTINGS_COPY } from "@/lib/copy/console";
import { formatDateTime } from "@/lib/record";

/** Where this project's own systems are told what happened. The events are
    the same five the notifications use, so there is one list of events in the
    product rather than two. */
export function WebhookEndpoints({
  projectId,
  endpoints,
}: {
  projectId: string;
  endpoints: WebhookEndpoint[];
}) {
  const [rows, setRows] = useState(endpoints);
  const [url, setUrl] = useState("");
  const [chosen, setChosen] = useState<string[]>([...NOTIFICATION_EVENTS]);
  const [refused, setRefused] = useState<string | null>(null);

  async function create(): Promise<void> {
    setRefused(null);
    const result = await api.createWebhookEndpoint(projectId, { url, events: chosen });
    if (!result.ok) {
      setRefused(
        result.code === "INVALID_REQUEST"
          ? "An endpoint has to be an https address. Events are not sent over http."
          : result.message,
      );
      return;
    }
    setRows((previous) => [...previous, result.data]);
    setUrl("");
  }

  async function remove(endpoint: WebhookEndpoint): Promise<void> {
    setRefused(null);
    const result = await api.removeWebhookEndpoint(endpoint.id);
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    setRows((previous) => previous.filter((candidate) => candidate.id !== endpoint.id));
  }

  return (
    <section className="panel stack" aria-label={SETTINGS_COPY.webhooksHeading}>
      <h2 className="h3-display">{SETTINGS_COPY.webhooksHeading}</h2>
      <Rule />
      <ul className="stack-tight">
        {rows.map((endpoint) => (
          <li key={endpoint.id}>
            <Strip state={endpoint.lastDeliveryState === "failed" ? "flagged" : undefined}>
              <div className="settings-row" data-endpoint={endpoint.id}>
                <span className="record-cell">{endpoint.url}</span>
                <span className="record-cell">
                  {endpoint.events.length} of {NOTIFICATION_EVENTS.length} events
                </span>
                <span className="record-cell">
                  {endpoint.lastDeliveryAt
                    ? `${endpoint.lastDeliveryState === "failed" ? "Failed" : "Delivered"} ${formatDateTime(endpoint.lastDeliveryAt)}`
                    : "Nothing delivered yet"}
                </span>
                <span>
                  <Button
                    type="button"
                    variant="quiet"
                    small
                    onClick={() => void remove(endpoint)}
                    data-endpoint-remove={endpoint.id}
                  >
                    Remove
                  </Button>
                </span>
              </div>
            </Strip>
          </li>
        ))}
      </ul>

      <div className="field">
        <label className="label" htmlFor="endpoint-url">
          The endpoint
        </label>
        <input
          id="endpoint-url"
          className="input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://"
        />
      </div>
      <fieldset className="stack-tight">
        <legend className="label">Events</legend>
        {NOTIFICATION_EVENTS.map((event) => (
          <label key={event} className="punch-label">
            <input
              className="punch"
              type="checkbox"
              checked={chosen.includes(event)}
              onChange={(changed) =>
                setChosen((previous) =>
                  changed.target.checked
                    ? [...previous, event]
                    : previous.filter((candidate) => candidate !== event),
                )
              }
            />
            <span>{NOTIFICATION_LABEL[event]}</span>
          </label>
        ))}
      </fieldset>
      <Button
        type="button"
        disabled={url.trim().length === 0}
        onClick={() => void create()}
        data-endpoint-create="true"
      >
        Register the endpoint
      </Button>
      {refused ? (
        <Notice tone="blocked" title="The endpoint was not registered">
          <p>{refused}</p>
        </Notice>
      ) : null}
      <p className="note">
        A delivery is signed, and the signing secret is returned once at
        registration.
      </p>
    </section>
  );
}
