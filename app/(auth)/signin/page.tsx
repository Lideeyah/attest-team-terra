import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { Submit } from "@/components/auth/Submit";
import { Notice } from "@/components/Notice";
import { api } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the developer console or the verifier portal.",
};

type Search = { state?: string; code?: string; next?: string; email?: string };

async function resendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const result = await api.signin({ email, password });
  if (!result.ok) {
    redirect(`/signin?state=error&code=${result.code}&email=${encodeURIComponent(email)}`);
  }
  if (!result.data.emailVerified) {
    redirect(`/signin?state=unverified&email=${encodeURIComponent(email)}`);
  }
  redirect(next || "/app");
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;

  const problem =
    search.state === "error" && search.code === "FORBIDDEN"
        ? {
            tone: "blocked" as const,
            title: "This account is locked",
            body: "Five failed attempts locks an account for thirty minutes. Reset the password to open it sooner.",
          }
        : search.state === "error"
          ? {
              tone: "blocked" as const,
              title: "That email and password do not match",
              body: "Check both. Which one is wrong is not stated, because stating it would tell anyone whether an address has an account here.",
            }
          : search.state === "expired"
            ? {
                tone: "flagged" as const,
                title: "The session ended while you were working",
                body: "Nothing you had entered was submitted. Sign in and you return to where you were.",
              }
            : undefined;

  /* Unverified is not a refusal: the account exists and the address is what
     is outstanding, so the screen offers the link rather than asserting one
     was sent. */
  const unverified = search.state === "unverified";

  return (
    <AuthForm
      eyebrow="Sign in"
      title="Sign in"
      action={signIn}
      submit="Sign in"
      problem={problem}
      footer={
        <>
          {unverified ? (
            <Notice tone="flagged" title="This address has not been verified">
              <p data-signin-state="unverified">
                Nothing is set up under an address until it is verified, because
                the register publishes who operates a project.
              </p>
              <form action={resendLink} className="row">
                <input type="hidden" name="email" value={search.email ?? ""} />
                <Submit
                  label="Send a new verification link"
                  pending="Sending"
                  variant="outline"
                  marker="data-resend"
                />
              </form>
            </Notice>
          ) : null}
          <p className="prose-muted">
            <Link href="/signin/reset">Reset a password</Link> ·{" "}
            <Link href="/get-started">Create an account</Link>
          </p>
        </>
      }
    >
      <input type="hidden" name="next" value={search.next ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={search.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
    </AuthForm>
  );
}
