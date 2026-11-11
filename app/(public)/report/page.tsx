import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicMasthead } from "@/components/public/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { api } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Report a problem",
  description:
    "Tell Attest that a payment did not arrive, arrived short, or that a household was left off the register. No account needed.",
};

/* Three plain-language categories. The words are the household's, not the
   product's: somebody reading this has not been paid and is not here to learn
   a vocabulary. */
const CATEGORIES = [
  {
    value: "not-received",
    title: "I was told I would be paid and nothing arrived",
    body: "The payment notice came by SMS, or the notice board listed the household, and no money reached the account.",
  },
  {
    value: "wrong-amount",
    title: "Money arrived, but less than I was told",
    body: "Something was paid and the amount does not match what the notice said.",
  },
  {
    value: process.env.ATTEST_API_MODE==='live'?"someone-else-collected":"not-enrolled",
    title: process.env.ATTEST_API_MODE==='live'?"Someone else collected the payment":"A household was left off the register",
    body: process.env.ATTEST_API_MODE==='live'?"The payment appears to have gone to someone other than the intended recipient.":"Somebody who lives and works here was not enrolled, so they were never on the list to be paid.",
  },
];

async function fileReport(formData: FormData) {
  "use server";
  const category = String(formData.get("category") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const voice = formData.get("voiceNote");

  if (!CATEGORIES.some((option) => option.value === category)) {
    redirect("/report?state=invalid");
  }
  if (!projectId) {
    redirect("/report?state=no-project");
  }

  /* A voice note is the point of the option: somebody who cannot write the
     claim records it, and it is submitted with the claim rather than
     collected and dropped. */
  const voiceNote =
    voice instanceof File && voice.size > 0
      ? `${voice.name} (${Math.round(voice.size / 1024)}KB)`
      : undefined;

  const result = await api.fileDispute(
    { projectId, category, body: body || undefined, voiceNote },
    `report-${Date.now()}`,
  );

  if (!result.ok) {
    redirect(`/report?state=error&code=${result.code}`);
  }
  redirect(`/report?state=submitted&id=${result.data.id}`);
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string; id?: string }>;
}) {
  const search = await searchParams;
  const register = await api.register({ per_page: 100 });
  const projects = register.ok ? register.data : [];

  if (search.state === "submitted") {
    return (
      <>
        <PublicMasthead context="Report a problem" />
        <div className="measure section-tight stack-lg">
          <div className="stack">
            <p className="eyebrow">Report filed · {search.id}</p>
            <h1 className="h2-display">It has been recorded</h1>
            <Rule weight="heavy" />
          </div>
          <Notice title="What happens now">
            The claim is checked against the transfers recorded for that period:
            whether one was sent, whether it settled, and what the bank&rsquo;s
            own reference says. A reply goes to the number this was raised from
            within five working days. The developer sees the claim and can
            respond, and their response is logged; a dispute closes on a
            participant confirmation or a reversal, never on the
            developer&rsquo;s word.
          </Notice>
          <a className="btn-outline btn-sm" href="/report">
            File another report
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicMasthead context="Report a problem" />
      <div className="measure section-tight stack-lg">
        <div className="stack">
          <p className="eyebrow">Report</p>
          <h1 className="h2-display">Tell us a payment did not arrive</h1>
          <p className="lede">
            Anyone can file this. No account, no login. What you write is
            checked against the transfers the bank recorded for that period.
          </p>
          <Rule weight="heavy" />
        </div>

        {search.state === "invalid" ? (
          <Notice tone="flagged" title="Choose what happened">
            One of the three below has to be selected so the claim can be
            checked against the right record.
          </Notice>
        ) : null}

        {search.state === "no-project" ? (
          <Notice tone="flagged" title="Choose the project">
            A claim is checked against one project&rsquo;s own transfers, so it has
            to say which project it is about.
          </Notice>
        ) : null}

        {search.state === "error" ? (
          <Notice
            tone={search.code === "RATE_LIMITED" ? "flagged" : "blocked"}
            title={
              search.code === "RATE_LIMITED"
                ? "Too many reports from this address"
                : search.code === "NOT_FOUND"
                  ? "No record at this address"
                  : "The report was not filed"
            }
          >
            {search.code === "RATE_LIMITED"
              ? "Wait sixty seconds and file it again. Nothing was lost."
              : search.code === "NOT_FOUND"
                ? "That project is not on the register, so there is no period to check a claim against."
                : "Nothing was filed. Try again, and if it fails a second time the project's own office can take the claim."}
          </Notice>
        ) : null}

        <form action={fileReport} className="stack-lg" style={{ maxWidth: "var(--measure-reading)" }}>
          <div className="field">
            <label className="label" htmlFor="report-project">
              Which project
            </label>
            <select id="report-project" name="projectId" className="select" defaultValue="">
              <option value="" disabled>
                Choose the project
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="field-note">
              The one that said it would pay you. If you are not sure, choose the
              closest and say so below.
            </p>
          </div>
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label">What happened</legend>
            <div className="grid-ruled">
              {CATEGORIES.map((option) => (
                <label className="pick" key={option.value}>
                  <input type="radio" className="radio" name="category" value={option.value} />
                  <span className="stack">
                    <span className="pick-title">{option.title}</span>
                    <span className="pick-body">{option.body}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label className="label" htmlFor="report-body">
              Anything else worth saying
            </label>
            <textarea
              id="report-body"
              name="body"
              className="textarea"
              placeholder="When you were told you would be paid, and what happened"
            />
            <p className="field-note">Optional</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="report-voice">
              Or record it instead of writing it
            </label>
            <input
              id="report-voice"
              name="voiceNote"
              type="file"
              accept="audio/*"
              disabled={process.env.ATTEST_API_MODE==='live'}
              className="input"
            />
            <p className="field-note">{process.env.ATTEST_API_MODE==='live'?'Voice evidence requires your scoped payment receipt link. Use that link to attach MP3, Ogg or WAV audio.':'Optional · a voice note in any language'}</p>
          </div>

          <div className="row">
            <Button type="submit">File the report</Button>
          </div>
        </form>
      </div>
      <PublicFooter />
    </>
  );
}
