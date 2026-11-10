import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { Submit } from "@/components/auth/Submit";
import { Steps } from "@/components/auth/Steps";
import { api, newIdempotencyKey } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import type { Commitment } from "@/lib/api/contract";
import {
  DEVELOPER_STEPS,
  advanceDeveloperWizard,
  readDeveloperWizard,
  writeDeveloperWizard,
  type CommitmentCorrection,
} from "@/lib/onboarding";
import { formatDateTime } from "@/lib/record";

export const metadata: Metadata = {
  title: "The commitment",
  description:
    "The commitment extracted from the project design document, shown with the sentence it came from.",
};

/* The four fields the extraction produces, each correctable, each correction
   kept beside the figure it replaced. */
const FIELDS: {
  key: CommitmentCorrection["field"];
  label: string;
  note: string;
  options?: { value: string; label: string }[];
}[] = [
  {
    key: "percentage",
    label: "Share of revenue",
    note: "A share between one and one hundred. This is the denominator of everything the register publishes about the project.",
  },
  {
    key: "basis",
    label: "Basis",
    note: "Whether the share is of revenue before costs or after them. The difference is usually the largest number on this page.",
    options: [
      { value: "net", label: "Net revenue" },
      { value: "gross", label: "Gross revenue" },
    ],
  },
  {
    key: "cadence",
    label: "Cadence",
    note: "How often the commitment falls due.",
    options: [
      { value: "quarterly", label: "Quarterly" },
      { value: "annual", label: "Annual" },
      { value: "staged", label: "Staged against verification" },
    ],
  },
  {
    key: "beneficiary",
    label: "Who it is owed to",
    note: "As the document describes them.",
  },
];

function currentValue(
  field: CommitmentCorrection["field"],
  extracted: Commitment,
  corrections: CommitmentCorrection[],
): string {
  const latest = [...corrections].reverse().find((entry) => entry.field === field);
  return latest ? latest.to : String(extracted[field]);
}

async function uploadPdd(formData: FormData) {
  "use server";
  const file = formData.get("pdd");
  const wizard = await readDeveloperWizard();

  if (!(file instanceof File) || file.size === 0) {
    redirect("/onboarding/developer/commitment?state=no-file");
  }
  if (!/\.pdf$/i.test(file.name)) {
    redirect("/onboarding/developer/commitment?state=not-a-pdf");
  }

  const result = await api.uploadPdd(wizard.projectId ?? "proj_ekuri", newIdempotencyKey());
  if (!result.ok) {
    redirect(`/onboarding/developer/commitment?state=error&code=${result.code}`);
  }

  await writeDeveloperWizard({
    ...wizard,
    pdd: {
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      jobId: result.data.jobId,
    },
  });
  redirect("/onboarding/developer/commitment?state=extracted");
}

async function correct(formData: FormData) {
  "use server";
  const field = String(formData.get("field") ?? "percentage") as CommitmentCorrection["field"];
  const value = String(formData.get("value") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const wizard = await readDeveloperWizard();

  if (value.length === 0) {
    redirect(`/onboarding/developer/commitment?state=invalid&field=${field}`);
  }
  if (field === "percentage") {
    const percentage = Number(value);
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      redirect("/onboarding/developer/commitment?state=invalid&field=percentage");
    }
  }
  if (reason.length < 12) {
    redirect(`/onboarding/developer/commitment?state=no-reason&field=${field}`);
  }

  const extraction = await api.extraction(wizard.projectId ?? "proj_ekuri");
  if (!extraction.ok) {
    redirect(`/onboarding/developer/commitment?state=error&code=${extraction.code}`);
  }

  const corrections = wizard.corrections ?? [];
  const from = currentValue(field, extraction.data.commitment, corrections);

  const result = await api.correctCommitment(wizard.projectId ?? "proj_ekuri", {
    field,
    value: field === "percentage" ? Number(value) : value,
    reason,
  });
  if (!result.ok) {
    redirect(`/onboarding/developer/commitment?state=error&code=${result.code}`);
  }

  /* The correction is kept in the wizard rather than in the URL, so it is
     still there after a reload, and still there a week later. */
  await writeDeveloperWizard({
    ...wizard,
    corrections: [
      ...corrections,
      { field, from, to: value, reason, at: new Date().toISOString() },
    ],
    ...(field === "percentage" ? { commitmentPercentage: Number(value) } : {}),
  });
  redirect("/onboarding/developer/commitment?state=corrected");
}

async function accept() {
  "use server";
  const wizard = await readDeveloperWizard();
  await advanceDeveloperWizard(wizard, "commitment");
  redirect("/onboarding/developer/account");
}

