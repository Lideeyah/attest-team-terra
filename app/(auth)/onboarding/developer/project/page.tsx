import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Submit } from "@/components/auth/Submit";
import { Steps } from "@/components/auth/Steps";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import {
  DEVELOPER_STEPS,
  advanceDeveloperWizard,
  readDeveloperWizard,
  writeDeveloperWizard,
} from "@/lib/onboarding";
import { formatDateTime } from "@/lib/record";

export const metadata: Metadata = {
  title: "The project",
  description: "Start with the registry identifier of the project itself.",
};

async function lookUp(formData: FormData) {
  "use server";
  const registryId = String(formData.get("registryId") ?? "").trim();
  const wizard = await readDeveloperWizard();
  /* What was typed is kept whatever happens next, so a refusal does not empty
     the field the reader has to correct. */
  await writeDeveloperWizard({ ...wizard, registryId });

  if (registryId.length === 0) {
    redirect("/onboarding/developer/project?state=empty");
  }

  const result = await api.lookupProject({ registryId });
  if (!result.ok) {
    redirect(`/onboarding/developer/project?state=error&code=${result.code}`);
  }

  await advanceDeveloperWizard(wizard, "project", { registryId });
  redirect("/onboarding/developer/verify");
}

/* The registry did not answer. The details are taken by hand and queued for
   review; nothing is published from a manual entry until somebody has checked
   it against the registry itself. */
async function enterByHand(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const methodology = String(formData.get("methodology") ?? "").trim();
  const wizard = await readDeveloperWizard();

  if (name.length === 0 || country.length === 0) {
    redirect("/onboarding/developer/project?state=manual-incomplete");
  }

  await writeDeveloperWizard({
    ...wizard,
    manualEntry: {
      name,
      country,
      methodology,
      queuedAt: new Date().toISOString(),
    },
  });
  redirect("/onboarding/developer/project?state=queued");
}

export default async function ProjectStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string }>;
}) {
  const search = await searchParams;
  const wizard = await readDeveloperWizard();
  const unreachable = search.code === "REGISTRY_UNREACHABLE" || wizard.manualEntry !== undefined;

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="project"
        reached={wizard.reached}
        hrefFor={(key) => `/onboarding/developer/${key}`}
      />
      <div className="stack">
        <p className="eyebrow">Step one</p>
        <h1 className="h2-display">Which project is this?</h1>
        <p className="lede">
          The project comes before the company, because a project that does not
          exist in a registry has nothing to attest to.
        </p>
        <Rule weight="heavy" />
      </div>

      {search.state === "empty" ? (
        <Notice tone="flagged" title="Enter the registry identifier">
          It is on the project&rsquo;s own page at Gold Standard, Verra, Plan
          Vivo or Acorn.
        </Notice>
      ) : null}

      {search.code === "REGISTRY_NOT_FOUND" ? (
        <Notice tone="blocked" title={headingFor("REGISTRY_NOT_FOUND", "No project with that identifier")}>
          The registry does not hold one under that identifier. Check it against
          the registry&rsquo;s own project page; a project that is not listed
          there cannot be registered here.
        </Notice>
      ) : null}

      {search.state === "manual-incomplete" ? (
        <Notice tone="flagged" title="The name and the country are needed">
          Both are checked against the registry when it answers again.
        </Notice>
      ) : null}

      {search.state === "queued" && wizard.manualEntry ? (
        <Notice title="The details are queued for review">
          <p>
            {wizard.manualEntry.name}, {wizard.manualEntry.country}, entered by
            hand on {formatDateTime(wizard.manualEntry.queuedAt)}.
          </p>
          <p className="note">
            Attest checks them against the registry before the project appears
            on the public register. Nothing is published from a manual entry
            until it has been checked.
          </p>
        </Notice>
      ) : null}

      {unreachable && search.state !== "queued" ? (
        <Notice tone="flagged" title={headingFor("REGISTRY_UNREACHABLE", "The registry did not answer")}>
          Enter the project&rsquo;s details by hand below and they are queued
          for review before the project goes on the register. Nothing is
          published from a manual entry until somebody has checked it.
        </Notice>
      ) : null}

      <form action={lookUp} className="stack-lg">
        <div className="field">
          <label className="label" htmlFor="registry-id">
            Registry identifier
          </label>
          <input
            id="registry-id"
            name="registryId"
            className="input"
            data-registry-id
            defaultValue={wizard.registryId ?? ""}
            placeholder="GS-10342"
          />
          <p className="field-note">Gold Standard, Verra, Plan Vivo or Acorn</p>
        </div>
        <div className="row">
          <Submit label="Find the project" pending="Asking the registry" />
        </div>
      </form>

      {unreachable ? (
        <form action={enterByHand} className="stack-lg" data-manual-entry>
          <h2 className="h3-display">Enter the project by hand</h2>
          <p className="note">
            Queued for review. The registry is asked again, and what it says
            takes precedence over what is entered here.
          </p>
          <div className="field">
            <label className="label" htmlFor="manual-name">
              Project name
            </label>
            <input
              id="manual-name"
              name="name"
              className="input"
              data-manual-name
              defaultValue={wizard.manualEntry?.name ?? ""}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="manual-country">
              Country
            </label>
            <input
              id="manual-country"
              name="country"
              className="input"
              defaultValue={wizard.manualEntry?.country ?? ""}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="manual-methodology">
              Methodology
            </label>
            <input
              id="manual-methodology"
              name="methodology"
              className="input"
              defaultValue={wizard.manualEntry?.methodology ?? ""}
            />
          </div>
          <div className="row">
            <Button type="submit" variant="outline" data-manual-submit>
              Queue these details
            </Button>
          </div>
        </form>
      ) : null}
    </>
  );
}
