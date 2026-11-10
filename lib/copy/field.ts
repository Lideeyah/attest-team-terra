import type { EnrolmentFlag } from "@/lib/field/queue";

/* The field app's words. Read outdoors, on a phone, often aloud to the
   household being enrolled, so they are short, concrete and never accusatory:
   a flag is a fact about an enrolment, not a judgement about a person. */

export const FIELD_COPY = {
  offline: "Offline",
  online: "Online",
  pending: (count: number) =>
    count === 1 ? "1 waiting to sync" : `${count} waiting to sync`,
  syncNow: "Sync now",
  syncing: "Syncing",
  synced: "Everything here has been sent and accepted.",
  nothingQueued: "Nothing is waiting. Every enrolment captured on this phone has been sent.",
  offlineIsNormal:
    "Capture works with no connection. Enrolments wait on this phone and are sent when there is one.",
} as const;

export const STEP_COPY = {
  consent: {
    title: "Consent",
    lede: "Read this to the household before anything is entered.",
    script:
      "Your name, your phone number and your bank account are recorded so a carbon project can pay you directly. The payments you receive are published as a count, never as your name. You can ask to be removed at any time, and that does not take back a payment already made.",
    confirm: "The household heard this and agreed",
    missing: "Nothing is entered until the household has agreed.",
  },
  identity: {
    title: "Identity",
    lede: "Eleven digits, from the household's own document.",
    note: "Only the last four digits are kept on this phone.",
  },
  details: {
    title: "Details",
    lede: "The name as it is on the bank account, or the payment will not resolve.",
  },
  photograph: {
    title: "Photograph",
    lede: "One photograph of the household, taken here.",
    failed:
      "The camera did not open. The enrolment can continue without a photograph and is flagged for one to be added later.",
    without: "Continue without a photograph",
  },
  location: {
    title: "Location",
    lede: "Where this enrolment was captured, to the nearest hundred metres.",
    acquiring: "Finding where this phone is",
    unavailable:
      "This phone will not give a location. The enrolment proceeds without one and is flagged, because a location is evidence of where the capture happened.",
    outside:
      "This location is outside the project's boundary. The enrolment can still be made and is flagged for review, and a reason is required.",
    reason: "Why this household is being enrolled from outside the boundary",
  },
  review: {
    title: "Review",
    lede: "Read it back to the household before it is submitted.",
  },
  submit: {
    title: "Submitted",
    queued:
      "Captured and waiting on this phone. It is sent when there is a connection, and nothing about it can be changed from here afterwards.",
  },
} as const;

export const BLOCK_COPY = {
  duplicate: {
    title: "This identity is already enrolled",
    readAloud:
      "Read this to the household: this verification number is already on the register for this project. One household is enrolled once, so that the count of households paid is a count of households. If somebody else has used your number, tell the project and they will look into it.",
    note: "This is the one thing the field app will not let past. Nothing has been saved.",
  },
} as const;

export const FLAG_COPY: Record<EnrolmentFlag, string> = {
  "boundary-outside": "Captured outside the project boundary",
  "location-unavailable": "Captured without a location",
  "identity-unreachable": "Identity not checked yet; it is checked when this syncs",
  "identity-mismatch": "The name and the identity number do not match",
  "photograph-missing": "No photograph",
};

export const ME_COPY = {
  heading: "Your record",
  none: "No enrolments yet. Your first one appears here as soon as it is captured.",
  aboveThreshold:
    "Your flag rate is above the project's threshold. A flag is a fact about an enrolment — a location outside the boundary, a name that did not match — and it is shown to you here before anybody else raises it.",
  syncNote:
    "Sync delay is the time between capturing an enrolment and this phone sending it. A long delay is usually a long day out of signal.",
} as const;
