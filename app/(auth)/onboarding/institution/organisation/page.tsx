import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Steps } from "@/components/auth/Steps";
import {
  INSTITUTION_STEPS,
  readInstitutionWizard,
  writeInstitutionWizard,
} from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "Your organisation",
  description: "Who you are and what you assess.",
};

const KINDS = [
  { value: "buyer", label: "We buy credits" },
  { value: "auditor", label: "We audit or verify projects" },
  { value: "registry", label: "We are a registry" },
  { value: "lender", label: "We lend or invest" },
];

async function saveOrganisation(formData: FormData) {
  "use server";
  const organisation = String(formData.get("organisation") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const wizard = await readInstitutionWizard();
  await writeInstitutionWizard({ ...wizard, organisation, kind });

  if (organisation.length === 0) {
    redirect("/onboarding/institution/organisation?state=empty");
  }
  await writeInstitutionWizard({ ...wizard, organisation, kind, step: "watchlist" });
  redirect("/onboarding/institution/watchlist");
}

export default async function OrganisationStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const search = await searchParams;
  const wizard = await readInstitutionWizard();

  return (
    <>
      <Steps
        steps={INSTITUTION_STEPS}
        current="organisation"
        hrefFor={(key) => `/onboarding/institution/${key}`}
      />
      <div className="stack">
        <p className="eyebrow">Step one</p>
        <h1 className="h2-display">Who is reading?</h1>
        <Rule weight="heavy" />
      </div>

      {search.state === "empty" ? (
        <Notice tone="flagged" title="Enter the organisation">
          It appears on anything you export from here.
        </Notice>
      ) : null}

      <form action={saveOrganisation} className="stack-lg">
        <div className="field">
          <label className="label" htmlFor="organisation">
            Organisation
          </label>
          <input
            id="organisation"
            name="organisation"
            className="input"
            defaultValue={wizard.organisation ?? ""}
          />
        </div>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label">What you do with the record</legend>
          <div className="stack">
            {KINDS.map((kind) => (
              <label className="punch-wrap" key={kind.value}>
                <input
                  type="radio"
                  className="radio"
                  name="kind"
                  value={kind.value}
                  defaultChecked={wizard.kind === kind.value}
                />
                <span>{kind.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </>
  );
}
