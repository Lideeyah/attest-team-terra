import type { Metadata } from "next";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { ComparePicker } from "@/components/verifier/ComparePicker";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { COMPARE_COPY } from "@/lib/copy/verifier";
import { confirmationPercent, formatCount, formatCoverage, formatNaira, formatPeriod, orUnknown } from "@/lib/record";

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
  const unknown = compared && compared.ok ? compared.data.unknown : [];

  /* The dispute rate the phase asks for, per project per shared period, read
     from each project's own reports. */
  const disputeResults = await Promise.all(
    projects.map((project) => api.disputes(project.id, { per_page: 100 })),
  );
  const disputeCounts: Record<string, Record<string, number>> = {};
  projects.forEach((project, index) => {
    const rows = disputeResults[index];
    disputeCounts[project.id] = {};
    if (!rows.ok) {
      return;
    }
    for (const dispute of rows.data) {
      disputeCounts[project.id][dispute.period] =
        (disputeCounts[project.id][dispute.period] ?? 0) + 1;
    }
  });

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{COMPARE_COPY.heading}</p>
        <h1 className="h2-display">Compare projects</h1>
        {projects.length > 0 ? <p className="note">{projects.map((project) => project.name).join(" · ")}</p> : null}
        <p className="lede">{COMPARE_COPY.note}</p>
        <Rule weight="heavy" />
      </header>

      <ComparePicker options={options} selected={ids} />

      {unknown.length > 0 ? (
        <Notice tone="flagged" title="One of these is not a project on the register">
          <p data-unknown={unknown.join(",")}>
            {unknown.join(", ")} {unknown.length === 1 ? "is" : "are"} not on the
            register, so {unknown.length === 1 ? "it is" : "they are"} not in
            the comparison below.
          </p>
        </Notice>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState line={COMPARE_COPY.nothing} />
      ) : shared.length === 0 ? (
        /* A calendar fact, not a flag: these projects simply have not closed
           the same period. */
        <Notice title="There is no period to compare these on">
          <p data-incomparable="true">
            {COMPARE_COPY.incomparable(projects.map((project) => project.name))}
          </p>
        </Notice>
      ) : (
        <section className="stack" aria-label="Comparison">
          <p className="note">
            Compared on {formatCount(shared.length)}{" "}
            {shared.length === 1 ? "period" : "periods"} every one of them
            closed:{" "}
            {shared.map((period) => formatPeriod(period)).join(", ")}.
          </p>
          <Rule />
          <div className="table-scroll" role="region" aria-label="Project comparison results" tabIndex={0}>
          <table className="table compare-table">
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
                            {confirmationPercent(own.confirmationRate)}% of
                            those confirmed ·{" "}
                            {formatCount(
                              disputeCounts[project.id]?.[period] ?? 0,
                            )}{" "}
                            reports of {formatCount(own.paid)} paid ·{" "}
                            {Number(own.shortfall) > 0
                              ? `${formatNaira(own.shortfall)} short of ${formatNaira(own.required)}`
                              : `no shortfall against ${formatNaira(own.required)}`}
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
          </div>
          <p className="note">
            {COMPARE_COPY.columns.coverage}; {COMPARE_COPY.columns.confirmation};{" "}
            {COMPARE_COPY.columns.disputes}; {COMPARE_COPY.columns.shortfall}.
            Nothing here ranks these projects and no figure is weighed against
            another project&rsquo;s.
          </p>
        </section>
      )}
    </div>
  );
}
