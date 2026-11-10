import type { Metadata } from "next";
import Link from "next/link";
import { Rule } from "@/components/Rule";

export const metadata: Metadata = {
  title: "Get started — Attest",
  description:
    "Three paths: run a carbon project, assess or buy from one, or redeem a field agent invitation.",
};

/* The choice is consequential, so it gets a full screen rather than a
   dropdown. Bank operations and platform admin are provisioned, never
   self-served, and do not appear here. Households never sign up at all. */
const PATHS = [
  {
    role: "developer",
    href: "/signup/developer",
    title: "I run a carbon project",
    body: "Register the project against its registry record, enrol households, fund a period and close it.",
  },
  {
    role: "institution",
    href: "/signup/institution",
    title: "I assess or buy from carbon projects",
    body: "Follow projects, read their periods, and verify a record against its hash or a transfer against its proof.",
  },
  {
    role: "agent",
    href: "/invite/inv_7KQ2M4",
    title: "I was invited",
    body: "Redeem the code a project sent you, verify who you are, and bind the phone you will enrol households on.",
  },
];

export default function GetStartedPage() {
  return (
    <div className="stack-lg">
      <div className="stack">
        <p className="eyebrow">Get started</p>
        <h1 className="h2-display">Which of these are you?</h1>
        <Rule weight="heavy" />
      </div>

      <div className="grid-ruled">
        {PATHS.map((path) => (
          <Link
            key={path.role}
            href={path.href}
            className="pick"
            data-role={path.role}
            style={{ textDecoration: "none" }}
          >
            <span className="radio" aria-hidden="true" />
            <span className="stack">
              <span className="pick-title">{path.title}</span>
              <span className="pick-body">{path.body}</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="prose-muted">
        Households do not sign up. A household is enrolled by a named field
        agent and reaches its own record by SMS, by USSD, or through the link on
        its payment notice. Nobody has to own a smartphone to be paid or to see
        that they were.
      </p>
    </div>
  );
}
