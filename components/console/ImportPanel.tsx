"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Disclose } from "@/components/Disclose";
import { Notice } from "@/components/Notice";
import { api, newIdempotencyKey } from "@/lib/api/client";
import { COLUMN_NOTE, IMPORT_COLUMNS, IMPORT_COPY, headerLine } from "@/lib/copy/import";
import { formatCount } from "@/lib/record";
import { LiveRosterImport } from "./LiveRosterImport";

type Outcome =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "done"; imported: number; failed: number }
  | { kind: "rejected"; message: string; remediation: string };

/** The roster uploader. The format is the one module both lanes read, so the
    column list here is not a second opinion about what a row is. */
export function ImportPanel({ projectId }: { projectId: string }) {
  return process.env.NEXT_PUBLIC_ATTEST_API_MODE==='live'?<LiveRosterImport projectId={projectId}/>:<MockImportPanel projectId={projectId}/>;
}
function MockImportPanel({ projectId }: { projectId: string }) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const file = useRef<HTMLInputElement>(null);

  async function upload(): Promise<void> {
    const chosen = file.current?.files?.[0];
    if (!chosen) {
      return;
    }
    setOutcome({ kind: "reading" });
    const text = await chosen.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const header = (lines[0] ?? "").split(",").map((column) => column.trim());
    const missing = IMPORT_COLUMNS.filter((column) => !header.includes(column));
    if (missing.length > 0) {
      setOutcome({
        kind: "rejected",
        message: `The header row is missing ${missing.join(", ")}.`,
        remediation:
          "Add the missing columns and upload the file again. Columns may be in any order and extra columns are ignored.",
      });
      return;
    }
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",");
      return Object.fromEntries(
        header.map((column, index) => [column, (values[index] ?? "").trim()]),
      );
    });
    const result = await api.importParticipants(projectId, { rows }, newIdempotencyKey());
    if (!result.ok) {
      setOutcome({
        kind: "rejected",
        message: result.message,
        remediation: result.remediation,
      });
      return;
    }
    setOutcome({
      kind: "done",
      imported: result.data.imported,
      failed: result.data.failed,
    });
  }

  return (
    <section className="panel stack" aria-label={IMPORT_COPY.heading}>
      <h2 className="h3-display">{IMPORT_COPY.heading}</h2>
      <p className="prose">{IMPORT_COPY.format}</p>

      <Disclose summary="The columns a row carries" meta={`${IMPORT_COLUMNS.length} columns`}>
        <dl className="column-list">
          {IMPORT_COLUMNS.map((column) => (
            <div key={column} className="column-row">
              <dt className="record-cell">{column}</dt>
              <dd className="note">{COLUMN_NOTE[column]}</dd>
            </div>
          ))}
        </dl>
        <p className="record-cell" data-import-header={headerLine()}>
          {headerLine()}
        </p>
      </Disclose>

      <div className="field">
        <label className="label" htmlFor="roster-file">
          The file
        </label>
        <input
          id="roster-file"
          className="input"
          type="file"
          accept=".csv,text/csv"
          ref={file}
        />
      </div>

      <Button type="button" onClick={() => void upload()} data-import-submit="true">
        {outcome.kind === "reading" ? "Reading the file" : "Import"}
      </Button>

      {outcome.kind === "done" ? (
        <Notice
          tone={outcome.failed > 0 ? "flagged" : undefined}
          title={
            outcome.failed > 0
              ? `${formatCount(outcome.failed)} rows failed`
              : `${formatCount(outcome.imported)} households enrolled`
          }
        >
          <p>
            {outcome.failed > 0
              ? `${formatCount(outcome.imported)} rows were enrolled and ${formatCount(outcome.failed)} failed.`
              : IMPORT_COPY.complete(outcome.imported)}
          </p>
          {outcome.failed > 0 ? <p className="note">{IMPORT_COPY.failureNote}</p> : null}
        </Notice>
      ) : null}

      {outcome.kind === "rejected" ? (
        <Notice tone="blocked" title="The file was not read">
          <p>{outcome.message}</p>
          <p className="note">{outcome.remediation}</p>
        </Notice>
      ) : null}
    </section>
  );
}