export default async function CommitmentStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string; field?: string }>;
}) {
  await connection();
  const search = await searchParams;
  const wizard = await readDeveloperWizard();
  const extraction = await api.extraction(wizard.projectId ?? "proj_ekuri");
  const corrections = wizard.corrections ?? [];
  const lowConfidence =
    search.code === "EXTRACTION_LOW_CONFIDENCE" ||
    (extraction.ok && extraction.data.confidence < 0.8);

  const problem =
    search.code === "PDD_UNREADABLE"
      ? {
          tone: "blocked" as const,
          title: headingFor("PDD_UNREADABLE", "The document could not be read"),
          body: "Upload a text-based PDF rather than a scan, under 40MB. A scan has no text in it to find a commitment in.",
        }
      : search.code === "PDD_NO_COMMITMENT"
        ? {
            tone: "blocked" as const,
            title: headingFor("PDD_NO_COMMITMENT", "No benefit-sharing commitment was found in it"),
            body: "Upload the document that carries the commitment, or enter it by hand with the sentence and page it comes from.",
          }
        : search.code === "EXTRACTION_LOW_CONFIDENCE"
          ? {
              tone: "flagged" as const,
              title: headingFor("EXTRACTION_LOW_CONFIDENCE", "The extraction is below the confidence threshold"),
              body: "Every field below is marked as low confidence. Check each against the quoted sentence and correct what is wrong; the original stays on the record either way.",
            }
          : search.code === "MODEL_UNAVAILABLE"
            ? {
                tone: "flagged" as const,
                title: headingFor("MODEL_UNAVAILABLE", "The extraction service did not answer"),
                body: "The document is queued and extraction runs when the service answers. Nothing was lost.",
              }
            : search.state === "no-file"
              ? {
                  tone: "flagged" as const,
                  title: "Choose the document first",
                  body: "The project design document, as the registry holds it.",
                }
              : search.state === "not-a-pdf"
                ? {
                    tone: "flagged" as const,
                    title: "That is not a PDF",
                    body: "The project design document as a text-based PDF. A photograph of a page has no text in it to find a commitment in.",
                  }
                : search.state === "invalid"
                  ? {
                      tone: "flagged" as const,
                      title: "That is not a value for this field",
                      body: "A share of revenue is a number between one and one hundred; the other fields are what the document says.",
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
        reached={wizard.reached}
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

      {/* The document itself. Extraction reads this; nothing on the step is
          an extraction of anything until one is uploaded. */}
      <form action={uploadPdd} className="stack-lg" data-pdd-form>
        <h2 className="h3-display">The project design document</h2>
        {wizard.pdd ? (
          <p className="note" data-pdd-uploaded={wizard.pdd.filename}>
            {wizard.pdd.filename}, uploaded {formatDateTime(wizard.pdd.uploadedAt)}.
            Extraction job {wizard.pdd.jobId}. Upload another to replace it.
          </p>
        ) : (
          <p className="note">
            A text-based PDF, under 40MB. The commitment below is read out of
            it, and the sentence it came from is quoted beside the figure.
          </p>
        )}
        <div className="field">
          <label className="label" htmlFor="pdd">
            The document
          </label>
          <input
            id="pdd"
            name="pdd"
            type="file"
            accept="application/pdf,.pdf"
            className="input"
            data-pdd-input
          />
        </div>
        <div className="row">
          <Submit label="Upload and extract" pending="Reading the document" variant="outline" />
        </div>
      </form>

      {corrections.length > 0 ? (
        <Notice title={`${corrections.length} corrections are logged`} tone="flagged">
          <ul className="stack-tight" data-corrections={corrections.length}>
            {corrections.map((correction) => (
              <li key={correction.at} className="note">
                <strong>{correction.field}</strong> originally read{" "}
                <span className="record-cell">{correction.from}</span> and now
                reads <span className="record-cell">{correction.to}</span>.
                Corrected {formatDateTime(correction.at)}. The reason kept with
                it: {correction.reason}
              </li>
            ))}
          </ul>
          <p className="note">
            The original extraction stays on the record whatever it is corrected
            to, and the public register shows both.
          </p>
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
            {FIELDS.map((field) => {
              const corrected = corrections.some((entry) => entry.field === field.key);
              const value = currentValue(field.key, extraction.data.commitment, corrections);
              return (
                <div className="definition-row" key={field.key} data-field={field.key}>
                  <span className="eyebrow">{field.label}</span>
                  <span className="record-cell">
                    {field.key === "percentage" ? `${value}%` : value}
                    {corrected ? (
                      <>
                        {" "}
                        <Stamp state="flagged" label="Corrected" recordId={`commitment-${field.key}`} />
                      </>
                    ) : lowConfidence ? (
                      <>
                        {" "}
                        <Stamp
                          state="review"
                          label="Low confidence"
                          recordId={`confidence-${field.key}`}
                        />
                      </>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>

          <form action={correct} className="stack-lg">
            <h2 className="h3-display">Correct a field</h2>
            <div className="field">
              <label className="label" htmlFor="correction-field">
                Which field
              </label>
              <select
                id="correction-field"
                name="field"
                className="select"
                data-correction-field
                defaultValue={search.field ?? "percentage"}
              >
                {FIELDS.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              <p className="field-note">
                Every field the extraction produced is correctable, and each
                correction keeps the figure it replaced.
              </p>
            </div>
            <div className="field">
              <label className="label" htmlFor="commitment-percentage">
                The corrected value
              </label>
              <input
                id="commitment-percentage"
                name="value"
                className="input"
                data-commitment-percentage
                defaultValue={currentValue(
                  (search.field as CommitmentCorrection["field"]) ?? "percentage",
                  extraction.data.commitment,
                  corrections,
                )}
              />
              <p className="field-note">
                For the basis, &ldquo;net&rdquo; or &ldquo;gross&rdquo;; for the
                cadence, &ldquo;quarterly&rdquo;, &ldquo;annual&rdquo; or
                &ldquo;staged&rdquo;.
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
                defaultValue=""
                placeholder="Which sentence on which page the extraction misread"
              />
            </div>
            <div className="row">
              <Submit
                label="Log the correction"
                pending="Logging"
                variant="outline"
                marker="data-correction-submit"
              />
            </div>
          </form>

          <form action={accept} className="row">
            <Button type="submit">This is the commitment</Button>
          </form>
        </>
      ) : (
        <Notice tone="blocked" title={headingFor(extraction.code, "The extraction could not be read")}>
          {extraction.message} {extraction.remediation}
        </Notice>
      )}
    </>
  );
}
