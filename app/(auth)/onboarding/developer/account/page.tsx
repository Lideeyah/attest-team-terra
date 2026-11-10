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
  title: "The account — Attest",
  description:
    "Identity checks on the organisation, and the account every payment will leave from.",
};

async function submitKyb(formData: FormData) {
  "use server";
  const registration = String(formData.get("registration") ?? "").trim();
  const wizard = await readDeveloperWizard();

  if (registration.length < 6) {
    redirect("/onboarding/developer/account?state=invalid");
  }

  const result = await api.project(wizard.projectId ?? "proj_ekuri");
  if (!result.ok) {
    redirect(`/onboarding/developer/account?state=error&code=${result.code}`);
  }

  await writeDeveloperWizard({ ...wizard, kyb: "pending" });
  redirect("/onboarding/developer/account?state=pending");
}

async function toLive() {
  "use server";
  const wizard = await readDeveloperWizard();
  await writeDeveloperWizard({ ...wizard, kyb: "approved", step: "live" });
  redirect("/onboarding/developer/live");
}

export default async function AccountStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string }>;
}) {
  await connection();
  const search = await searchParams;
  const wizard = await readDeveloperWizard();

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="account"
        hrefFor={(key) => `/onboarding/developer/${key}`}
      />
      <div className="stack">
        <p className="eyebrow">Step four</p>
        <h1 className="h2-display">Where the money leaves from</h1>
        <p className="lede">
          The bank verifies the organisation and opens the disbursement account.
          Every payment the register publishes will have left from it, which is
          what makes the record a settlement record rather than a claim.
        </p>
        <Rule weight="heavy" />
      </div>

      {search.code === "FORBIDDEN" ? (
        <Notice tone="blocked" title="This account does not have access to that record">
          Ask an administrator on your organisation to grant access, or sign in
          as the account that created the project.
        </Notice>
      ) : null}

      {search.state === "invalid" ? (
        <Notice tone="flagged" title="Enter the registration number">
          As it appears on the certificate of incorporation.
        </Notice>
      ) : null}

      {search.state === "pending" || wizard.kyb === "pending" ? (
        <>
          <Notice tone="review" title="Verification is with the bank">
            <span className="row">
              <Stamp state="review" label="KYB pending" recordId="kyb" />
            </span>
            Access Bank checks the organisation against the registration number
            given. It usually answers within one working day. Nothing is
            published while it is pending, and enrolment can begin before it
            clears.
          </Notice>
          <form action={toLive} className="row">
            <Button type="submit">Continue</Button>
          </form>
        </>
      ) : (
        <form action={submitKyb} className="stack-lg">
          <div className="field">
            <label className="label" htmlFor="registration">
              Company registration number
            </label>
            <input id="registration" name="registration" className="input" placeholder="RC 1043882" />
            <p className="field-note">As on the certificate of incorporation</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="account-name">
              Account name
            </label>
            <input
              id="account-name"
              name="accountName"
              className="input"
              placeholder="EKURI INITIATIVE LIMITED DISBURSEMENT"
            />
            <p className="field-note">
              This name appears on every transfer a household receives
            </p>
          </div>
          <div className="row">
            <Button type="submit">Send for verification</Button>
          </div>
        </form>
      )}
    </>
  );
}
