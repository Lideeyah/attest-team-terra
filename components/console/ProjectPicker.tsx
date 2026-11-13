"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { backendRequest } from "@/lib/api/backend";

export type ProjectPickerProps = {
  projectId?: string;
  variant?: "sidebar" | "overview";
  className?: string;
};

export function ProjectPicker({
  projectId,
  variant = "overview",
  className,
}: ProjectPickerProps) {
  const [selected, setSelected] = useState(projectId ?? "");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      backendRequest<{ id: string; name: string }[]>("/api/projects?per_page=100"),
      backendRequest<{ projectId?: string }>("/api/auth/session"),
    ])
      .then(([r, session]) => {
        if (active) {
          setProjects(r.data);
          setSelected((current) => current || session.data.projectId || r.data[0]?.id || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (variant === "overview") {
    return (
      <div className={`overview-project-block panel ${className ?? ""}`}>
        <div className="overview-project-header">
          <span className="overview-project-label">Current project</span>
        </div>
        <form
          action="/project"
          method="post"
          className="overview-project-form"
          onSubmit={() => setOpening(true)}
        >
          <div className="overview-project-select-container">
            <select
              className="select overview-project-select"
              name="projectId"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Current project"
              required
              disabled={loading || opening || !projects.length}
            >
              {!projects.length ? (
                <option value="">
                  {loading ? "Loading projects..." : "No projects available"}
                </option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="submit"
            className="btn-outline btn-sm overview-project-btn"
            disabled={loading || opening || !projects.length}
            aria-busy={opening || undefined}
          >
            {opening ? "Opening..." : "Open project"}
          </button>
          <Link
            href="/onboarding/developer/project"
            className="overview-project-add-link"
          >
            Add project
          </Link>
        </form>
        {error ? <p role="status" className="field-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={className ?? "stack sidebar-project-picker"}>
      <p className="label">Current project</p>
      <form
        action="/project"
        method="post"
        className="project-picker"
        onSubmit={() => setOpening(true)}
      >
        <select
          className="select"
          name="projectId"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Project"
          required
          disabled={loading || opening || !projects.length}
        >
          {!projects.length ? (
            <option value="">
              {loading ? "Loading projects..." : "No projects available"}
            </option>
          ) : (
            projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))
          )}
        </select>
        <button
          className="btn-outline btn-sm"
          disabled={loading || opening || !projects.length}
          aria-busy={opening || undefined}
        >
          {opening ? "Opening..." : "Open project"}
        </button>
        <Link href="/onboarding/developer/project">Add project</Link>
      </form>
      {error ? <p role="status">{error}</p> : null}
    </div>
  );
}
