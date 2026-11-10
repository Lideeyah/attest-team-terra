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
  writeDeveloperWizard,
} from "@/lib/onboarding";
import { formatCount, formatDateTime } from "@/lib/record";
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
  const lookup = await api.lookupProject({ registryId: wizard.registryId ?? "PV-2314" });
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

/* The boundary, where the registry does not expose one. Plan Vivo supplies
   KML files for project areas on request rather than through an API, so the
   file is uploaded here and parsed server-side; enrolments are validated
   against the parsed geometry from then on. */
async function uploadBoundary(formData: FormData) {
  "use server";
  const file = formData.get("kml");
  const wizard = await readDeveloperWizard();
  if (!(file instanceof File) || file.size === 0) {
    redirect("/onboarding/developer/verify?state=boundary-empty");
  }
  const parsed = await api.parseBoundary(
    { kml: await file.text(), name: file.name },
    `boundary:${wizard.registryId ?? "PV-2314"}:${file.name}:${file.size}`,
  );
  if (!parsed.ok) {
    redirect(`/onboarding/developer/verify?state=boundary-error&code=${parsed.code}`);
  }
  await writeDeveloperWizard({
    ...wizard,
    boundary: { ...parsed.data, uploadedAt: new Date().toISOString() },
  });
  redirect("/onboarding/developer/verify?state=boundary-parsed");
}

export default async function VerifyStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string }>;
}) {
  await connection();
  const search = await searchParams;
  const wizard = await readDeveloperWizard();
  const result = await api.lookupProject({ registryId: wizard.registryId ?? "PV-2314" });

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
              <span className="record-cell">
                {result.data.boundaryName ??
                  (wizard.boundary
                    ? `${wizard.boundary.name} — ${formatCount(wizard.boundary.points)} boundary points, about ${formatCount(wizard.boundary.areaHectares)} hectares, uploaded ${formatDateTime(wizard.boundary.uploadedAt)}`
                    : headingFor("BOUNDARY_NOT_AVAILABLE", "Not published by the registry"))}
              </span>
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

          {result.data.boundaryName === null && !wizard.boundary ? (
            <div className="stack-tight" data-boundary-upload>
              <Rule />
              <p className="note">
                Plan Vivo does not expose project boundaries through an API:
                the KML file for the project area is requested from Plan Vivo
                directly. Upload it here. It is parsed into the project record
                on upload, and every enrolment is then checked against it — a
                capture outside the boundary is flagged, not refused.
              </p>
              <form action={uploadBoundary} className="row">
                <input
                  type="file"
                  name="kml"
                  accept=".kml,application/vnd.google-earth.kml+xml"
                  className="input"
                  aria-label="The project's KML boundary file"
                  data-boundary-file
                />
                <Button type="submit" variant="outline" data-boundary-submit>
                  Parse the boundary
                </Button>
              </form>
            </div>
          ) : null}

          {search.state === "boundary-empty" ? (
            <Notice tone="flagged" title="Choose the KML file first">
              Nothing was uploaded. The file is the one Plan Vivo supplied for
              the project area.
            </Notice>
          ) : null}
          {search.state === "boundary-error" && search.code ? (
            <Notice
              tone="blocked"
              title={headingFor(search.code as ErrorCode, "The boundary could not be parsed")}
            >
              Nothing was saved. The file has to be the KML Plan Vivo supplied,
              with the project area&rsquo;s coordinates in it.
            </Notice>
          ) : null}
          {search.state === "boundary-parsed" && wizard.boundary ? (
            <Notice title="The boundary is on the record">
              <p data-boundary-parsed>
                {formatCount(wizard.boundary.points)} boundary points, about{" "}
                {formatCount(wizard.boundary.areaHectares)} hectares. Enrolments
                are validated against this geometry from here on.
              </p>
            </Notice>
          ) : null}

          <form action={confirmRecord} className="row">
            <Button type="submit" data-confirm-project>
              Yes, this is the project
            </Button>
            <ButtonLink href="/onboarding/developer/project" variant="quiet" small>
              No, change the identifier
            </ButtonLink>
          </form>
        </>
      )}
    </>
  );
}
