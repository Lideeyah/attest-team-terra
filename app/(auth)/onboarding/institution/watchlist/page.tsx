import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button, ButtonLink } from "@/components/Button";
import { Coverage } from "@/components/public/Coverage";
import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Steps } from "@/components/auth/Steps";
import { api } from "@/lib/api/client";
import {
  INSTITUTION_STEPS,
  readInstitutionWizard,
  writeInstitutionWizard,
} from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "Your watchlist",
  description: "Choose the projects you want to follow. The register is searchable here.",
};

async function watch(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  const wizard = await readInstitutionWizard();
  const watching = wizard.watching ?? [];
  const next = watching.includes(projectId)
    ? watching.filter((id) => id !== projectId)
    : [...watching, projectId];

  await api.watch({ projectId });
  await writeInstitutionWizard({ ...wizard, watching: next });
  redirect("/onboarding/institution/watchlist");
}

async function finish() {
  "use server";
  const wizard = await readInstitutionWizard();
  await writeInstitutionWizard({ ...wizard, step: "watchlist" });
  redirect("/verifier");
}

export default async function WatchlistStep({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  await connection();
  const search = await searchParams;
  const wizard = await readInstitutionWizard();
  const watching = wizard.watching ?? [];
  const register = await api.register({ q: search.q, page: 1, per_page: 25 });

  return (
    <>
      <Steps
        steps={INSTITUTION_STEPS}
        current="watchlist"
        hrefFor={(key) => `/onboarding/institution/${key}`}
      />
      <div className="stack">
        <p className="eyebrow">Step two</p>
        <h1 className="h2-display">Which projects do you follow?</h1>
        <p className="lede">
          You can change this at any time, and you can read every project on the
          register whether you follow it or not. Following one means you are
          told when it closes a period, when a dispute is raised against it and
          when a correction is issued.
        </p>
        <Rule weight="heavy" />
      </div>

      <form method="get" className="search-row">
        <div className="field" style={{ minWidth: "260px" }}>
          <label className="label" htmlFor="watchlist-search">
            Search the register
          </label>
          <input
            id="watchlist-search"
            name="q"
            type="search"
            className="input"
            defaultValue={search.q ?? ""}
            placeholder="Trees for Global Benefits, Plan Vivo, Hoima"
          />
        </div>
        <button type="submit" className="btn-outline btn-sm">
          Search
        </button>
      </form>

      {!register.ok ? (
        <Notice tone="flagged" title={register.code}>
          {register.message} {register.remediation}
        </Notice>
      ) : register.data.length === 0 ? (
        <EmptyState
          line={`No project matches “${search.q}”. You can skip this and follow projects later.`}
        />
      ) : (
        <div className="panel">
          {register.data.map((row) => (
            <form action={watch} key={row.id} className="strip">
              <input type="hidden" name="projectId" value={row.id} />
              <span style={{ flex: 1 }}>
                <Link href={`/register/${row.id}`} className="record-cell">
                  {row.name}
                </Link>
                <span className="eyebrow" style={{ display: "block" }}>
                  {row.developerName} · {row.registry} {row.registryId}
                </span>
              </span>
              <Coverage paid={row.paid} enrolled={row.enrolled} />
              <Button type="submit" small variant={watching.includes(row.id) ? "solid" : "outline"}>
                {watching.includes(row.id) ? "Following" : "Follow"}
              </Button>
            </form>
          ))}
        </div>
      )}

      <div className="row">
        <form action={finish}>
          <Button type="submit">
            {watching.length === 0 ? "Skip for now" : `Follow ${watching.length} and continue`}
          </Button>
        </form>
        <ButtonLink href="/register" variant="quiet" small>
          Browse the register first
        </ButtonLink>
      </div>
    </>
  );
}
