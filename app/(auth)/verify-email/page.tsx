import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { Submit } from "@/components/auth/Submit";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "The link from the verification email lands here.",
};

type Search = { token?: string; email?: string; state?: string };

async function resend(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) {
    redirect("/verify-email?state=no-address");
  }
  const result = await api.resendVerification({ email });
  if (!result.ok) {
    redirect(`/verify-email?state=error&email=${encodeURIComponent(email)}`);
  }
  redirect(`/verify-email?state=sent&email=${encodeURIComponent(email)}`);
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const search = await searchParams;
  const email = search.email ?? "";

  if (search.state === "sent") {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Verify your email</p>
        <h1 className="h2-display">A new link is on its way</h1>
        <Rule weight="heavy" />
        <p className="prose-muted" data-verification="sent">
          It went to {email} and lasts twenty-four hours. The one before it
          stopped working the moment this was sent.
        </p>
        <Link href="/signin" className="btn-outline btn-sm">
          Go to sign in
        </Link>
      </div>
    );
  }

  const token = search.token ?? "";
  const result = token.length > 0 ? await api.verifyEmail({ token }) : null;

  if (result && result.ok) {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Verify your email</p>
        <h1 className="h2-display">This address is verified</h1>
        <Rule weight="heavy" />
        <p className="row">
          <Stamp state="sealed" label="Verified" recordId={token} />
        </p>
        <p className="prose-muted" data-verification="complete">
          The register publishes who operates a project, which is why the
          address is verified before anything is set up under it.
        </p>
        <Link href="/signin" className="btn">
          Sign in
        </Link>
      </div>
    );
  }

  const expired = result !== null && !result.ok && result.code === "TOKEN_EXPIRED";

  return (
    <div className="stack-lg">
      <p className="eyebrow">Verify your email</p>
      <h1 className="h2-display">
        {expired ? "This link has expired" : "Send a verification link"}
      </h1>
      <Rule weight="heavy" />

      {result && !result.ok ? (
        <Notice
          tone={expired ? "flagged" : "blocked"}
          title={headingFor(result.code, "This link did not work")}
        >
          <p data-verification={expired ? "expired" : "invalid"}>
            {expired
              ? "A verification link lasts twenty-four hours. Ask for another below and the one in the old email stops working."
              : "The link does not match any address waiting to be verified. Ask for another below."}
          </p>
        </Notice>
      ) : null}

      {search.state === "no-address" ? (
        <Notice tone="flagged" title="Enter the address">
          The one the account was created with.
        </Notice>
      ) : null}

      <form action={resend} className="stack-lg">
        <div className="field">
          <label className="label" htmlFor="verify-email">
            Email
          </label>
          <input
            id="verify-email"
            name="email"
            type="email"
            className="input"
            defaultValue={email}
            data-resend-email
          />
        </div>
        <div className="row">
          <Submit label="Send a new link" pending="Sending" marker="data-resend-submit" />
        </div>
      </form>
    </div>
  );
}
