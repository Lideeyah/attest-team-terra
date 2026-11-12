import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { api } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Reset a password",
  description: "Ask for a reset link, or set a new password with one.",
};

type Search = { delivery?:string;state?: string; code?: string; token?: string; email?: string };

async function requestReset(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const result = await api.requestReset({ email });
  redirect(
    result.ok
      ? `/signin/reset?state=requested&email=${encodeURIComponent(email)}&delivery=${result.data.delivery??"queued"}`
      : `/signin/reset?state=error&code=${result.code}`,
  );
}

async function confirmReset(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 12) {
    redirect(`/signin/reset?state=weak-password&token=${encodeURIComponent(token)}`);
  }
  const result = await api.confirmReset({ token, password });
  redirect(
    result.ok
      ? "/signin/reset?state=reset"
      : `/signin/reset?state=error&code=${result.code}`,
  );
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;

  if (search.state === "requested") {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Reset requested</p>
        <h1 className="h2-display">Check {search.email}</h1>
        <p className="prose-muted">
          {search.delivery==='unavailable'?'Email delivery is not available yet. Contact your administrator for help resetting your password. For privacy, we do not confirm whether this address has an account.':'If that address has an account, a password-reset email has been requested. Its link expires in one hour. If no email arrives, contact your administrator.'}
        </p>
        <Link href="/signin" className="btn-outline btn-sm">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (search.state === "reset") {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Password reset</p>
        <h1 className="h2-display">That is set</h1>
        <p className="prose-muted">
          Every other session has been signed out. Sign in with the new
          password.
        </p>
        <Link href="/signin" className="btn-outline btn-sm">
          Sign in
        </Link>
      </div>
    );
  }

  if (search.token) {
    return (
      <AuthForm
        eyebrow="Reset"
        title="Set a new password"
        action={confirmReset}
        submit="Set the password"
        problem={
          search.state === "weak-password"
            ? {
                tone: "flagged",
                title: "The password is too short",
                body: "Twelve characters or more.",
              }
            : search.state === "error" && search.code === "TOKEN_EXPIRED"
              ? {
                  tone: "flagged",
                  title: "This reset link has expired",
                  body: "Links last one hour. Ask for another below.",
                }
              : undefined
        }
      >
        <input type="hidden" name="token" value={search.token} />
        <Field label="New password" name="password" type="password" note="Twelve characters or more" />
      </AuthForm>
    );
  }

  return (
    <AuthForm
      eyebrow="Reset"
      title="Reset a password"
      action={requestReset}
      submit="Send a reset link"
      problem={
        search.state === "error"
          ? {
              tone: "flagged",
              title: "The link was not sent",
              body: "Nothing was changed. Try again in a moment.",
            }
          : undefined
      }
      footer={
        <p className="prose-muted">
          <Link href="/signin">Back to sign in</Link>
        </p>
      }
    >
      <Field label="Email" name="email" type="email" autoComplete="email" />
    </AuthForm>
  );
}
