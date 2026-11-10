import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { formatTimestamp } from "@/lib/record";

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
  const search = await searchParams;
  const result = await api.invite(code);

  if (!result.ok) {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Invitation</p>
        <h1 className="h2-display">This invitation cannot be redeemed</h1>
        <Rule weight="heavy" />
        <Notice tone="blocked" title={result.code}>
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
        <p className="prose-muted">
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
          {invite.state === "expired"
            ? `It lapsed on ${formatTimestamp(invite.expiresAt)}. Ask the project to send another.`
            : invite.state === "redeemed"
              ? "It was used once, which is all an invitation is good for. Ask the project to send another if this was not you."
              : "The project withdrew it. They can send another."}
        </Notice>
      </div>
    );
  }

  const problem =
    search.state === "invalid"
      ? {
          tone: "flagged" as const,
          title: "That identity number is too short",
          body: "Eleven digits, as printed on the document itself.",
        }
      : search.state === "error" && search.code === "BVN_MISMATCH"
        ? {
            tone: "blocked" as const,
            title: "That number does not match the identity given",
            body: "The project invited a named person. Check the number against the document, and if it is right, ask the project to correct the name on the invitation.",
          }
        : search.state === "error" && search.code === "IDENTITY_UNREACHABLE"
          ? {
              tone: "flagged" as const,
              title: "Identity verification could not be reached",
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
                  title: "The invitation expired while this was open",
                  body: "Ask the project to send another.",
                }
              : search.state === "error" && search.code === "FORBIDDEN"
                ? {
                    tone: "blocked" as const,
                    title: "This invitation was revoked",
                    body: "The project withdrew it. They can send another.",
                  }
                : undefined;

  return (
    <AuthForm
      eyebrow={`Invitation · ${invite.projectName}`}
      title={`Welcome, ${invite.agentName}`}
      lede="Two things before you can enrol anyone: that you are who the project named, and which phone you will do it on."
      action={redeem}
      submit="Verify and bind this phone"
      problem={problem}
      footer={
        <p className="eyebrow">
          <Stamp state="review" label="Valid" recordId={invite.code} /> Expires{" "}
          {formatTimestamp(invite.expiresAt)}
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
