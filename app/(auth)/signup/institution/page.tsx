import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm, Field } from "@/components/auth/AuthForm";
import { api } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Create an institution account",
  description: "Email, password, organisation. Nothing else.",
};

type Search = { state?: string; code?: string; field?: string; email?: string };

async function signUp(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const organisation = String(formData.get("organisation") ?? "").trim();

  if (!email.includes("@") || organisation.length === 0) {
    redirect(`/signup/institution?state=invalid&field=${email.includes("@") ? "organisation" : "email"}`);
  }
  if (password.length < 12) {
    redirect("/signup/institution?state=weak-password");
  }

  const result = await api.signup({ email, password, organisation, role: "institution" });
  if (!result.ok) {
    redirect(
      `/signup/institution?state=error&code=${result.code}&email=${encodeURIComponent(email)}`,
    );
  }
  redirect(`/signin?state=created&email=${encodeURIComponent(email)}`);
}

export default async function InstitutionSignUpPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  if(process.env.ATTEST_API_MODE==='live')return <section className="auth-frame"><div className="auth-column stack"><h1 className="h2-display">Institution access</h1><p>Verifier accounts must be provisioned by the platform. Public signup creates developer accounts only.</p><Link className="btn" href="/signin">Sign in with an existing institution account</Link></div></section>;

  if(search.state==='sent') redirect('/signin?state=created');

  const problem =
    search.state === "weak-password"
      ? {
          tone: "flagged" as const,
          title: "The password is too short",
          body: "Twelve characters or more.",
        }
      : search.state === "invalid"
        ? {
            tone: "flagged" as const,
            title: search.field === "email" ? "That is not an email address" : "The organisation is missing",
            body:
              search.field === "email"
                ? "The address is where the verification link goes."
                : "The organisation's name is used on exports and on anything you publish from here.",
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
      eyebrow="Institution"
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
        note="Your institution, as it should appear on an export"
        error={search.field === "organisation" ? "The organisation's name is required" : undefined}
      />
    </AuthForm>
  );
}
