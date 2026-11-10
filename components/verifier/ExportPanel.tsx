"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { api } from "@/lib/api/client";
import { EXPORT_COPY } from "@/lib/copy/verifier";
import { formatPeriod } from "@/lib/record";
import type { DisclosureBundle } from "@/lib/api/contract";

type Project = { id: string; name: string; period: string };

type State =
  | { kind: "nothing" }
  | { kind: "generating" }
  | { kind: "ready"; bundle: DisclosureBundle | null; url: string | null }
  | { kind: "failed"; line: string };

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
  const [format, setFormat] = useState<"disclosure" | "csv" | "record">("disclosure");
  const [state, setState] = useState<State>(
    initial === "ready"
      ? { kind: "ready", bundle: null, url: null }
      : initial === "failed"
        ? { kind: "failed", line: EXPORT_COPY.failed }
        : { kind: "nothing" },
  );

  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  async function generate(): Promise<void> {
    if (!project) {
      return;
    }
    setState({ kind: "generating" });
    const result = await api.exportBundle(
      { projectId: project.id, period: project.period, format },
      `export:${project.id}:${project.period}:${format}`,
    );
    if (!result.ok) {
      setState({ kind: "failed", line: EXPORT_COPY.failed });
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
      <p className="note">{EXPORT_COPY.nothing}</p>
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
                  {candidate.name} · {formatPeriod(candidate.period)}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="stack-tight">
            <legend className="label">Format</legend>
            {(["disclosure", "record", "csv"] as const).map((option) => (
              <label key={option} className="punch-label">
                <input
                  className="punch"
                  type="radio"
                  name="format"
                  checked={format === option}
                  onChange={() => setFormat(option)}
                  data-export-format={option}
                />
                <span>
                  <span className="record-cell">{option}</span>
                  <span className="note"> {EXPORT_COPY.formats[option]}</span>
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
        <Notice tone="blocked" title="The export was not generated">
          <p data-export-state="failed">{state.line}</p>
        </Notice>
      ) : null}
    </section>
  );
}
