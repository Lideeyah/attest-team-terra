"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { field } from "@/lib/field/api";
import { BLOCK_COPY, FLAG_COPY, STEP_COPY } from "@/lib/copy/field";
import {
  boundaryOf,
  compressPhotograph,
  flagsFor,
  readLocation,
  type Boundary,
} from "@/lib/field/capture";
import { tryCompress } from "@/lib/field/storage";
import {
  newClientUuid,
  queueEnrolment,
  signCapture,
  type CaptureLocation,
} from "@/lib/field/queue";
import { formatDateTime, maskPhone } from "@/lib/record";

/* The seven steps. One screen at a time, because this is a phone held in one
   hand outdoors, and because each step is a thing the agent says to the
   household rather than a field on a form.

   Three rules live here: consent cannot be bypassed, a duplicate identity is
   blocked outright, and anything else — no location, no photograph, outside
   the boundary, an identity service that will not answer — flags the
   enrolment and lets it proceed. An agent standing in front of a household
   must never be stopped by a thing they cannot fix from there. */

const STEPS = [
  "consent",
  "identity",
  "details",
  "photograph",
  "location",
  "review",
  "submitted",
] as const;

type Step = (typeof STEPS)[number];

type IdentityState = "unchecked" | "checking" | "checked" | "queued" | "mismatch";

