import { cookies } from "next/headers";

/* The wizard's own state, held in a cookie so that going back keeps what was
   entered and so a reader who closes the tab and returns days later lands
   where they left off. Nothing here is a record: the record is created when
   the project is registered.

   `step` is where the reader is. `reached` is the furthest step they have
   completed, and it never moves backwards: looking at step one again does not
   discard four steps of work, and the step indicator keeps linking forward. */

export type DeveloperStep = "project" | "verify" | "commitment" | "account" | "live";

export type CommitmentCorrection = {
  field: "percentage" | "basis" | "cadence" | "beneficiary";
  from: string;
  to: string;
  reason: string;
  at: string;
};

export type DeveloperWizard = {
  step: DeveloperStep;
  /** The furthest step completed. Never moves backwards. */
  reached: DeveloperStep;
  registryId?: string;
  projectId?: string;
  projectName?: string;
  /** A registry that did not answer: the details entered by hand, queued for
      review before anything is published. */
  manualEntry?: {
    name: string;
    country: string;
    methodology: string;
    queuedAt: string;
  };
  /** The project boundary, where the registry does not expose one and the
      KML file was uploaded and parsed instead. */
  boundary?: {
    name: string;
    points: number;
    areaHectares: number;
    uploadedAt: string;
  };
  /** The project design document, once one has been uploaded. */
  pdd?: { filename: string; uploadedAt: string; jobId: string };
  /** Every correction made to the extracted commitment, with the figure it
      replaced and the reason. The originals stay here, so reloading the step
      or returning to it days later still shows what was changed and why. */
  corrections?: CommitmentCorrection[];
  commitmentPercentage?: number;
  registration?: string;
  accountName?: string;
  kyb?: "pending" | "approved" | "rejected";
  kybReason?: string;
};

export type InstitutionWizard = {
  step: "organisation" | "watchlist";
  reached: "organisation" | "watchlist";
  organisation?: string;
  kind?: string;
  watching?: string[];
};

const DEVELOPER = "attest_onboarding_developer";
const INSTITUTION = "attest_onboarding_institution";
const A_FORTNIGHT = 60 * 60 * 24 * 14;

export const DEVELOPER_STEPS: { key: DeveloperStep; label: string }[] = [
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

function position(step: DeveloperStep): number {
  return DEVELOPER_STEPS.findIndex((candidate) => candidate.key === step);
}

/** The furthest of two steps. Progress is never given back. */
export function furthest(left: DeveloperStep, right: DeveloperStep): DeveloperStep {
  return position(left) >= position(right) ? left : right;
}

export async function readDeveloperWizard(): Promise<DeveloperWizard> {
  const store = await cookies();
  const wizard = parse<DeveloperWizard>(store.get(DEVELOPER)?.value, {
    step: "project",
    reached: "project",
  });
  /* A cookie written before `reached` existed carries only `step`. */
  return { ...wizard, reached: furthest(wizard.reached ?? "project", wizard.step) };
}

export async function writeDeveloperWizard(next: DeveloperWizard): Promise<void> {
  const store = await cookies();
  const shaped: DeveloperWizard = {
    ...next,
    reached: furthest(next.reached ?? "project", next.step),
  };
  store.set(DEVELOPER, JSON.stringify(shaped), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: A_FORTNIGHT,
  });
}

/** Completing a step: the reader moves to the next one and the furthest step
    reached moves with them, never back. */
export async function advanceDeveloperWizard(
  wizard: DeveloperWizard,
  completed: DeveloperStep,
  changes: Partial<DeveloperWizard> = {},
): Promise<DeveloperStep> {
  const index = position(completed);
  const next = DEVELOPER_STEPS[Math.min(index + 1, DEVELOPER_STEPS.length - 1)].key;
  await writeDeveloperWizard({
    ...wizard,
    ...changes,
    step: next,
    reached: furthest(furthest(wizard.reached, next), completed),
  });
  return next;
}

export async function readInstitutionWizard(): Promise<InstitutionWizard> {
  const store = await cookies();
  const wizard = parse<InstitutionWizard>(store.get(INSTITUTION)?.value, {
    step: "organisation",
    reached: "organisation",
  });
  return {
    ...wizard,
    reached:
      wizard.reached === "watchlist" || wizard.step === "watchlist"
        ? "watchlist"
        : "organisation",
  };
}

export async function writeInstitutionWizard(next: InstitutionWizard): Promise<void> {
  const store = await cookies();
  const shaped: InstitutionWizard = {
    ...next,
    reached:
      next.reached === "watchlist" || next.step === "watchlist"
        ? "watchlist"
        : "organisation",
  };
  store.set(INSTITUTION, JSON.stringify(shaped), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: A_FORTNIGHT,
  });
}
