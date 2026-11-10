import { redirect } from "next/navigation";
import { readInstitutionWizard } from "@/lib/onboarding";

export default async function InstitutionOnboardingEntry() {
  const wizard = await readInstitutionWizard();
  redirect(`/onboarding/institution/${wizard.step}`);
}
