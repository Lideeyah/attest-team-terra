import { forceCode, setProjectStatus, setRegisterSize, setRosterSize } from "./devControl";

/* Every state each public screen lists, with what has to be arranged for it
   and the screen it is on. The exit checklists say a state is reachable from
   /dev/states; this is what makes that true by clicking rather than by
   editing a fixture. */

type State = { label: string; href: string; arrange: () => Promise<void> };

const clear = async () => {
  await forceCode(null, null, false);
  await setRegisterSize(null);
  await setProjectStatus("proj_ekuri", null);
  await setRosterSize("proj_ekuri", null);
};

export const STATE_INDEX: { path: string; states: State[] }[] = [
  {
    path: "/register",
    states: [
      { label: "Populated", href: "/register", arrange: clear },
      {
        label: "Search returns nothing",
        href: "/register?q=zzzz",
        arrange: clear,
      },
      {
        label: "Filter returns nothing",
        href: "/register?country=Kenya",
        arrange: clear,
      },
      { label: "Sorted by coverage", href: "/register?sort=coverage", arrange: clear },
      { label: "Paginated", href: "/register?per_page=20&page=2", arrange: async () => { await clear(); await setRegisterSize(500); } },
      { label: "Register empty", href: "/register", arrange: async () => { await clear(); await setRegisterSize(0); } },
      { label: "Rate limited", href: "/register", arrange: async () => { await clear(); await forceCode("RATE_LIMITED", "/api/public/register", false); } },
    ],
  },
  {
    path: "/register/[projectId]",
    states: [
      { label: "Many periods", href: "/register/proj_ekuri", arrange: clear },
      { label: "One period", href: "/register/proj_delta", arrange: clear },
      { label: "No period closed", href: "/register/proj_oban", arrange: clear },
      { label: "Closed late, marked", href: "/register/proj_ekuri", arrange: clear },
      { label: "Correction, both records", href: "/register/proj_ekuri", arrange: clear },
      { label: "Suspended", href: "/register/proj_ekuri", arrange: async () => { await clear(); await setProjectStatus("proj_ekuri", "suspended"); } },
      { label: "Withdrawn", href: "/register/proj_ekuri_pilot", arrange: clear },
      { label: "Not found", href: "/register/proj_nothing", arrange: clear },
    ],
  },
  {
    path: "/developers/[developerId]",
    states: [
      { label: "Several projects", href: "/developers/dev_ekuri", arrange: clear },
      { label: "Single project", href: "/developers/dev_delta", arrange: clear },
      { label: "One withdrawn", href: "/developers/dev_ekuri", arrange: clear },
      { label: "No closed periods", href: "/developers/dev_oban", arrange: clear },
    ],
  },
  {
    path: "/attestation/[id]",
    states: [
      { label: "Valid", href: "/attestation/att_ekuri_2026q3", arrange: clear },
      { label: "Superseded by a correction", href: "/attestation/att_ekuri_2026q3", arrange: clear },
      { label: "The correction itself", href: "/attestation/att_ekuri_2026q3_correction", arrange: clear },
      { label: "Anchor pending", href: "/attestation/att_ekuri_pilot_2026q1", arrange: clear },
      { label: "Chain discontinuity", href: "/attestation/att_ekuri_2026q2", arrange: async () => { await clear(); await forceCode("CHAIN_DISCONTINUITY", "/api/public/attestations", false); } },
    ],
  },
  {
    path: "/verify",
    states: [
      { label: "Nothing checked", href: "/verify", arrange: clear },
      { label: "Anchor unreachable", href: "/verify", arrange: async () => { await clear(); await forceCode("ANCHOR_UNREACHABLE", "/api/verify", false); } },
    ],
  },
  {
    path: "/report",
    states: [
      { label: "Form", href: "/report", arrange: clear },
      { label: "Rate limited", href: "/report", arrange: async () => { await clear(); await forceCode("RATE_LIMITED", "/api/disputes", false); } },
      { label: "Project not found", href: "/report", arrange: async () => { await clear(); await forceCode("NOT_FOUND", "/api/disputes", false); } },
    ],
  },
  {
    path: "/receipt/[token]",
    states: [
      { label: "Valid", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: clear },
      { label: "No payments yet", href: "/receipt/rct_unpaid_2026q4", arrange: clear },
      { label: "Token expired", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: async () => { await clear(); await forceCode("TOKEN_EXPIRED", "/api/receipt", false); } },
      { label: "Already confirmed", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: async () => { await clear(); await forceCode("ALREADY_CONFIRMED", "/api/receipt", false); } },
      { label: "Dispute already open", href: "/receipt/rct_ngozi_eyo_2026q4", arrange: async () => { await clear(); await forceCode("DISPUTE_ALREADY_OPEN", "/api/receipt", false); } },
      { label: "Unknown token", href: "/receipt/rct_nothing", arrange: clear },
    ],
  },
];
