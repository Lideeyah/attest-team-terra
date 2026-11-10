import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PublicMasthead } from "@/components/public/PublicMasthead";
import { Coverage } from "@/components/public/Coverage";
import { CoverageChart } from "@/components/CoverageChart";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { formatCount, formatNaira } from "@/lib/record";

export const metadata: Metadata = {
  title: "Operator record — Attest",
  description:
    "Every project under one operator, what each committed to, and how many households each paid.",
};

export default async function DeveloperPage({
  params,
}: {
  params: Promise<{ developerId: string }>;
}) {
  const { developerId } = await params;
  return (
    <>
      <PublicMasthead context="Public register" />
      <div className="measure section-tight stack-lg">
        <Suspense fallback={<Loading rows={6} label="Loading the operator" />}>
          <DeveloperBody developerId={developerId} />
        </Suspense>
      </div>
    </>
  );
}

async function DeveloperBody({ developerId }: { developerId: string }) {
  await connection();
  const result = await api.publicDeveloper(developerId);

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <Notice tone="blocked" title={result.code}>
        {result.message} {result.remediation}
      </Notice>
    );
  }

  const { developerName, projects, aggregate } = result.data;
  const withdrawn = projects.filter((project) => project.status === "withdrawn");
  const closedPeriods = projects.flatMap((project) =>
    project.periods.filter((period) => period.state !== "open"),
  );

  /* The trend is the operator's own closed periods in order, so a reader can
     see whether coverage is rising or falling across them. */
  const trend = closedPeriods
    .slice()
    .sort((left, right) => left.period.localeCompare(right.period))
    .map((period) => ({
      label: period.period,
      paid: period.paid,
      enrolled: period.enrolled,
    }));

  return (
    <>
      <div className="stack">
        <p className="eyebrow">Operator</p>
        <h1 className="h2-display">{developerName}</h1>
        <Rule weight="heavy" />
      </div>

      {closedPeriods.length === 0 ? (
        <Notice title="No period has closed under this operator">
          Its projects are enrolled and their commitments are recorded. Nothing
          has been paid under them yet.
        </Notice>
      ) : null}

      {withdrawn.length > 0 ? (
        <Notice tone="flagged" title={`${withdrawn.length} project withdrawn`}>
          A withdrawn project stops closing new periods. Everything it already
          published stays on the register and stays readable.
        </Notice>
      ) : null}

      <div
        className="grid-ruled"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
      >
        <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
          <p className="eyebrow">Households paid, across every project</p>
          <Coverage paid={aggregate.paid} enrolled={aggregate.enrolled} size="figure" />
        </div>
        <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
          <p className="eyebrow">Projects</p>
          <p className="figure-value">{formatCount(projects.length)}</p>
          <p className="figure-denominator">
            {formatCount(withdrawn.length)} withdrawn
          </p>
        </div>
        <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
          <p className="eyebrow">Periods closed</p>
          <p className="figure-value">{formatCount(closedPeriods.length)}</p>
          <p className="figure-denominator">across every project</p>
        </div>
      </div>

      {trend.length > 0 ? (
        <div className="stack">
          <h2 className="h3-display">Coverage across closed periods</h2>
          <CoverageChart
            bars={trend}
            title="Households paid against households enrolled, by period, across this operator's projects"
          />
        </div>
      ) : null}

      <div className="stack">
        <h2 className="h3-display">Projects</h2>
        {projects.length === 0 ? (
          <EmptyState line="This operator has no project on the register." />
        ) : (
          <div className="panel">
            {projects.map((project) => {
              const latest =
                project.periods.filter((period) => period.state !== "open").at(-1) ??
                project.periods[0];
              return (
                <div
                  key={project.id}
                  className={
                    project.status === "withdrawn" ? "strip strip-blocked" : "strip"
                  }
                >
                  <span style={{ flex: 1 }}>
                    <Link href={`/register/${project.id}`} className="record-cell">
                      {project.name}
                    </Link>
                    <span className="eyebrow" style={{ display: "block" }}>
                      {project.registry} {project.registryId} · {project.state}
                    </span>
                  </span>
                  <Coverage paid={latest.paid} enrolled={latest.enrolled} />
                  <span className="record-cell numeric">
                    {formatNaira(latest.amountToHouseholds)}
                  </span>
                  <Stamp
                    state={project.status === "withdrawn" ? "blocked" : "sealed"}
                    label={project.status === "withdrawn" ? "Withdrawn" : latest.period}
                    recordId={project.id}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
