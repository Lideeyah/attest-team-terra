import type { ReactNode } from "react";
import { Suspense } from "react";
import { Resumed } from "@/components/auth/Resumed";
import { LiveOnboarding } from "@/components/auth/LiveOnboarding";
import {requireRole} from '@/lib/api/access';

export default async function DeveloperOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(['developer_admin','developer_operator']);
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
