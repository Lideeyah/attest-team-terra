import type { ReactNode } from "react";
import { Suspense } from "react";
import { Resumed } from "@/components/auth/Resumed";

export default function DeveloperOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="wizard">
      <Suspense fallback={null}>
        <Resumed />
      </Suspense>
      {children}
    </div>
  );
}
