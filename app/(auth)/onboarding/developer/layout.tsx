import type { ReactNode } from "react";

export default function DeveloperOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="wizard">{children}</div>;
}
