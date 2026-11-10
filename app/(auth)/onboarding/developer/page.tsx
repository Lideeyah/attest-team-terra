import { redirect } from "next/navigation";
import { readDeveloperWizard } from "@/lib/onboarding";

/* Resuming is the default. Somebody who closed the tab a week ago lands on
   the furthest step they reached, not at the beginning and not on a step they
   happened to look back at before they closed it. */
export default async function DeveloperOnboardingEntry() {
  const wizard = await readDeveloperWizard();
  redirect(`/onboarding/developer/${wizard.reached}?state=resumed`);
}
