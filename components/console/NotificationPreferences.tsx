"use client";

import { useState } from "react";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import { NOTIFICATION_EVENTS } from "@/lib/api/contract";
import type { NotificationEvent, NotificationPreferences as Preferences } from "@/lib/api/contract";
import { NOTIFICATION_LABEL, SETTINGS_COPY } from "@/lib/copy/console";

/* Five events, each to this account's email, each on until it is turned off.
   There is no inbox: an unread count is not a figure and the home screen's
   figures are the record. */

export function NotificationPreferences({
  preferences,
}: {
  preferences: Preferences | null;
}) {
  const [events, setEvents] = useState<Record<NotificationEvent, boolean>>(
    preferences?.events ?? {
      "dispute.opened": true,
      "run.complete": true,
      "funding.received": true,
      "period.closing": true,
      "reconciliation.mismatch": true,
    },
  );
  const [saved, setSaved] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  async function toggle(event: NotificationEvent, on: boolean): Promise<void> {
    const next = { ...events, [event]: on };
    setEvents(next);
    setSaved(false);
    setRefused(null);
    const result = await api.saveNotificationPreferences({ events: { [event]: on } });
    if (!result.ok) {
      setEvents(events);
      setRefused(result.message);
      return;
    }
    setEvents(result.data.events);
    setSaved(true);
  }

  return (
    <section className="panel stack" aria-label={SETTINGS_COPY.notificationsHeading}>
      <h2 className="h3-display">{SETTINGS_COPY.notificationsHeading}</h2>
      <Rule />
      <p className="note">{SETTINGS_COPY.notificationsNote}</p>
      <ul className="stack-tight">
        {NOTIFICATION_EVENTS.map((event) => (
          <li key={event} className="notification-row" data-notification={event}>
            <label className="punch-label">
              <input
                className="punch"
                type="checkbox"
                checked={events[event]}
                onChange={(changed) => void toggle(event, changed.target.checked)}
                data-notification-toggle={event}
              />
              <span>{NOTIFICATION_LABEL[event]}</span>
            </label>
            <span className="record-cell">{events[event] ? "On" : "Off"}</span>
          </li>
        ))}
      </ul>
      {saved ? (
        <Notice title="Saved">
          <p>The change applies to this account only.</p>
        </Notice>
      ) : null}
      {refused ? (
        <Notice tone="blocked" title="The change was not saved">
          <p>{refused}</p>
        </Notice>
      ) : null}
    </section>
  );
}
