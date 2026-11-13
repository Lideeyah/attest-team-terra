import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { Submit } from "@/components/auth/Submit";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { LiveInvite } from "@/components/auth/LiveInvite";
import { headingFor } from "@/lib/copy/codes";
import type { ErrorCode } from "@/lib/api/contract";
import { formatDateTime } from "@/lib/record";

export const metadata: Metadata = {
  title: "Redeem an invitation",
  description:
    "Redeem a field agent invitation: verify who you are and bind the phone you will enrol households on.",
};

type Search = { state?: string; code?: string };

async function redeem(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "");
  const identity = String(formData.get("identity") ?? "").trim();
  const deviceKey = String(formData.get("deviceKey") ?? "").trim();

  if (identity.length < 11) {
    redirect(`/invite/${code}?state=invalid`);
  }

  const result = await api.redeemInvite(code, { identity, deviceKey: deviceKey || "pending" });
  if (!result.ok) {
    redirect(`/invite/${code}?state=error&code=${result.code}`);
  }
  /* Identity verification is a round trip to the identity service and does
     not always answer inside the request. The invitation is held open while
     it runs, and the device binds when it answers. */
  if (result.data.state !== "redeemed") {
    redirect(`/invite/${code}?state=identity-pending`);
  }
  redirect(`/invite/${code}?state=bound`);
}

async function bindDevice(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "");
  const deviceKey = String(formData.get("deviceKey") ?? "field-phone");
  const result = await api.bindDevice({ deviceKey });
  if (!result.ok) {
    redirect(`/invite/${code}?state=error&code=${result.code}`);
  }
  redirect(`/invite/${code}?state=bound`);
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Search>;
}) {
  await connection();
  const { code } = await params;
  if(process.env.ATTEST_API_MODE==='live')return <LiveInvite code={code}/>;
  const search = await searchParams;
  const result = await api.invite(code);

  if (!result.ok) {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Invitation</p>
        <h1 className="h2-display">This invitation cannot be redeemed</h1>
        <Rule weight="heavy" />
        <Notice
          tone="blocked"
          title={headingFor(result.code, "This invitation could not be read")}
        >
          {result.message} {result.remediation}
        </Notice>
      </div>
    );
  }

  const invite = result.data;

  if (search.state === "bound") {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Invitation redeemed</p>
        <h1 className="h2-display">This phone is bound to you</h1>
        <Rule weight="heavy" />
        <p className="prose-muted" data-invite-state="bound">
          Every enrolment you capture carries your name and this device. That is
          what makes an enrolment attributable, and it is why a household can be
          told who enrolled them.
        </p>
        <a className="btn" href="/field">
          Open the field app
        </a>
      </div>
    );
  }

  /* Identity verification is running. The invitation is not used up and the
     device is not bound until it answers. */
  if (search.state === "identity-pending") {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Invitation · {invite.projectName}</p>
        <h1 className="h2-display">Checking who you are</h1>
        <Rule weight="heavy" />
        <Notice tone="review" title="Identity verification is with the bank">
          <span className="row">
            <Stamp state="review" label="Verifying" recordId={invite.code} />
          </span>
          <p data-invite-state="identity-pending">
            The number given is being checked against the name the project
            invited. The invitation stays open while it distributions and is not used up
            by this. It usually answers in under a minute.
          </p>
        </Notice>
        <form action={bindDevice} className="row">
          <input type="hidden" name="code" value={invite.code} />
          <input type="hidden" name="deviceKey" value="field-phone" />
          <Submit label="Check again" pending="Checking" variant="outline" />
        </form>
      </div>
    );
  }

  if (invite.state !== "valid") {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Invitation · {invite.projectName}</p>
        <h1 className="h2-display">This invitation cannot be redeemed</h1>
        <Rule weight="heavy" />
        <Notice
          tone={invite.state === "revoked" ? "blocked" : "flagged"}
          title={
            invite.state === "expired"
              ? "The invitation has expired"
              : invite.state === "redeemed"
                ? "The invitation was already redeemed"
                : "The invitation was revoked"
          }
        >
          <p data-invite-state={invite.state}>
            {invite.state === "expired"
              ? `It lapsed on ${formatDateTime(invite.expiresAt)}. Ask the project to send another.`
              : invite.state === "redeemed"
                ? "It was used once, which is all an invitation is good for. Ask the project to send another if this was not you."
                : "The project withdrew it. They can send another."}
          </p>
        </Notice>
      </div>
    );
  }

  /* The prompt names IDENTITY_MISMATCH; the contract's code for the same
     refusal is BVN_MISMATCH, and both reach the same screen. */
  const mismatch =
    search.code === "BVN_MISMATCH" || search.code === "IDENTITY_MISMATCH";

  const problem =
    search.state === "invalid"
      ? {
          tone: "flagged" as const,
          title: "That identity number is too short",
          body: "Eleven digits, as printed on the document itself.",
        }
      : search.state === "error" && mismatch
        ? {
            tone: "blocked" as const,
            title: "That number does not match the identity given",
            body: "The project invited a named person. Check the number against the document, and if it is right, ask the project to correct the name on the invitation.",
          }
        : search.state === "error" && search.code === "IDENTITY_UNREACHABLE"
          ? {
              tone: "flagged" as const,
              title: headingFor("IDENTITY_UNREACHABLE", "Identity verification could not be reached"),
              body: "The invitation stays open. Try again shortly; nothing has been used up.",
            }
          : search.state === "error" && search.code === "DEVICE_UNBOUND"
            ? {
                tone: "flagged" as const,
                title: "This device is not bound yet",
                body: "The project administrator approves the binding. Until they do, the field app will not capture an enrolment.",
              }
            : search.state === "error" && search.code === "TOKEN_EXPIRED"
              ? {
                  tone: "flagged" as const,
                  title: headingFor("TOKEN_EXPIRED", "The invitation expired while this was open"),
                  body: "Ask the project to send another.",
                }
              : search.state === "error" && search.code === "FORBIDDEN"
                ? {
                    tone: "blocked" as const,
                    title: "This invitation was revoked",
                    body: "The project withdrew it. They can send another.",
                  }
                : search.state === "error" && search.code
                  ? {
                      tone: "blocked" as const,
                      title: headingFor(search.code as ErrorCode, "The invitation was not redeemed"),
                      body: "Nothing has been used up. Try again, or ask the project to send another.",
                    }
                  : undefined;

  return (
    <AuthForm
      eyebrow={`Invitation · ${invite.projectName}`}
      title={`Welcome, ${invite.agentName}`}
      lede="Two things before you can enrol anyone: that you are who the project named, and which phone you will do it on."
      action={redeem}
      submit="Verify and bind this phone"
      submitPending="Checking who you are"
      problem={problem}
      footer={
        <p className="eyebrow">
          <Stamp state="review" label="Valid" recordId={invite.code} /> Expires{" "}
          {formatDateTime(invite.expiresAt)}
        </p>
      }
    >
      <input type="hidden" name="code" value={invite.code} />
      <Field
        label="Bank verification number"
        name="identity"
        note="Eleven digits. It is checked against the name the project invited, and only its last four are kept."
      />
      <Field
        label="Device name"
        name="deviceKey"
        note="So the project can tell its agents' phones apart"
        placeholder="Field phone 2"
      />
    </AuthForm>
  );
}
