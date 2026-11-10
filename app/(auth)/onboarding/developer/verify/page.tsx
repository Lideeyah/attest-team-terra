import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button, ButtonLink } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Steps } from "@/components/auth/Steps";
import { api } from "@/lib/api/client";
import { DEVELOPER_STEPS, readDeveloperWizard, writeDeveloperWizard } from "@/lib/onboarding";
import { formatCount } from "@/lib/record";

export const metadata: Metadata = {
  title: "Verify the project — Attest",
  description: "The registry's own record, shown back for confirmation.",
};

async function confirmRecord() {
  "use server";
  const wizard = await readDeveloperWizard();
  await writeDeveloperWizard({ ...wizard, step: "commitment" });
  redirect("/onboarding/developer/commitment");
}

export default async function VerifyStep() {
  await connection();
  const wizard = await readDeveloperWizard();
  const result = await api.lookupProject({ registryId: wizard.registryId ?? "GS-10342" });

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="verify"
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

      {!result.ok ? (
        <Notice tone="blocked" title={result.code}>
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
