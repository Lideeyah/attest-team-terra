import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { ComparePicker } from "@/components/verifier/ComparePicker";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { COMPARE_COPY } from "@/lib/copy/verifier";
import {
  formatCount,
  formatCoverage,
  formatNaira,
  formatPeriod,
  orUnknown,
} from "@/lib/record";

export const metadata: Metadata = {
  title: "Compare",
};

type Search = { ids?: string };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const ids = (search.ids ?? "").split(",").filter(Boolean).slice(0, 3);

  const [register, compared] = await Promise.all([
    api.register({ per_page: 50 }),
    ids.length > 0 ? api.compare(ids) : Promise.resolve(null),
  ]);

  const options = register.ok
    ? register.data.map((row) => ({ id: row.id, name: row.name }))
    : [];

  if (compared && !compared.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(compared.code, "These projects could not be compared")}>
          <p>{compared.message}</p>
        </Notice>
      </div>
    );
  }

  const projects = compared && compared.ok ? compared.data.projects : [];
  const shared = compared && compared.ok ? compared.data.comparablePeriods : [];

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{COMPARE_COPY.heading}</p>
        <h1 className="h2-display">
          {projects.length === 0
            ? "Compare projects"
            : projects.map((project) => project.name).join(" · ")}
        </h1>
        <p className="lede">{COMPARE_COPY.note}</p>
        <Rule weight="heavy" />
      </header>

      <ComparePicker options={options} selected={ids} />

      {projects.length === 0 ? (
        <EmptyState line={COMPARE_COPY.nothing} />
      ) : shared.length === 0 ? (
        <Notice tone="flagged" title="There is no period to compare these on">
          <p data-incomparable="true">
            {COMPARE_COPY.incomparable(projects.map((project) => project.name))}
          </p>
        </Notice>
      ) : (
        <section className="stack" aria-label="Comparison">
          <p className="note">
            Compared on {formatCount(shared.length)} periods both closed:{" "}
            {shared.map((period) => formatPeriod(period)).join(", ")}.
          </p>
          <Rule />
          <table className="table">
            <caption className="eyebrow">
              Every figure below is each project&rsquo;s own, on the periods
              they share
            </caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                {projects.map((project) => (
                  <th scope="col" key={project.id}>
                    {project.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shared.map((period) => (
                <tr key={period} data-compare-period={period}>
                  <th scope="row" className="record-cell">
                    {formatPeriod(period)}
                  </th>
                  {projects.map((project) => {
                    const own = project.periods.find(
                      (candidate) => candidate.period === period,
                    );
                    return (
                      <td key={project.id} className="record-cell">
                        {own ? (
                          <>
                            {formatCoverage(own.paid, own.enrolled)} paid ·{" "}
                            {Math.round(own.confirmationRate)}% confirmed ·{" "}
                            {Number(own.shortfall) > 0
                              ? `${formatNaira(own.shortfall)} short`
                              : "no shortfall"}
                          </>
                        ) : (
                          orUnknown(null)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">
            {COMPARE_COPY.columns.coverage}; {COMPARE_COPY.columns.confirmation};{" "}
            {COMPARE_COPY.columns.shortfall}. Nothing here ranks these projects
            and no figure is weighed against another project&rsquo;s.
          </p>
        </section>
      )}
    </div>
  );
}
