import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { PublicMasthead } from "@/components/public/PublicMasthead";
import { Coverage } from "@/components/public/Coverage";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Pagination } from "@/components/Pagination";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import { formatCount, formatPeriod, orUnknown } from "@/lib/record";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Every project that has closed a period, what it committed to, how many households it enrolled and how many it paid.",
};

const PER_PAGE = 25;

const SORTS = [
  { key: "name", label: "Project" },
  { key: "coverage", label: "Coverage" },
  { key: "enrolled", label: "Enrolled" },
] as const;

type Search = {
  q?: string;
  country?: string;
  sort?: string;
  page?: string;
  per_page?: string;
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  return (
    <>
      <PublicMasthead context="Public register" />
      <div className="measure section-tight stack-lg">
        <div className="stack">
          <p className="eyebrow">Register</p>
          <h1 className="h2-display">
            {process.env.ATTEST_API_MODE==='live'?'Every enrolled project, including those not yet paid':'Every project that has closed a period'}
          </h1>
          <p className="lede">
            What each project committed to in its own project design document,
            how many households it enrolled, and how many of them the bank
            settled a payment to. Coverage is computed from transfers that
            cleared, never entered by anyone.
          </p>
          <Rule weight="heavy" />
        </div>

        <form className="search-row" method="get" action="/register">
          <div className="field" style={{ minWidth: "280px" }}>
            <label className="label" htmlFor="register-search">
              {process.env.ATTEST_API_MODE==='live'?'Search by project name':'Search by project, operator or registry ID'}
            </label>
            <input
              id="register-search"
              className="input"
              type="search"
              name="q"
              defaultValue={search.q ?? ""}
              placeholder="Ekuri, PV-2314, Hadejia"
            />
          </div>
          <div className="field" style={{ minWidth: "180px" }}>
            <label className="label" htmlFor="register-country">
              Country
            </label>
            <select
              id="register-country"
              name="country"
              className="select"
              defaultValue={search.country ?? ""}
            >
              <option value="">Every country</option>
              <option value={process.env.ATTEST_API_MODE==='live'?'NG':'Nigeria'}>Nigeria</option>
              <option value={process.env.ATTEST_API_MODE==='live'?'KE':'Kenya'}>Kenya</option>
              <option value={process.env.ATTEST_API_MODE==='live'?'GH':'Ghana'}>Ghana</option>
              {process.env.ATTEST_API_MODE==='live'?<option value="UG">Uganda</option>:null}
            </select>
          </div>
          <button type="submit" className="btn-outline btn-sm">
            Search
          </button>
          {search.q || search.country ? (
            <Link href="/register" className="btn-quiet btn-sm">
              Clear
            </Link>
          ) : null}
        </form>

        <Suspense fallback={<Loading rows={6} label="Loading the register" />}>
          <RegisterRows search={search} />
        </Suspense>
      </div>
      <PublicFooter />
    </>
  );
}

async function RegisterRows({ search }: { search: Search }) {
  /* The register is read at request time rather than baked into the build:
     what it publishes changes when a period closes. */
  await connection();
  const page = Math.max(1, Number(search.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(search.per_page ?? PER_PAGE) || PER_PAGE));
  const result = await api.register({
    q: search.q,
    country: search.country,
    sort: search.sort,
    page,
    per_page: perPage,
  });

  if (!result.ok) {
    return (
      <Notice tone={result.code === "RATE_LIMITED" ? "flagged" : "blocked"} title={headingFor(result.code, "The register did not load")}>
        {result.message} {result.remediation}
      </Notice>
    );
  }

  const rows = result.data;
  const meta = result.meta;

  const filtered = Boolean(search.q || search.country);

  if (rows.length === 0) {
    return (
      <EmptyState
        line={
          filtered
            ? `No project matches ${[search.q && `“${search.q}”`, search.country && `country ${search.country}`]
                .filter(Boolean)
                .join(" and ")}. Other projects are on the register.`
            : "No project has closed a period yet. The register lists a project once its first period is sealed."
        }
        action={
          filtered ? (
            <Link href="/register" className="btn-outline btn-sm">
              Show every project
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="stack">
      <div className="table-scroll">
        <table className="table" data-row-count={meta?.total ?? rows.length}>
          <caption className="visually-hidden">
            Projects on the Attest register
          </caption>
          <thead>
            <tr>
              {SORTS.map((sort) => (
                <th
                  key={sort.key}
                  scope="col"
                  aria-sort={search.sort === sort.key ? "descending" : undefined}
                >
                  {process.env.ATTEST_API_MODE==='live'&&sort.key!=='name'?<span>{sort.label}</span>:<Link
                    href={{ pathname: "/register", query: { ...search, sort: sort.key } }}
                    className="record-cell"
                  >
                    {sort.label}
                    <span aria-hidden="true" className="sort-caret">
                      ▾
                    </span>
                  </Link>}
                </th>
              ))}
              <th scope="col">Country</th>
              <th scope="col">Registry</th>
              <th scope="col" className="numeric">
                Agreement
              </th>
              <th scope="col">Last closed period</th>
              <th scope="col" className="numeric">
                Open disputes
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/register/${row.id}`}>{row.name}</Link>
                  {row.isDemonstration?<p className="note">{row.demonstrationNotice??"Synthetic payment demonstration"}</p>:null}
                  <div className="eyebrow">{row.developerName}</div>
                </td>
                <td>
                  <Coverage paid={row.paid} enrolled={row.enrolled} />
                </td>
                <td className="numeric">{formatCount(row.enrolled)}</td>
                <td>{row.country}</td>
                <td>
                  {row.registry} {row.registryId}
                </td>
                <td className="numeric">{row.commitmentPct}% of revenue</td>
                <td>
                  {row.lastClosedPeriod ? formatPeriod(row.lastClosedPeriod) : orUnknown(null)}
                </td>
                <td className="numeric">{formatCount(row.openDisputes)}</td>
                <td>
                  {row.status === "active" ? (
                    <Stamp state="sealed" label="Active" recordId={row.id} />
                  ) : row.status === "withdrawn" ? (
                    <Stamp state="blocked" label="Withdrawn" recordId={row.id} />
                  ) : row.status === "suspended" ? (
                    <Stamp state="flagged" label="Suspended" recordId={row.id} />
                  ) : (
                    <Stamp state="review" label="Onboarding" recordId={row.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta ? (
        <Pagination
          meta={meta}
          label="Register pages"
          hrefFor={(next) => {
            const query = new URLSearchParams();
            for (const [key, value] of Object.entries(search)) {
              if (value) {
                query.set(key, String(value));
              }
            }
            if (next.page) {
              query.set("page", String(next.page));
            }
            if (next.per_page) {
              query.set("per_page", String(next.per_page));
            }
            return `/register?${query.toString()}`;
          }}
        />
      ) : null}
    </div>
  );
}
