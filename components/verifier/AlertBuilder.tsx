"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";
import { ALERT_COPY } from "@/lib/copy/verifier";
import type { VerifierAlert } from "@/lib/api/contract";

const CONDITIONS: VerifierAlert["condition"][] = [
  "coverage-below",
  "dispute-raised",
  "period-closed-late",
  "correction-issued",
];

/* An alert watches a record and links it. It carries no threshold language
   beyond the number the reader chose, and it never says what the number
   means. */
export function AlertBuilder({ projects }: { projects: { id: string; name: string }[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [condition, setCondition] = useState<VerifierAlert["condition"]>("coverage-below");
  const [threshold, setThreshold] = useState(50);
  const [saved, setSaved] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  async function create(): Promise<void> {
    setRefused(null);
    const result = await api.createAlert(
      { projectId, condition, threshold: threshold / 100 },
      `alert:${projectId}:${condition}:${threshold}`,
    );
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    setSaved(true);
  }

  return (
    <section className="panel stack" aria-label="Add an alert">
      <h2 className="h3-display">Add an alert</h2>
      {process.env.NEXT_PUBLIC_ATTEST_API_MODE==='live'?<p className="note">The coverage threshold measures money received against the commitment, not the fraction of households paid. Rule removal is not currently supported.</p>:null}
      <Rule />
      <div className="field">
        <label className="label" htmlFor="alert-project">
          Project
        </label>
        <select
          id="alert-project"
          className="select"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          data-alert-project
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="stack-tight">
        <legend className="label">Tell me when</legend>
        {CONDITIONS.map((option) => (
          <label key={option} className="punch-label">
            <input
              className="punch"
              type="radio"
              name="condition"
              checked={condition === option}
              onChange={() => setCondition(option)}
              data-alert-condition={option}
            />
            <span>{ALERT_COPY.conditions[option]}</span>
          </label>
        ))}
      </fieldset>
      {condition === "coverage-below" ? (
        <div className="field">
          <label className="label" htmlFor="alert-threshold">
            Below this share of households paid
          </label>
          <input
            id="alert-threshold"
            className="input"
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
            data-alert-threshold
          />
          <p className="field-note">
            The figure is yours. Attest does not have one it thinks is right.
          </p>
        </div>
      ) : null}
      <Button type="button" onClick={() => void create()} data-alert-create>
        Add the alert
      </Button>
      {saved ? (
        <Notice title="Added">
          <p>It watches from now on, and links the record when it fires.</p>
        </Notice>
      ) : null}
      {refused ? (
        <Notice tone="blocked" title="The alert was not added">
          <p>{refused}</p>
        </Notice>
      ) : null}
    </section>
  );
}
