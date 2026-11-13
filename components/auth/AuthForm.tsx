import {PasswordInput} from "./PasswordInput";
import type { ReactNode } from "react";
import { Notice } from "@/components/Notice";
import { formCopy } from "@/lib/copy/forms";
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
  const Control = type==='password'?PasswordInput:'input';
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {formCopy(label).label}<span className="field-requirement" aria-hidden="true">Required</span>
      </label>
      <Control
        id={id}
        name={name}
        type={type}
        className="input"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        aria-label={formCopy(label).label}
        aria-describedby={`${id}-help`}
        aria-invalid={error ? "true" : undefined}
        {...(attribute ? { [attribute]: "" } : {})}
      />
      {error ? (
        <p id={`${id}-help`} className="field-error">{error}</p>
      ) : note ? (
        <p id={`${id}-help`} className="field-note">{note}</p>
      ) : <p id={`${id}-help`} className="field-note">{formCopy(label).help}</p>}
    </div>
  );
}
