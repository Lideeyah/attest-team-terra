import type { ReactNode } from "react";
import {requireRole} from '@/lib/api/access';

export default async function InstitutionOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(['verifier']);
  return <div className="wizard">{children}</div>;
}
