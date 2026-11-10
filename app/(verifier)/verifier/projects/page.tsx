import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Strip } from "@/components/Strip";
import { SavedSearches } from "@/components/verifier/SavedSearches";
import { WatchToggle } from "@/components/verifier/WatchToggle";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { PROJECTS_COPY } from "@/lib/copy/verifier";
import {
  coveragePercent,
  formatCount,
  formatCoverage,
  formatPeriod,
  orUnknown,
} from "@/lib/record";

export const metadata: Metadata = {
  title: "Projects",
};

type Search = { q?: string; country?: string };

export default async function VerifierProjects({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const [rows, watchlist] = await Promise.all([
    api.register({
      ...(search.q ? { q: search.q } : {}),
      ...(search.country ? { country: search.country } : {}),
      per_page: 50,
    }),
    api.watchlist(),
  ]);

  if (!rows.ok) {
    return (
      <div className="measure section-tight stack-lg">
        <Notice tone="blocked" title={headingFor(rows.code, "The register could not be read")}>
          <p>{rows.message}</p>
          <p className="note">{rows.remediation}</p>
        </Notice>
      </div>
    );
  }

  const watched = new Set(watchlist.ok ? watchlist.data.map((row) => row.id) : []);
  const countries = [...new Set(rows.data.map((row) => row.country))].sort();
  const filtered = Boolean(search.q || search.country);

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{PROJECTS_COPY.heading}</p>
        <h1 className="h2-display">{formatCount(rows.meta?.total ?? rows.data.length)} projects</h1>
        <p className="lede">{PROJECTS_COPY.lede}</p>
        <Rule weight="heavy" />
      </header>

      <form className="search-row" method="get" action="/verifier/projects">
        <div className="field" style={{ minWidth: "280px" }}>
          <label className="label" htmlFor="verifier-search">
            Project, operator or registry identifier
          </label>
          <input
            id="verifier-search"
            className="input"
            type="search"
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Ekuri, PV-2314, Hadejia"
          />
        </div>
        <div className="field" style={{ minWidth: "180px" }}>
          <label className="label" htmlFor="verifier-country">
            Country
          </label>
          <select
            id="verifier-country"
            className="select"
            name="country"
            defaultValue={search.country ?? ""}
          >
            <option value="">Any country</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-outline btn-sm">
          Search
        </button>
      </form>

      <SavedSearches current={search.q ?? ""} />

      {rows.data.length === 0 ? (
        <EmptyState line={filtered ? PROJECTS_COPY.filteredEmpty : "No project has published a period yet."} />
      ) : (
        <ul className="stack-tight">
          {rows.data.map((row) => (
            <li key={row.id}>
              <Strip>
                <div className="verifier-row wide" data-project={row.id}>
                  <span>
                    <Link href={`/verifier/projects/${row.id}`} prefetch={false}>
                      {row.name}
                    </Link>
                  </span>
                  <span className="record-cell">{row.developerName}</span>
                  <span className="record-cell">
                    {row.lastClosedPeriod
                      ? `${formatCoverage(row.lastClosedPaid, row.lastClosedEnrolled)} paid · ${coveragePercent(row.lastClosedPaid, row.lastClosedEnrolled)}%`
                      : "No period closed"}
                  </span>
                  <span className="record-cell">
                    {row.lastClosedPeriod
                      ? formatPeriod(row.lastClosedPeriod)
                      : orUnknown(null)}
                  </span>
                  <WatchToggle projectId={row.id} watching={watched.has(row.id)} />
                </div>
              </Strip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
