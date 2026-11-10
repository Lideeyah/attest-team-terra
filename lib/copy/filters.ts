import type { Agent } from "@/lib/api/contract";

/* The roster's filters. Every column the strip row shows is filterable, so
   the options live in one module and the labels are the ones the record uses
   rather than the enum's own spelling. */

export const STATUS_FILTERS = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "flagged", label: "Flagged" },
  { value: "excluded", label: "Excluded from the current run" },
  { value: "disputed", label: "Disputed" },
  { value: "duplicate-blocked", label: "Duplicate blocked" },
  { value: "removed", label: "Removed" },
] as const;

export const TIER_FILTERS = [
  { value: "", label: "Any tier" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "3", label: "Tier 3" },
] as const;

export const WALLET_FILTERS = [
  { value: "", label: "Any wallet" },
  { value: "active", label: "Active" },
  { value: "dormant", label: "Dormant" },
  { value: "restricted", label: "Restricted" },
  { value: "unopened", label: "Unopened" },
] as const;

export function AGENT_FILTERS(agents: Agent[]): { value: string; label: string }[] {
  return [
    { value: "", label: "Any agent" },
    ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
  ];
}
