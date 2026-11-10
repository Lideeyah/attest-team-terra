/* Everything a household reads, in one place. The build ships English only;
   adding Hausa, Yoruba or Igbo later is a second file beside this one rather
   than a hunt through the components. There is no language switcher in the
   web interface, because there is nothing yet to switch to and an empty
   control is worse than none. */

export const PARTICIPANT_LANGUAGES = ["en"] as const;
export type ParticipantLanguage = (typeof PARTICIPANT_LANGUAGES)[number];

export const RECEIPT_COPY = {
  en: {
    heading: (name: string) => `Payments recorded for ${name}`,
    noPaymentTitle: "No payment yet",
    noPaymentBody:
      "You are enrolled in this project and no payment has been recorded to you yet. When one is, it appears here with the bank's own reference.",
    settled: (when: string) => `Settled ${when}`,
    reference: (session: string) => `Bank reference ${session}`,
    confirmedOn: (when: string) => `You confirmed this on ${when}`,
    notConfirmed: "Not yet confirmed by you",
    askTitle: "Did the most recent payment reach you?",
    confirm: "Yes, I received it",
    disputeLabel: "No. What happened?",
    disputeSubmit: "Report it",
    categories: {
      "not-received": "Nothing arrived",
      "wrong-amount": "Less than I was told",
      "not-enrolled": "I was not on the list",
    },
    confirmed:
      "Confirmed. Thank you — that is now part of the record for this period.",
    disputed:
      "Reported. The claim is checked against the transfers the bank recorded and a reply comes to this number within five working days.",
    alreadyConfirmed:
      "This payment was already confirmed. The first confirmation stands, with its own time.",
    disputeOpen: "A report is already open for this payment. It is still being checked.",
    expired: "This link has expired. Reply RECEIPT to the payment notice for a new one.",
    failed: "That did not go through. Nothing was changed. Try again.",
    privateNote: "This page is yours alone. It shows nobody else's payments.",
    reportOpen: "A report you filed is open and being checked.",
    linkDead: "This link does not open a record",
  },
} satisfies Record<ParticipantLanguage, Record<string, unknown>>;

/* The SMS a household receives. Keyed here for the same reason. */
export const SMS_COPY = {
  en: {
    enrolled: (project: string) =>
      `You are enrolled in ${project}. When a payment is made to you, we will text you and you can check it yourself.`,
    paid: (amount: string, project: string, link: string) =>
      `${amount} has been paid to you by ${project}. See it here: ${link}. Reply YES if it reached you, or NO if it did not.`,
    confirmed: "Thank you. Your confirmation is on the record for this period.",
    disputeOpened:
      "Your report is recorded. We check it against the bank's own transfers and reply within five working days.",
    receiptResent: (link: string) => `Your payment record: ${link}`,
  },
} satisfies Record<ParticipantLanguage, Record<string, unknown>>;

/* The USSD menu. The language step stays in the structure with one option, so
   the flow's shape is right when a second language is added. */
export const USSD_MENU = {
  en: {
    languages: [{ key: "1", label: "English", code: "en" as ParticipantLanguage }],
    root: [
      { key: "1", label: "My last payment" },
      { key: "2", label: "Confirm I received it" },
      { key: "3", label: "Report a problem" },
    ],
  },
} satisfies Record<ParticipantLanguage, Record<string, unknown>>;
