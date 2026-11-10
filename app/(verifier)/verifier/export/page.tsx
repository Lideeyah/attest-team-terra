import type { Metadata } from "next";
import { connection } from "next/server";
import { Rule } from "@/components/Rule";
import { ExportPanel } from "@/components/verifier/ExportPanel";
import { api } from "@/lib/api/client";
import { EXPORT_COPY } from "@/lib/copy/verifier";

export const metadata: Metadata = {
  title: "Export",
};

type Search = { state?: string };

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const register = await api.register({ per_page: 50 });
  const projects = register.ok
    ? register.data
        .filter((row) => row.lastClosedPeriod !== null)
        .map((row) => ({
          id: row.id,
          name: row.name,
          period: row.lastClosedPeriod as string,
        }))
    : [];

  return (
    <div className="measure section-tight stack-lg">
      <header className="stack">
        <p className="eyebrow">{EXPORT_COPY.heading}</p>
        <h1 className="h2-display">Export a record</h1>
        <p className="lede">
          An export is the record itself rather than a report about it. A
          disclosure bundle folds to the period&rsquo;s own root on the public
          verifier, which is how an auditor checks it without taking anybody&rsquo;s
          word for it.
        </p>
        <Rule weight="heavy" />
      </header>

      <ExportPanel projects={projects} initial={search.state ?? null} />
    </div>
  );
}
