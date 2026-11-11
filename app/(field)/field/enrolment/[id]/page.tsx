import type { Metadata } from "next";
import Link from 'next/link';
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { field } from "@/lib/field/api";
import { headingFor } from "@/lib/copy/codes";
import { formatDateTime, formatTimeOfDay, maskPhone } from "@/lib/record";
import {backendRequest,BackendError} from '@/lib/api/backend';

export const metadata: Metadata = {
  title: "An enrolment",
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
  if(process.env.ATTEST_API_MODE==='live'){
    type SubmittedFieldRecord={id:string;name:string;phone:string;status:string;capturedAt:string;flags:string[];accountNumber?:string;bankCode?:string};
    let data:SubmittedFieldRecord|null=null;
    try{
      data=(await backendRequest<SubmittedFieldRecord>(`/api/field/enrolments/${encodeURIComponent(id)}`)).data;
    }catch(error){if(!(error instanceof BackendError)||![403,404].includes(error.status))throw error;}
    if(!data)return <div className="field-screen stack"><h1 className="h3-display">Enrolment unavailable</h1><p>This record is not available to your field account. Only your own captures can be opened.</p><Link href="/field">Back to your workspace</Link></div>;
    return <article className="field-screen stack"><h1 className="h3-display">{data.name}</h1><p className="field-readable">Submitted enrolment. Corrections require an authorised developer and a recorded reason.</p><dl className="record-grid"><div><dt>Captured</dt><dd>{formatDateTime(data.capturedAt)}</dd></div><div><dt>Phone</dt><dd>{maskPhone(data.phone)}</dd></div><div><dt>Status</dt><dd>{data.status}</dd></div><div><dt>Payout account</dt><dd>{data.accountNumber?'••••••'+data.accountNumber.slice(-4):'Not supplied'}</dd></div><div><dt>Review flags</dt><dd>{data.flags.length?data.flags.map(flag=>flag.replaceAll('_',' ')).join(', '):'None recorded'}</dd></div></dl><Link href="/field">Back to your workspace</Link></article>;
  }
  const result = await field.enrolment(id);

  if (!result.ok) {
    return (
      <div className="field-screen stack">
        <Notice
          tone="blocked"
          title={headingFor(result.code, "This enrolment could not be read")}
        >
          <p className="field-readable">
            {result.transport
              ? "A submitted enrolment is the project's record rather than this phone's, so reading one needs a connection. Everything captured here and not yet sent is on the queue and is safe."
              : result.message}
          </p>
        </Notice>
      </div>
    );
  }

  const enrolment = result.data;
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
