import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button, ButtonLink } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Steps } from "@/components/auth/Steps";
import { api } from "@/lib/api/client";
import {
  DEVELOPER_STEPS,
  advanceDeveloperWizard,
  readDeveloperWizard,
} from "@/lib/onboarding";
import { formatCount } from "@/lib/record";
import { headingFor } from "@/lib/copy/codes";
import type { ErrorCode } from "@/lib/api/contract";

export const metadata: Metadata = {
  title: "Verify the project",
  description: "The registry's own record, shown back for confirmation.",
};

async function confirmRecord() {
  "use server";
  const wizard = await readDeveloperWizard();

  /* Confirming the registry's record is what creates the project, and its id
     is what every later step reads: the commitment is corrected against it and
     step five frames its real public page. Without this the wizard has no
     project and the last step shows somebody else's. */
  const lookup = await api.lookupProject({ registryId: wizard.registryId ?? "GS-10342" });
  if (!lookup.ok) {
    redirect(`/onboarding/developer/verify?state=error&code=${lookup.code}`);
  }
  const created = await api.createProject({ registryRecord: lookup.data });
  if (!created.ok) {
    redirect(`/onboarding/developer/verify?state=error&code=${created.code}`);
  }

  await advanceDeveloperWizard(wizard, "verify", {
    projectId: created.data.id,
    projectName: created.data.name,
  });
  redirect("/onboarding/developer/commitment");
}

export default async function VerifyStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string }>;
}) {
  await connection();
  const search = await searchParams;
  const wizard = await readDeveloperWizard();
  const result = await api.lookupProject({ registryId: wizard.registryId ?? "GS-10342" });

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="verify"
        reached={wizard.reached}
        hrefFor={(key) => `/onboarding/developer/${key}`}
      />
      <div className="stack">
        <p className="eyebrow">Step two</p>
        <h1 className="h2-display">Is this the right project?</h1>
        <p className="lede">
          This is the registry&rsquo;s own record, not ours. If any of it is
          wrong, it is wrong at the registry and has to be corrected there.
        </p>
        <Rule weight="heavy" />
      </div>

      {search.state === "error" && search.code ? (
        <Notice
          tone="blocked"
          title={headingFor(search.code as ErrorCode, "The project was not created")}
        >
          Nothing was saved. The registry record above is unchanged, so
          confirming it again is safe.
        </Notice>
      ) : null}

      {!result.ok ? (
        <Notice tone="blocked" title={headingFor(result.code, "The registry record could not be read")}>
          {result.message} {result.remediation}
        </Notice>
      ) : (
        <>
          <div className="definition">
            <div className="definition-row">
              <span className="eyebrow">Name</span>
              <span className="record-cell">{result.data.name}</span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Registry</span>
              <span className="record-cell">
                {result.data.registry} {result.data.registryId}
              </span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Country</span>
              <span className="record-cell">{result.data.country}</span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Methodology</span>
              <span className="record-cell">{result.data.methodology}</span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Boundary</span>
              <span className="record-cell">{result.data.boundaryName}</span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Issuances</span>
              <span className="record-cell">
                {result.data.issuances
                  .map(
                    (issuance) =>
                      `${issuance.vintage}: ${formatCount(issuance.credits)} issued, ${formatCount(issuance.retired)} retired`,
                  )
                  .join(" · ")}
              </span>
            </div>
          </div>

          <form action={confirmRecord} className="row">
            <Button type="submit">Yes, this is the project</Button>
            <ButtonLink href="/onboarding/developer/project" variant="quiet" small>
              No, change the identifier
            </ButtonLink>
          </form>
        </>
      )}
    </>
  );
}
