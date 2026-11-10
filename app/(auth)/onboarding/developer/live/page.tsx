import type { Metadata } from "next";
import { connection } from "next/server";
import { ButtonLink } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Steps } from "@/components/auth/Steps";
import { DEVELOPER_STEPS, readDeveloperWizard } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "Live",
  description: "The project's public page as it now looks, at zero.",
};

/* This is not a confirmation screen. It is the project's real public register
   page, rendered as the public will see it, at zero enrolled and zero paid.
   Starting there sets the terms of the whole relationship. */
export default async function LiveStep() {
  await connection();
  const wizard = await readDeveloperWizard();
  /* The project the wizard created. The fallback is only for a reader who
     reaches this step with no wizard at all. */
  const projectId = wizard.projectId ?? "proj_oban";
  const projectName = wizard.projectName ?? null;

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="live"
        reached={wizard.reached}
        hrefFor={(key) => `/onboarding/developer/${key}`}
      />
      <div className="stack">
        <p className="eyebrow">Step five</p>
        <h1 className="h2-display">This is your page</h1>
        <p className="lede" data-project={projectId}>
          {projectName ? `${projectName} is public from now on.` : "It is public from now on."} Right now it says 0 of 0 households paid,
          because that is true. Every figure on it is computed from transfers
          that clear the bank; none of them can be typed in, by you or by us.
        </p>
        <Rule weight="heavy" />
      </div>

      <Notice title="0 of 0 households paid">
        Nothing is hidden while a project is new. A project that enrols two
        thousand households and pays four hundred publishes that too.
      </Notice>

      <div data-public-page>
        <iframe
          className="public-frame"
          src={`/register/${projectId}`}
          title="Your project's public register page"
          loading="lazy"
        />
      </div>

      <div className="row">
        <ButtonLink href="/app">Open the console</ButtonLink>
        <ButtonLink href={`/register/${projectId}`} variant="outline" small>
          Open the page itself
        </ButtonLink>
      </div>
    </>
  );
}
