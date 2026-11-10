import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { Submit } from "@/components/auth/Submit";
import { Steps } from "@/components/auth/Steps";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import type { ErrorCode } from "@/lib/api/contract";
import {
  DEVELOPER_STEPS,
  advanceDeveloperWizard,
  readDeveloperWizard,
  writeDeveloperWizard,
} from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "The account",
  description:
    "Identity checks on the organisation, and the account every payment will leave from.",
};

/* The bank's own refusals on a business verification. They are not contract
   codes — the contract does not carry KYB — so they are states of the wizard,
   each with the reason and what to do about it. */
const REJECTIONS: Record<string, { reason: string; forward: string }> = {
  name: {
    reason:
      "The registration number resolves to a different company name than the one on the account.",
    forward:
      "Correct the account name to the name on the certificate of incorporation, or give the registration number of the company that holds the account.",
  },
  dissolved: {
    reason: "The company is not active at the corporate registry.",
    forward:
      "A dissolved or struck-off company cannot hold a disbursement account. Restore the company at the registry, or register the project under the entity that is active.",
  },
  documents: {
    reason: "The directors' identity documents did not pass verification.",
    forward:
      "The bank asks for each director's identity document again. Enrolment can continue while this is outstanding; no payment can be made until it clears.",
  },
};

async function submitKyb(formData: FormData) {
  "use server";
  const registration = String(formData.get("registration") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const wizard = await readDeveloperWizard();

  /* What was entered is kept before anything is checked, so a refusal does
     not empty the fields the reader has to correct. */
  await writeDeveloperWizard({ ...wizard, registration, accountName });

  if (registration.length < 6) {
    redirect("/onboarding/developer/account?state=invalid&field=registration");
  }
  if (accountName.length === 0) {
    redirect("/onboarding/developer/account?state=invalid&field=accountName");
  }

  const result = await api.project(wizard.projectId ?? "proj_ekuri");
  if (!result.ok) {
    redirect(`/onboarding/developer/account?state=error&code=${result.code}`);
  }

  await writeDeveloperWizard({
    ...wizard,
    registration,
    accountName,
    kyb: "pending",
  });
  redirect("/onboarding/developer/account?state=pending");
}

async function toLive() {
  "use server";
  const wizard = await readDeveloperWizard();
  await advanceDeveloperWizard(wizard, "account", { kyb: "approved" });
  redirect("/onboarding/developer/live");
}

/* The bank refused. The wizard holds which refusal it was, so returning to
   the step days later still says what happened and what to do. */
async function recordRejection(formData: FormData) {
  "use server";
  const reason = String(formData.get("reason") ?? "name");
  const wizard = await readDeveloperWizard();
  await writeDeveloperWizard({ ...wizard, kyb: "rejected", kybReason: reason });
  redirect("/onboarding/developer/account?state=rejected");
}

export default async function AccountStep({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; code?: string; field?: string }>;
}) {
  await connection();
  const search = await searchParams;
  const wizard = await readDeveloperWizard();
  const rejected = wizard.kyb === "rejected" || search.state === "rejected";
  const rejection = REJECTIONS[wizard.kybReason ?? "name"] ?? REJECTIONS.name;
  const pending = !rejected && (search.state === "pending" || wizard.kyb === "pending");

  return (
    <>
      <Steps
        steps={DEVELOPER_STEPS}
        current="account"
        reached={wizard.reached}
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

      {search.code ? (
        <Notice
          tone="blocked"
          title={headingFor(search.code as ErrorCode, "The verification was not sent")}
        >
          Ask an administrator on your organisation to grant access, or sign in
          as the account that created the project.
        </Notice>
      ) : null}

      {search.state === "invalid" ? (
        <Notice
          tone="flagged"
          title={
            search.field === "accountName"
              ? "Enter the account name"
              : "Enter the registration number"
          }
        >
          {search.field === "accountName"
            ? "This name appears on every transfer a household receives, so it is the name they will look for."
            : "As it appears on the certificate of incorporation."}
        </Notice>
      ) : null}

      {rejected ? (
        <>
          <Notice tone="blocked" title="The bank refused the verification">
            <span className="row">
              <Stamp state="blocked" label="KYB rejected" recordId="kyb" />
            </span>
            <p data-kyb="rejected">{rejection.reason}</p>
            <p className="note">{rejection.forward}</p>
          </Notice>
          <form action={submitKyb} className="stack-lg">
            <div className="field">
              <label className="label" htmlFor="registration">
                Company registration number
              </label>
              <input
                id="registration"
                name="registration"
                className="input"
                data-registration
                defaultValue={wizard.registration ?? ""}
                placeholder="RC 1043882"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="account-name">
                Account name
              </label>
              <input
                id="account-name"
                name="accountName"
                className="input"
                data-account-name
                defaultValue={wizard.accountName ?? ""}
              />
            </div>
            <div className="row">
              <Submit label="Send it again" pending="Sending to the bank" />
            </div>
          </form>
        </>
      ) : pending ? (
        <>
          <Notice tone="review" title="Verification is with the bank">
            <span className="row">
              <Stamp state="review" label="KYB pending" recordId="kyb" />
            </span>
            <p data-kyb="pending">
              Access Bank checks the organisation against the registration
              number given. It usually answers within one working day. Nothing
              is published while it is pending, and enrolment can begin before
              it clears.
            </p>
          </Notice>
          <form action={toLive} className="row">
            <Button type="submit">Continue</Button>
          </form>
          {/* The bank's answer arrives on its own; this is how the refusal is
              reached from the state panel while there is no bank to refuse. */}
          <form action={recordRejection} className="row" data-kyb-reject>
            <input type="hidden" name="reason" value="name" />
            <Button type="submit" variant="quiet" small>
              The bank refused this verification
            </Button>
          </form>
        </>
      ) : (
        <form action={submitKyb} className="stack-lg">
          <div className="field">
            <label className="label" htmlFor="registration">
              Company registration number
            </label>
            <input
              id="registration"
              name="registration"
              className="input"
              data-registration
              defaultValue={wizard.registration ?? ""}
              placeholder="RC 1043882"
            />
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
              data-account-name
              defaultValue={wizard.accountName ?? ""}
              placeholder="EKURI INITIATIVE LIMITED DISBURSEMENT"
            />
            <p className="field-note">
              This name appears on every transfer a household receives
            </p>
          </div>
          <div className="row">
            <Submit label="Send for verification" pending="Sending to the bank" />
          </div>
        </form>
      )}
    </>
  );
}
