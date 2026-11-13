"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { api } from "@/lib/api/client";
import { SETTINGS_COPY } from "@/lib/copy/console";
import type { ConsoleRole, ConsoleUser } from "@/lib/api/contract";
import { formatDate } from "@/lib/record";

const ROLES: { value: ConsoleRole; label: string; note: string }[] = [
  { value: "admin", label: "Administrator", note: "Adds users, keys and endpoints, and executes distributions." },
  { value: "operator", label: "Operator", note: "Builds and executes distributions, responds to reports." },
  { value: "viewer", label: "Viewer", note: "Reads the record and downloads it." },
];

/** Users and roles. The last administrator cannot remove or demote
    themselves, because a project with nobody who can add one is a project
    nobody can administer. */
export function ConsoleUsers({
  projectId,
  users,
}: {
  projectId: string;
  users: ConsoleUser[];
}) {
  const [rows, setRows] = useState(users);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<ConsoleRole>("viewer");
  const [refused, setRefused] = useState<string | null>(null);

  const admins = rows.filter((user) => user.role === "admin");

  async function invite(): Promise<void> {
    setRefused(null);
    const result = await api.inviteConsoleUser(
      projectId,
      { name, email, role },
      `invite-user:${email}`,
    );
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    setRows((previous) => [...previous, result.data]);
    setEmail("");
    setName("");
  }

  async function changeRole(user: ConsoleUser, next: ConsoleRole): Promise<void> {
    setRefused(null);
    const result = await api.changeConsoleRole(
      user.id,
      { role: next },
      `change-role:${user.id}:${next}`,
    );
    if (!result.ok) {
      setRefused(
        user.self && user.role === "admin" && admins.length === 1
          ? SETTINGS_COPY.lastAdmin
          : result.message,
      );
      return;
    }
    setRows((previous) =>
      previous.map((candidate) =>
        candidate.id === user.id ? { ...candidate, role: next } : candidate,
      ),
    );
  }

  async function remove(user: ConsoleUser): Promise<void> {
    setRefused(null);
    const result = await api.removeConsoleUser(user.id, `revoke-user:${user.id}`);
    if (!result.ok) {
      setRefused(
        user.role === "admin" && admins.length === 1
          ? SETTINGS_COPY.lastAdmin
          : result.message,
      );
      return;
    }
    setRows((previous) => previous.filter((candidate) => candidate.id !== user.id));
  }

  return (
    <section className="panel stack" aria-label={SETTINGS_COPY.usersHeading}>
      <h2 className="h3-display">{SETTINGS_COPY.usersHeading}</h2>
      <Rule />
      <ul className="stack-tight">
        {rows.map((user) => {
          const lastAdmin = user.role === "admin" && admins.length === 1;
          return (
            <li key={user.id}>
              <Strip>
                <div className="settings-row" data-user={user.id}>
                  <span className="record-cell">{user.name}</span>
                  <span className="record-cell">{user.email}</span>
                  <span>
                    <select
                      className="select"
                      value={user.role}
                      aria-label={`Role for ${user.name}`}
                      onChange={(event) =>
                        void changeRole(user, event.target.value as ConsoleRole)
                      }
                      data-user-role={user.id}
                    >
                      {ROLES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="record-cell">
                    {user.lastSignInAt
                      ? `Last signed in ${formatDate(user.lastSignInAt)}`
                      : `Invited ${formatDate(user.invitedAt)}, not yet signed in`}
                  </span>
                  <span>
                    {lastAdmin ? (
                      <span className="note" data-last-admin="true">
                        {SETTINGS_COPY.lastAdmin}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="quiet"
                        small
                        onClick={() => void remove(user)}
                        data-user-revoke={user.id}
                      >
                        Revoke access
                      </Button>
                    )}
                  </span>
                </div>
              </Strip>
            </li>
          );
        })}
      </ul>

      {refused ? (
        <Notice tone="blocked" title="The change was refused">
          <p>{refused}</p>
        </Notice>
      ) : null}

      <div className="stack">
        <h3 className="eyebrow">Invite somebody</h3>
        <div className="field">
          <label className="label" htmlFor="user-name">
            Name
          </label>
          <input
            id="user-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="user-email">
            Email
          </label>
          <input
            id="user-email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="user-new-role">
            Role
          </label>
          <select
            id="user-new-role"
            className="select"
            value={role}
            onChange={(event) => setRole(event.target.value as ConsoleRole)}
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <dl className="column-list">
          {ROLES.map((option) => (
            <div key={option.value} className="column-row">
              <dt className="record-cell">{option.label}</dt>
              <dd className="note">{option.note}</dd>
            </div>
          ))}
        </dl>
        <Button
          type="button"
          disabled={email.trim().length === 0 || name.trim().length === 0}
          onClick={() => void invite()}
          data-user-invite="true"
        >
          Send the invite
        </Button>
      </div>
      <p className="note">
        Access is revoked rather than removed from the record: what a user did
        stays attributed to them.
      </p>
    </section>
  );
}
