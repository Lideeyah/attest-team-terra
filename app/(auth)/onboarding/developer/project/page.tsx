import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Steps } from "@/components/auth/Steps";
import { api } from "@/lib/api/client";
import { DEVELOPER_STEPS, readDeveloperWizard, writeDeveloperWizard } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "The project — Attest",
  description: "Start with the registry identifier of the project itself.",
};

async function lookUp(formData: FormData) {
  "use server";
  const registryId = String(formData.get("registryId") ?? "").trim();
  const wizard = await readDeveloperWizard();
  await writeDeveloperWizard({ ...wizard, registryId });

  if (registryId.length === 0) {
    redirect("/onboarding/developer/project?state=empty");
  }

  const result = await api.lookupProject({ registryId });
  if (!result.ok) {
    redirect(`/onboarding/developer/project?state=error&code=${result.code}`);
  }

  await writeDeveloperWizard({ ...wizard, registryId, step: "verify" });
  redirect("/onboarding/developer/verify");
}

export default async function ProjectStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string }>;
}) {
  const search = await searchParams;
  const wizard = await readDeveloperWizard();

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="project"
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
        <Notice tone="blocked" title="No project with that identifier">
          The registry does not hold one under that identifier. Check it against
          the registry&rsquo;s own project page; a project that is not listed
          there cannot be registered here.
        </Notice>
      ) : null}

      {search.code === "REGISTRY_UNREACHABLE" ? (
        <Notice tone="flagged" title="The registry did not answer">
          Enter the project&rsquo;s details by hand and they are queued for
          review by Attest before the project goes on the register. Nothing is
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
          <Button type="submit">Find the project</Button>
        </div>
      </form>
    </>
  );
}
