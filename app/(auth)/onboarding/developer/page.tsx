import { redirect } from "next/navigation";
import { readDeveloperWizard } from "@/lib/onboarding";

/* Resuming is the default. Somebody who closed the tab a week ago lands on the
   step they left, not at the beginning. */
export default async function DeveloperOnboardingEntry() {
  const wizard = await readDeveloperWizard();
  redirect(`/onboarding/developer/${wizard.step}`);
}
