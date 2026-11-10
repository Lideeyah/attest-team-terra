import type { Metadata } from "next";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";
import type { Participant } from "@/lib/api/contract";
import { formatDateTime, formatTimeOfDay, maskPhone } from "@/lib/record";

export const metadata: Metadata = {
  title: "An enrolment",
};

type Enrolment = {
  id: string;
  participant: Participant;
  capturedAt: string;
  syncedAt: string;
  location: { recorded: boolean; boundary: "inside" | "outside" };
  editable: boolean;
};

/* A submitted enrolment is a record. It is not a form with everything
   disabled, because a disabled form says the product would let you edit it
   under other circumstances. It says what it is and where a correction goes:
   through the console, with a reason, where it is logged against the
   household's record. */
export default async function EnrolmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const result = await api.enrolment(id);

  if (!result.ok) {
    return (
      <div className="field-screen stack">
        <Notice tone="blocked" title={headingFor(result.code, "This enrolment could not be read")}>
          <p>{result.message}</p>
        </Notice>
      </div>
    );
  }

  const enrolment = result.data as Enrolment;
  const participant = enrolment.participant;

  return (
    <div className="field-screen stack">
      <p className="eyebrow">{enrolment.id}</p>
      <h1 className="h3-display">
        {participant.name}
      </h1>
      <Stamp state="sealed" label="Submitted" recordId={enrolment.id} />
      <Rule />

      <p className="field-readable" data-readonly="submitted">
        This enrolment has been submitted and is part of the project&rsquo;s
        record. Nothing here can be changed from this phone. A correction is
        made in the console, with a reason, and both the correction and what it
        replaced stay on the household&rsquo;s record.
      </p>

      <dl className="field-review">
        <div>
          <dt className="eyebrow">Community</dt>
          <dd className="record-cell field-record">{participant.community}</dd>
        </div>
        <div>
          <dt className="eyebrow">Phone</dt>
          <dd className="record-cell field-record">{maskPhone(participant.phoneMasked)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Account</dt>
          <dd className="record-cell field-record">{participant.accountNumber}</dd>
        </div>
        <div>
          <dt className="eyebrow">Captured</dt>
          <dd className="record-cell field-record">
            {formatDateTime(enrolment.capturedAt)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Sent from this phone</dt>
          <dd className="record-cell field-record">
            {formatTimeOfDay(enrolment.syncedAt)} · {formatDateTime(enrolment.syncedAt)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Location</dt>
          <dd className="record-cell field-record">
            {enrolment.location.recorded
              ? enrolment.location.boundary === "inside"
                ? "Recorded, inside the project boundary"
                : "Recorded, outside the project boundary"
              : "Not recorded"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
