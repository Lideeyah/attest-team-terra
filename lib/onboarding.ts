import { cookies } from "next/headers";

/* The wizard's own state, held in a cookie so that going back keeps what was
   entered and so a reader who closes the tab and returns days later lands
   where they left off. Nothing here is a record: the record is created when
   the project is registered. */

export type DeveloperWizard = {
  step: "project" | "verify" | "commitment" | "account" | "live";
  registryId?: string;
  projectId?: string;
  commitmentPercentage?: number;
  commitmentOriginal?: number;
  correctionReason?: string;
  kyb?: "pending" | "approved" | "rejected";
  kybReason?: string;
};

export type InstitutionWizard = {
  step: "organisation" | "watchlist";
  organisation?: string;
  kind?: string;
  watching?: string[];
};

const DEVELOPER = "attest_onboarding_developer";
const INSTITUTION = "attest_onboarding_institution";
const A_FORTNIGHT = 60 * 60 * 24 * 14;

export const DEVELOPER_STEPS: { key: DeveloperWizard["step"]; label: string }[] = [
  { key: "project", label: "Project" },
  { key: "verify", label: "Verify" },
  { key: "commitment", label: "Commitment" },
  { key: "account", label: "Account" },
  { key: "live", label: "Live" },
];

export const INSTITUTION_STEPS: { key: InstitutionWizard["step"]; label: string }[] = [
  { key: "organisation", label: "Organisation" },
  { key: "watchlist", label: "Watchlist" },
];

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export async function readDeveloperWizard(): Promise<DeveloperWizard> {
  const store = await cookies();
  return parse<DeveloperWizard>(store.get(DEVELOPER)?.value, { step: "project" });
}

export async function writeDeveloperWizard(next: DeveloperWizard): Promise<void> {
  const store = await cookies();
  store.set(DEVELOPER, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: A_FORTNIGHT,
  });
}

export async function readInstitutionWizard(): Promise<InstitutionWizard> {
  const store = await cookies();
  return parse<InstitutionWizard>(store.get(INSTITUTION)?.value, { step: "organisation" });
}

export async function writeInstitutionWizard(next: InstitutionWizard): Promise<void> {
  const store = await cookies();
  store.set(INSTITUTION, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: A_FORTNIGHT,
  });
}
