import { api } from "@/lib/api/client";
import { ACTION_COPY } from "@/lib/copy/console";
import type { Dispute, Participant, PeriodSummary, Project, Run } from "@/lib/api/contract";
import { formatDate, formatNaira } from "@/lib/record";

/* What every console screen needs before it can say anything: which project
   the session is on, which period is open, and what is outstanding. The rail
   carries the counts and the home screen carries the actions, and both read
   this rather than counting twice. */

export type ConsoleContext = {
  project: Project;
  openPeriod: PeriodSummary | null;
  lastClosedPeriod: PeriodSummary | null;
  runs: Run[];
  openRun: Run | null;
  disputes: Dispute[];
  flagged: number;
  enrolled: number;
  outstanding: Record<string, { count: number; label?: string; blocking?: boolean }>;
  period: { label: string; daysToClose: number; closesOn: string; state: "open" | "closed" };
  actions: ConsoleAction[];
};

export type ConsoleAction = {
  id: string;
  line: string;
  href: string;
  /** Blocking work takes the mark; the rest is outstanding but not blocking. */
  blocking: boolean;
};

/** The close date a quarterly period ends on. The period label is its own
    source of truth, so nothing here is entered by hand. */
export function periodCloses(period: string): string {
  const match = /^(\d{4})-Q([1-4])$/.exec(period);
  if (!match) {
    return period;
  }
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const endMonth = quarter * 3; /* 3, 6, 9, 12 */
  const lastDay = new Date(Date.UTC(year, endMonth, 0));
  return lastDay.toISOString();
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** The fixture's clock. Every figure in the product is read against the same
    moment, so a screenshot taken twice says the same thing. */
export const NOW = "2026-11-10T09:00:00Z";

export async function consoleContext(): Promise<ConsoleContext | { error: string; code: string }> {
  const session = await api.session();
  if (!session.ok) {
    return { error: session.message, code: session.code };
  }
  const projectId = session.data.projectId;
  if (projectId === null) {
    return {
      error:
        "This account is not on a project yet. The console opens once a project is created.",
      code: "NOT_FOUND",
    };
  }
  const [projectResult, runsResult, disputesResult, rosterResult] = await Promise.all([
    api.project(projectId),
    api.runs(projectId),
    api.disputes(projectId, { per_page: 100 }),
    api.participants(projectId, { flagged: "true", per_page: 1 }),
  ]);
  /* The roster's own total is the denominator of coverage, so it is read from
     the roster rather than from a figure on the project. */
  const rosterResultAll = await api.participants(projectId, { per_page: 1 });
  if (!projectResult.ok) {
    return { error: projectResult.message, code: projectResult.code };
  }

  const project = projectResult.data;
  const runs = runsResult.ok ? runsResult.data : [];
  const disputes = disputesResult.ok ? disputesResult.data : [];
  const flagged = rosterResult.ok ? (rosterResult.meta?.total ?? 0) : 0;
  const rosterTotal = rosterResultAll.ok
    ? (rosterResultAll.meta?.total ?? 0)
    : project.enrolled;

  const openPeriod = project.periods.find((period) => period.state === "open") ?? null;
  const closed = project.periods.filter((period) => period.state !== "open");
  const lastClosedPeriod = closed.length > 0 ? closed[closed.length - 1] : null;
  const openRun =
    runs.find((run) => run.state === "executing" || run.state === "preflight-running") ?? null;

  const closesOn = openPeriod ? periodCloses(openPeriod.period) : null;
  const daysToClose = closesOn ? daysBetween(NOW, closesOn) : 0;

  const openDisputes = disputes.filter(
    (dispute) => dispute.state === "open" || dispute.state === "developer-responded",
  ).length;
  const failures = runs
    .filter((run) => run.state === "partially-complete" || run.state === "executing")
    .flatMap((run) => run.failures)
    .reduce((sum, failure) => sum + failure.count, 0);
  const shortfall = openPeriod?.shortfall ?? "0.00";
  const hasShortfall = Number(shortfall) > 0;

  const actions: ConsoleAction[] = [];
  if (hasShortfall) {
    actions.push({
      id: "funding",
      line: ACTION_COPY.funding(formatNaira(shortfall)),
      href: "/app/funding",
      blocking: true,
    });
  }
  if (failures > 0) {
    actions.push({
      id: "failures",
      line: ACTION_COPY.failures(failures),
      href: openRun ? `/app/runs/${openRun.id}` : "/app/runs",
      blocking: true,
    });
  }
  if (flagged > 0) {
    actions.push({
      id: "flags",
      line: ACTION_COPY.flags(flagged),
      href: "/app/roster?status=flagged",
      blocking: false,
    });
  }
  if (openDisputes > 0) {
    actions.push({
      id: "disputes",
      line: ACTION_COPY.disputes(openDisputes),
      href: "/app/disputes",
      blocking: false,
    });
  }
  if (openPeriod && daysToClose <= 7) {
    actions.push({
      id: "closing",
      line: ACTION_COPY.closing(daysToClose),
      href: "/app/attestations",
      blocking: false,
    });
  }

  return {
    project,
    openPeriod,
    lastClosedPeriod,
    runs,
    openRun,
    disputes,
    flagged,
    enrolled: rosterTotal,
    outstanding: {
      "/app/roster": flagged > 0 ? { count: flagged, label: "flagged" } : { count: 0 },
      "/app/runs": failures > 0 ? { count: failures, label: "failed", blocking: true } : { count: 0 },
      "/app/funding": hasShortfall ? { count: 1, label: "short", blocking: true } : { count: 0 },
      "/app/disputes": openDisputes > 0 ? { count: openDisputes, label: "open" } : { count: 0 },
    },
    period: {
      label: openPeriod?.period ?? lastClosedPeriod?.period ?? "—",
      daysToClose,
      closesOn: closesOn ? formatDate(closesOn) : "—",
      state: openPeriod ? "open" : "closed",
    },
    actions,
  };
}

/** The flags a roster row carries, for the filter rail. */
export function flagsOf(participant: Participant): string[] {
  return participant.flags;
}
