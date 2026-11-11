import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { api } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Create a developer account",
  description: "Email, password, organisation. Nothing else.",
};

type Search = { state?: string; code?: string; field?: string; email?: string };

async function signUp(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const organisation = String(formData.get("organisation") ?? "").trim();

  if (!email.includes("@") || organisation.length === 0) {
    redirect(`/signup/developer?state=invalid&field=${email.includes("@") ? "organisation" : "email"}`);
  }
  if (password.length < 12) {
    redirect("/signup/developer?state=weak-password");
  }

  const result = await api.signup({ email, password, organisation, role: "developer" });
  if (!result.ok) {
    redirect(
      `/signup/developer?state=error&code=${result.code}&email=${encodeURIComponent(email)}`,
    );
  }
  redirect(`/signup/developer?state=sent&email=${encodeURIComponent(email)}`);
}

export default async function DeveloperSignUpPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;

  if (search.state === "sent") {
    return (
      <div className="stack-lg">
        <p className="eyebrow">Verify your email</p>
        <h1 className="h2-display">Check {search.email}</h1>
        <p className="prose-muted">
          A verification link is on its way. It expires in twenty-four hours;
          if it lapses, sign in and a new one is sent. Nothing about the project
          is set up until the address is verified, because the register
          publishes who the operator is.
        </p>
        <Link href="/signin" className="btn-outline btn-sm">
          Go to sign in
        </Link>
      </div>
    );
  }

  const problem =
    search.state === "weak-password"
      ? {
          tone: "flagged" as const,
          title: "The password is too short",
          body: "Twelve characters or more. This account can close a period, and a closed period cannot be edited by anyone.",
        }
      : search.state === "invalid"
        ? {
            tone: "flagged" as const,
            title: search.field === "email" ? "That is not an email address" : "The organisation is missing",
            body:
              search.field === "email"
                ? "The address is where the verification link goes."
                : "The organisation's name appears on the public register beside every project it operates.",
          }
        : search.state === "error" && search.code === "DUPLICATE_REQUEST"
          ? {
              tone: "flagged" as const,
              title: "That address is already registered",
              body: "Sign in instead, or reset the password if it has been lost.",
            }
          : search.state === "error"
            ? {
                title: "The account was not created",
                body: "Nothing was saved. Try again.",
              }
            : undefined;

  return (
    <AuthForm
      eyebrow="Developer"
      title="Create an account"
      action={signUp}
      submit="Create the account"
      problem={problem}
      footer={
        <p className="prose-muted">
          Already have one? <Link href="/signin">Sign in</Link>.
        </p>
      }
    >
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={search.email}
        error={search.field === "email" ? "Enter the address the verification link should go to" : undefined}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        note="Twelve characters or more"
        error={search.state === "weak-password" ? "Twelve characters or more" : undefined}
      />
      <Field
        label="Organisation"
        name="organisation"
        note="As it should appear on the public register"
        error={search.field === "organisation" ? "The organisation's name is published" : undefined}
      />
    </AuthForm>
  );
}
