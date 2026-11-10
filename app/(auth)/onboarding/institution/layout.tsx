import type { ReactNode } from "react";

export default function InstitutionOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="wizard">{children}</div>;
}
