import type { ReactNode } from "react";
import { Suspense } from "react";
import { Resumed } from "@/components/auth/Resumed";
import { LiveOnboarding } from "@/components/auth/LiveOnboarding";

export default function DeveloperOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  if(process.env.ATTEST_API_MODE === "live") return <LiveOnboarding/>;
  return (
    <div className="wizard">
      <Suspense fallback={null}>
        <Resumed />
      </Suspense>
      {children}
    </div>
  );
}
