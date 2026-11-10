"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { api } from "@/lib/api/client";
import { EXPORT_COPY } from "@/lib/copy/verifier";
import { headingFor } from "@/lib/copy/codes";
import { VerifierKeys } from "@/components/verifier/VerifierKeys";
import { formatPeriod } from "@/lib/record";
import type { DisclosureBundle } from "@/lib/api/contract";

type Project = { id: string; name: string; periods: string[] };

type State =
  | { kind: "nothing" }
  | { kind: "generating" }
  | { kind: "ready"; bundle: DisclosureBundle | null; url: string | null }
  | { kind: "failed"; title: string; line: string; remediation: string };

/* The three formats, named for a reader rather than by their enum. */
const FORMATS = [
  { value: "disclosure", label: "A disclosure bundle for one transfer" },
  { value: "record", label: "The period's attestation as published" },
  { value: "csv", label: "The period's figures as a table" },
] as const;

/* The export, and the round trip that makes it worth anything: what this
   panel produces is pasted into the public verifier, which recomputes the
   leaf from the transfer's own facts and folds the path to the period's
   published root. An export nobody can check is a file. */
export function ExportPanel({
  projects,
  initial,
}: {
  projects: Project[];
  initial: string | null;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [period, setPeriod] = useState(projects[0]?.periods[0] ?? "");
  const [format, setFormat] = useState<"disclosure" | "csv" | "record">("disclosure");
  const [state, setState] = useState<State>(
    initial === "ready"
      ? { kind: "ready", bundle: null, url: null }
      : initial === "failed"
        ? {
            kind: "failed",
            title: "The export was not generated",
            line: EXPORT_COPY.failed,
            remediation: "Choose a period the project has closed and try again.",
          }
        : { kind: "nothing" },
  );

  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  async function generate(): Promise<void> {
    if (!project) {
      return;
    }
    setState({ kind: "generating" });
    const result = await api.exportBundle(
      { projectId: project.id, period, format },
      `export:${project.id}:${period}:${format}`,
    );
    if (!result.ok) {
      /* What the server said, in the words this product uses for it, with
         the remediation it gave: one fixed sentence cannot tell a rate limit
         from a period that was never closed. */
      setState({
        kind: "failed",
        title: headingFor(result.code, "The export was not generated"),
        line: result.message,
        remediation: result.remediation,
      });
      return;
    }
    setState({
      kind: "ready",
      bundle: result.data.bundle ?? null,
      url: result.data.url ?? null,
    });
  }

  return (
    <section className="panel stack" aria-label={EXPORT_COPY.heading}>
      {state.kind === "nothing" ? (
        <p className="note">{EXPORT_COPY.nothing}</p>
      ) : null}
      {projects.length === 0 ? (
        <p className="note">
          No project has closed a period yet, so there is nothing to export.
        </p>
      ) : (
        <>
          <div className="field">
            <label className="label" htmlFor="export-project">
              Project and period
            </label>
            <select
              id="export-project"
              className="select"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              data-export-project
            >
              {projects.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="export-period">
              Period
            </label>
            <select
              id="export-period"
              className="select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              data-export-period
            >
              {(project?.periods ?? []).map((candidate) => (
                <option key={candidate} value={candidate}>
                  {formatPeriod(candidate)}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="stack-tight">
            <legend className="label">Format</legend>
            {FORMATS.map((option) => (
              <label key={option.value} className="punch-label">
                <input
                  className="punch"
                  type="radio"
                  name="format"
                  checked={format === option.value}
                  onChange={() => setFormat(option.value)}
                  data-export-format={option.value}
                />
                <span>
                  <span className="record-cell">{option.label}</span>
                  <span className="note"> {EXPORT_COPY.formats[option.value]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <Button
            type="button"
            disabled={state.kind === "generating"}
            onClick={() => void generate()}
            data-export-go
          >
            {state.kind === "generating" ? EXPORT_COPY.generating : "Generate"}
          </Button>
        </>
      )}

      {state.kind === "ready" ? (
        <Notice title="Ready">
          <p data-export-state="ready">{EXPORT_COPY.ready}</p>
          {state.bundle ? (
            <pre className="console-bed" data-export-bundle>
              {JSON.stringify(state.bundle, null, 2)}
            </pre>
          ) : null}
          <p>
            <Link href="/verify" prefetch={false}>
              {EXPORT_COPY.verifyHere}
            </Link>
          </p>
          {state.url ? (
            <p>
              <a className="btn-outline btn-sm" href={state.url} download>
                Download the record
              </a>
            </p>
          ) : null}
        </Notice>
      ) : null}

      {state.kind === "failed" ? (
        <Notice tone="blocked" title={state.title}>
          <p data-export-state="failed">{state.line}</p>
          <p className="note">{state.remediation}</p>
        </Notice>
      ) : null}

      <VerifierKeys />
    </section>
  );
}
