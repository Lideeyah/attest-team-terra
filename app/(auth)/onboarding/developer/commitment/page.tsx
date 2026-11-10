import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { Steps } from "@/components/auth/Steps";
import { api } from "@/lib/api/client";
import { DEVELOPER_STEPS, readDeveloperWizard, writeDeveloperWizard } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "The commitment — Attest",
  description:
    "The commitment extracted from the project design document, shown with the sentence it came from.",
};

async function correct(formData: FormData) {
  "use server";
  const percentage = Number(formData.get("percentage") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  const wizard = await readDeveloperWizard();

  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    redirect("/onboarding/developer/commitment?state=invalid");
  }
  if (reason.length < 12) {
    redirect("/onboarding/developer/commitment?state=no-reason");
  }

  const result = await api.correctCommitment(wizard.projectId ?? "proj_ekuri", {
    field: "percentage",
    value: percentage,
    reason,
  });
  if (!result.ok) {
    redirect(`/onboarding/developer/commitment?state=error&code=${result.code}`);
  }

  await writeDeveloperWizard({
    ...wizard,
    commitmentPercentage: percentage,
    commitmentOriginal: wizard.commitmentOriginal ?? result.data.percentage,
    correctionReason: reason,
  });
  redirect("/onboarding/developer/commitment?state=corrected");
}

async function accept() {
  "use server";
  const wizard = await readDeveloperWizard();
  await writeDeveloperWizard({ ...wizard, step: "account" });
  redirect("/onboarding/developer/account");
}

export default async function CommitmentStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string }>;
}) {
  await connection();
  const search = await searchParams;
  const wizard = await readDeveloperWizard();
  const extraction = await api.extraction(wizard.projectId ?? "proj_ekuri");

  const problem =
    search.code === "PDD_UNREADABLE"
      ? {
          tone: "blocked" as const,
          title: "The document could not be read",
          body: "Upload a text-based PDF rather than a scan, under 40MB. A scan has no text in it to find a commitment in.",
        }
      : search.code === "PDD_NO_COMMITMENT"
        ? {
            tone: "blocked" as const,
            title: "No benefit-sharing commitment was found in it",
            body: "Upload the document that carries the commitment, or enter it by hand with the sentence and page it comes from.",
          }
        : search.code === "EXTRACTION_LOW_CONFIDENCE"
          ? {
              tone: "flagged" as const,
              title: "The extraction is below the confidence threshold",
              body: "Every field below is pre-filled and marked. Check each against the quoted sentence and correct what is wrong; the original stays on the record either way.",
            }
          : search.code === "MODEL_UNAVAILABLE"
            ? {
                tone: "flagged" as const,
                title: "The extraction service did not answer",
                body: "The document is queued and extraction runs when the service answers. Nothing was lost.",
              }
            : search.state === "invalid"
              ? {
                  tone: "flagged" as const,
                  title: "That is not a percentage",
                  body: "A share of revenue between one and one hundred.",
                }
              : search.state === "no-reason"
                ? {
                    tone: "flagged" as const,
                    title: "A correction needs its reason",
                    body: "The reason is kept beside the original extraction, so anyone reading the record later can see what was changed and why.",
                  }
                : undefined;

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="commitment"
        hrefFor={(key) => `/onboarding/developer/${key}`}
      />
      <div className="stack">
        <p className="eyebrow">Step three</p>
        <h1 className="h2-display">What did you commit to?</h1>
        <p className="lede">
          Read from your own project design document. This is the denominator of
          everything the register will publish about this project, so it is
          worth reading twice.
        </p>
        <Rule weight="heavy" />
      </div>

      {problem ? (
        <Notice tone={problem.tone} title={problem.title}>
          {problem.body}
        </Notice>
      ) : null}

      {search.state === "corrected" && wizard.correctionReason ? (
        <Notice title="The correction is logged">
          It originally read {wizard.commitmentOriginal}% — sixty percent as
          extracted — and now reads {wizard.commitmentPercentage}%. Your reason
          is kept with it: {wizard.correctionReason}
        </Notice>
      ) : null}

      {extraction.ok ? (
        <>
          <div className="document stack">
            <p className="quotation">{extraction.data.sourceQuote}</p>
            <p className="eyebrow">
              Project design document, page {extraction.data.page} · extraction
              confidence {Math.round(extraction.data.confidence * 100)}%
            </p>
          </div>

          <div className="definition">
            <div className="definition-row">
              <span className="eyebrow">Share of revenue</span>
              <span className="record-cell">
                {wizard.commitmentPercentage ?? extraction.data.commitment.percentage}%
                {wizard.commitmentPercentage ? (
                  <>
                    {" "}
                    <Stamp state="flagged" label="Corrected" recordId="commitment" />
                  </>
                ) : null}
              </span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Basis</span>
              <span className="record-cell">
                {extraction.data.commitment.basis === "net" ? "Net revenue" : "Gross revenue"}
              </span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Cadence</span>
              <span className="record-cell">{extraction.data.commitment.cadence}</span>
            </div>
            <div className="definition-row">
              <span className="eyebrow">Who it is owed to</span>
              <span className="record-cell">{extraction.data.commitment.beneficiary}</span>
            </div>
          </div>

          <form action={correct} className="stack-lg">
            <h2 className="h3-display">Correct a field</h2>
            <div className="field">
              <label className="label" htmlFor="commitment-percentage">
                Share of revenue
              </label>
              <input
                id="commitment-percentage"
                name="percentage"
                className="input"
                inputMode="numeric"
                data-commitment-percentage
                defaultValue={String(
                  wizard.commitmentPercentage ?? extraction.data.commitment.percentage,
                )}
              />
              <p className="field-note">
                The original extraction is kept whatever this is changed to
              </p>
            </div>
            <div className="field">
              <label className="label" htmlFor="correction-reason">
                Why it is being changed
              </label>
              <textarea
                id="correction-reason"
                name="reason"
                className="textarea"
                data-correction-reason
                placeholder="Which sentence on which page the extraction misread"
              />
            </div>
            <div className="row">
              <Button type="submit" variant="outline" data-correction-submit>
                Log the correction
              </Button>
            </div>
          </form>

          <form action={accept} className="row">
            <Button type="submit">This is the commitment</Button>
          </form>
        </>
      ) : (
        <Notice tone="blocked" title={extraction.code}>
          {extraction.message} {extraction.remediation}
        </Notice>
      )}
    </>
  );
}