export function EnrolFlow({
  agentId,
  projectId,
  boundary,
  onNextHousehold,
}: {
  agentId: string;
  projectId: string;
  boundary: Boundary | null;
  /** Starts the flow again from consent, with nothing carried over from the
      household just enrolled. */
  onNextHousehold: () => void;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const requested = search.get("step") as Step | null;

  const [chosen, setChosen] = useState<Step | null>(null);
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [identity, setIdentity] = useState("");
  const [identityType, setIdentityType] = useState<"BVN" | "NIN">("BVN");
  const [identityState, setIdentityState] = useState<IdentityState>("unchecked");
  const [blocked, setBlocked] = useState(false);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [community, setCommunity] = useState("Iko Esai");
  const [photograph, setPhotograph] = useState<string | null>(null);
  const [photographFailed, setPhotographFailed] = useState(false);
  const [location, setLocation] = useState<CaptureLocation>(null);
  const [locating, setLocating] = useState(false);
  const [locationRead, setLocationRead] = useState(false);
  const [boundaryReason, setBoundaryReason] = useState("");
  const [uuid] = useState(() => newClientUuid());
  const [capturedAt] = useState(() => new Date().toISOString());
  const [queued, setQueued] = useState(false);
  const camera = useRef<HTMLInputElement>(null);

  /* A step may be opened directly, which is how the state panel reaches one.
     The URL is the step until the agent moves, and consent is still the gate:
     a later step opened without it says so and goes back to it. */
  const step: Step =
    chosen ?? (requested && STEPS.includes(requested) ? requested : "consent");
  const setStep = setChosen;

  const where = boundaryOf(location, boundary);
  const outside = where === "outside";
  const unknownLocation = locationRead && where === "unknown";

  /* The location is read when the step opens. The read is an external one —
     the device's own — so it lands in its callback rather than in the
     effect's body. */
  useEffect(() => {
    if (step !== "location" || locationRead) {
      return;
    }
    let live = true;
    void Promise.resolve()
      .then(() => {
        setLocating(true);
        return readLocation();
      })
      .then((read) => {
        if (!live) {
          return;
        }
        setLocation(read);
        setLocationRead(true);
        setLocating(false);
      });
    return () => {
      live = false;
    };
  }, [step, locationRead]);

  async function checkIdentity(): Promise<void> {
    if (identity.trim().length < 11) {
      return;
    }
    setIdentityState("checking");
    /* The check is a round trip. Offline, or with the service down, the
       enrolment is queued with the check outstanding rather than stopped. */
    const result = await field.checkIdentity({
      type: identityType,
      number: identity.trim(),
    });
    if (result.ok) {
      setIdentityState("checked");
      setStep("details");
      return;
    }
    if (result.code === "IDENTITY_DUPLICATE") {
      setBlocked(true);
      setIdentityState("unchecked");
      return;
    }
    if (result.code === "BVN_MISMATCH" || result.code === "NAME_MISMATCH") {
      setIdentityState("mismatch");
      setStep("details");
      return;
    }
    setIdentityState("queued");
    setStep("details");
  }

  async function takePhotograph(): Promise<void> {
    setPhotographFailed(false);
    const input = camera.current;
    if (!input) {
      setPhotographFailed(true);
      return;
    }
    /* A phone opens its camera here. Where there is no camera — a desktop
       browser, a device that refuses — the step says so and the enrolment
       proceeds flagged. */
    input.click();
    window.setTimeout(() => {
      setPhotograph((current) => {
        if (current === null) {
          setPhotographFailed(true);
        }
        return current;
      });
    }, 1200);
  }

  async function onFrame(file: File | undefined): Promise<void> {
    if (!file) {
      setPhotographFailed(true);
      return;
    }
    const compressed = await tryCompress(file, compressPhotograph);
    setPhotograph(compressed);
    setPhotographFailed(compressed === null);
  }

  async function submit(): Promise<void> {
    const flags = flagsFor({
      boundary: where,
      photograph,
      identity:
        identityState === "queued"
          ? "queued"
          : identityState === "mismatch"
            ? "mismatch"
            : "checked",
    });
    const signature = await signCapture([
      uuid,
      capturedAt,
      identity.trim(),
      location ? `${location.latitude},${location.longitude}` : "no-location",
    ]);
    await queueEnrolment({
      clientUuid: uuid,
      capturedAt,
      agentId,
      projectId,
      consentAt: consentAt ?? capturedAt,
      identity: {
        type: identityType,
        number: identity.trim(),
        lastFour: identity.trim().slice(-4),
      },
      details: {
        givenName,
        familyName,
        phone,
        accountNumber,
        bankCode: "058",
        community,
      },
      photograph,
      location,
      boundaryReason: outside ? boundaryReason : null,
      flags,
      signature,
      state: "queued",
      failure: null,
      attempts: 0,
    });
    setQueued(true);
    setStep("submitted");
  }

  if (blocked) {
    return (
      <div className="field-screen stack-lg">
        <h1 className="h3-display">{BLOCK_COPY.duplicate.title}</h1>
        <Rule weight="heavy" />
        <Notice tone="blocked" title={BLOCK_COPY.duplicate.title}>
          <p data-blocked="IDENTITY_DUPLICATE" className="field-readable">
            {BLOCK_COPY.duplicate.readAloud}
          </p>
        </Notice>
        <p className="field-note">{BLOCK_COPY.duplicate.note}</p>
        <button
          type="button"
          className="btn field-action"
          onClick={() => {
            setBlocked(false);
            setIdentity("");
            setStep("identity");
          }}
        >
          Back to the identity step
        </button>
      </div>
    );
  }

  const position = STEPS.indexOf(step) + 1;

  return (
    <div className="field-screen stack" data-step={step}>
      {step === "submitted" ? null : (
        <p className="eyebrow">
          Step {position} of {STEPS.length - 1}
        </p>
      )}

      {step === "consent" ? (
        <>
          <h1 className="h3-display">{STEP_COPY.consent.title}</h1>
          <p className="field-lede">{STEP_COPY.consent.lede}</p>
          <Rule />
          <p className="field-readable" data-consent-script>
            {STEP_COPY.consent.script}
          </p>
          <label className="field-check">
            <input
              type="checkbox"
              className="punch field-punch"
              data-consent
              checked={consentAt !== null}
              onChange={(event) =>
                setConsentAt(event.target.checked ? new Date().toISOString() : null)
              }
            />
            <span>{STEP_COPY.consent.confirm}</span>
          </label>
          <p className="field-note">{STEP_COPY.consent.missing}</p>
          <button
            type="button"
            className="btn field-action"
            data-step-next
            disabled={consentAt === null}
            onClick={() => setStep("identity")}
          >
            Next
          </button>
        </>
      ) : null}

      {step !== "consent" && consentAt === null ? (
        <Notice tone="flagged" title="Consent comes first">
          <p data-consent-missing>{STEP_COPY.consent.missing}</p>
          <button
            type="button"
            className="btn field-action"
            onClick={() => setStep("consent")}
          >
            Go to consent
          </button>
        </Notice>
      ) : null}

      {step === "identity" && consentAt !== null ? (
        <>
          <h1 className="h3-display">{STEP_COPY.identity.title}</h1>
          <p className="field-lede">{STEP_COPY.identity.lede}</p>
          <Rule />
          <div className="field-group">
            <label className="label" htmlFor="identity-type">
              Document
            </label>
            <select
              id="identity-type"
              className="select field-input"
              value={identityType}
              onChange={(event) => setIdentityType(event.target.value as "BVN" | "NIN")}
            >
              <option value="BVN">Bank verification number</option>
              <option value="NIN">National identity number</option>
            </select>
          </div>
          <div className="field-group">
            <label className="label" htmlFor="identity-number">
              Number
            </label>
            <input
              id="identity-number"
              className="input field-input"
              inputMode="numeric"
              data-identity
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
            />
            <p className="field-note">{STEP_COPY.identity.note}</p>
          </div>
          {identityState === "queued" ? (
            <Notice tone="flagged" title="The identity service did not answer">
              <p data-identity-state="queued">
                The enrolment is captured and the check runs when this phone
                syncs. Nothing is lost.
              </p>
            </Notice>
          ) : null}
          <button
            type="button"
            className="btn field-action"
            data-step-next
            disabled={identity.trim().length < 11 || identityState === "checking"}
            onClick={() => void checkIdentity()}
          >
            {identityState === "checking" ? "Checking" : "Next"}
          </button>
        </>
      ) : null}

      {step === "details" && consentAt !== null ? (
        <>
          <h1 className="h3-display">{STEP_COPY.details.title}</h1>
          <p className="field-lede">{STEP_COPY.details.lede}</p>
          <Rule />
          {identityState === "queued" ? (
            <p className="field-note" data-identity-state="queued">
              {FLAG_COPY["identity-unreachable"]}
            </p>
          ) : null}
          {identityState === "mismatch" ? (
            <Notice tone="flagged" title="The name and the number do not match">
              <p data-identity-state="mismatch">
                The enrolment is captured and queued for review. The project
                decides; the agent does not have to.
              </p>
            </Notice>
          ) : null}
          <div className="field-group">
            <label className="label" htmlFor="given-name">
              First name
            </label>
            <input
              id="given-name"
              className="input field-input"
              data-given-name
              value={givenName}
              onChange={(event) => setGivenName(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="label" htmlFor="family-name">
              Last name
            </label>
            <input
              id="family-name"
              className="input field-input"
              data-family-name
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              className="input field-input"
              inputMode="numeric"
              data-phone
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="label" htmlFor="account">
              Account number
            </label>
            <input
              id="account"
              className="input field-input"
              inputMode="numeric"
              data-account
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="label" htmlFor="community">
              Community
            </label>
            <input
              id="community"
              className="input field-input"
              value={community}
              onChange={(event) => setCommunity(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn field-action"
            data-step-next
            disabled={
              givenName.trim().length === 0 ||
              familyName.trim().length === 0 ||
              accountNumber.trim().length < 10
            }
            onClick={() => setStep("photograph")}
          >
            Next
          </button>
        </>
      ) : null}

      {step === "photograph" && consentAt !== null ? (
        <>
          <h1 className="h3-display">{STEP_COPY.photograph.title}</h1>
          <p className="field-lede">{STEP_COPY.photograph.lede}</p>
          <Rule />
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            className="field-camera"
            onChange={(event) => void onFrame(event.target.files?.[0])}
            aria-label="Take the photograph"
          />
          <button
            type="button"
            className="btn field-action"
            data-photograph
            onClick={() => void takePhotograph()}
          >
            Take the photograph
          </button>
          {photograph ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="field-frame-shot" src={photograph} alt="The photograph just taken" />
          ) : null}
          {photographFailed ? (
            <Notice tone="flagged" title="The camera did not open">
              <p data-photograph-state="failed">{STEP_COPY.photograph.failed}</p>
            </Notice>
          ) : null}
          <button
            type="button"
            className="btn field-action"
            data-step-next
            onClick={() => setStep("location")}
          >
            {photograph ? "Next" : STEP_COPY.photograph.without}
          </button>
        </>
      ) : null}

      {step === "location" && consentAt !== null ? (
        <>
          <h1 className="h3-display">{STEP_COPY.location.title}</h1>
          <p className="field-lede">{STEP_COPY.location.lede}</p>
          <Rule />
          {locating ? (
            <p className="field-note" data-location="acquiring">
              {STEP_COPY.location.acquiring}
            </p>
          ) : null}
          {location ? (
            <p className="record-cell field-record" data-location="captured">
              {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)} · to
              within {Math.round(location.accuracy)}m
            </p>
          ) : null}
          {unknownLocation ? (
            <Notice tone="flagged" title="No location">
              <p data-location="unavailable">{STEP_COPY.location.unavailable}</p>
            </Notice>
          ) : null}
          {outside ? (
            <>
              <Notice tone="flagged" title="Outside the project boundary">
                <p data-boundary="outside">{STEP_COPY.location.outside}</p>
              </Notice>
              <div className="field-group">
                <label className="label" htmlFor="boundary-reason">
                  {STEP_COPY.location.reason}
                </label>
                <textarea
                  id="boundary-reason"
                  className="textarea field-input"
                  data-boundary-reason
                  value={boundaryReason}
                  onChange={(event) => setBoundaryReason(event.target.value)}
                />
              </div>
            </>
          ) : null}
          <button
            type="button"
            className="btn field-action"
            data-step-next
            disabled={locating || (outside && boundaryReason.trim().length < 12)}
            onClick={() => setStep("review")}
          >
            Next
          </button>
        </>
      ) : null}

      {step === "review" && consentAt !== null ? (
        <>
          <h1 className="h3-display">{STEP_COPY.review.title}</h1>
          <p className="field-lede">{STEP_COPY.review.lede}</p>
          <Rule />
          <dl className="field-review">
            <div>
              <dt className="eyebrow">Name</dt>
              <dd className="record-cell field-record">
                {givenName} {familyName}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Phone</dt>
              <dd className="record-cell field-record">{maskPhone(phone)}</dd>
            </div>
            <div>
              <dt className="eyebrow">Account</dt>
              <dd className="record-cell field-record">{accountNumber}</dd>
            </div>
            <div>
              <dt className="eyebrow">{identityType}</dt>
              <dd className="record-cell field-record">····{identity.trim().slice(-4)}</dd>
            </div>
            <div>
              <dt className="eyebrow">Captured</dt>
              <dd className="record-cell field-record">{formatDateTime(capturedAt)}</dd>
            </div>
            <div>
              <dt className="eyebrow">On this phone as</dt>
              <dd className="record-cell field-record" data-client-uuid>
                {uuid}
              </dd>
            </div>
          </dl>
          {flagsFor({
            boundary: where,
            photograph,
            identity:
              identityState === "queued"
                ? "queued"
                : identityState === "mismatch"
                  ? "mismatch"
                  : "checked",
          }).map((flag) => (
            <p className="field-note" key={flag} data-flag={flag}>
              {FLAG_COPY[flag]}
            </p>
          ))}
          <button
            type="button"
            className="btn field-action"
            data-submit-enrolment
            onClick={() => void submit()}
          >
            Submit this enrolment
          </button>
        </>
      ) : null}

      {step === "submitted" ? (
        <>
          <h1 className="h3-display">{STEP_COPY.submit.title}</h1>
          <Rule />
          <p className="field-readable" data-enrolment-queued={queued ? uuid : undefined}>
            {STEP_COPY.submit.queued}
          </p>
          <button
            type="button"
            className="btn field-action"
            data-next-household
            onClick={onNextHousehold}
          >
            Enrol the next household
          </button>
          <button
            type="button"
            className="btn-outline field-action"
            onClick={() => router.push("/field/queue")}
          >
            See the queue
          </button>
        </>
      ) : null}
    </div>
  );
}
