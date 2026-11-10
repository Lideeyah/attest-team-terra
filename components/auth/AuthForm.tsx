import type { ReactNode } from "react";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Submit } from "@/components/auth/Submit";

/* The sign-up and sign-in surfaces are deliberately clean: the mark, the
   fields and nothing else. No marketing copy, no feature list, no social
   proof. */
export function AuthForm({
  eyebrow,
  title,
  lede,
  action,
  children,
  submit,
  submitPending,
  footer,
  problem,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  submit: string;
  /** What the button says while the request is in flight. */
  submitPending?: string;
  footer?: ReactNode;
  problem?: { tone?: "flagged" | "blocked"; title: string; body: string };
}) {
  return (
    <div className="stack-lg">
      <div className="stack">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h2-display">{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        <Rule weight="heavy" />
      </div>

      {problem ? (
        <Notice tone={problem.tone ?? "blocked"} title={problem.title}>
          {problem.body}
        </Notice>
      ) : null}

      <form action={action} className="stack-lg">
        {children}
        <div className="row">
          <Submit label={submit} pending={submitPending ?? "Checking"} />
        </div>
      </form>

      {footer}
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  note,
  error,
  defaultValue,
  placeholder,
  autoComplete,
  attribute,
}: {
  label: string;
  name: string;
  type?: string;
  note?: string;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  attribute?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className="input"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : undefined}
        {...(attribute ? { [attribute]: "" } : {})}
      />
      {error ? (
        <p className="field-error">{error}</p>
      ) : note ? (
        <p className="field-note">{note}</p>
      ) : null}
    </div>
  );
}
