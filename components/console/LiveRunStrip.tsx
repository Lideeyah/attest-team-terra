import { PRIMITIVE_CLASS } from "@/lib/motion";
import { formatCount } from "@/lib/record";

type LiveRunStripProps = {
  runId: string;
  queued: number;
  inFlight: number;
  settled: number;
  failed: number;
  rosterSize: number;
};

/** The run in flight, as a bar of its own counts. The queue underline is the
    one permitted loop, and it is here because these transfers genuinely have
    not resolved. */
export function LiveRunStrip({
  runId,
  queued,
  inFlight,
  settled,
  failed,
  rosterSize,
}: LiveRunStripProps) {
  const resolved = settled + failed;
  const share = (value: number) =>
    rosterSize > 0 ? `${Math.round((value / rosterSize) * 1000) / 10}%` : "0%";

  return (
    <div className="run-strip" data-run={runId}>
      <dl className="run-counts">
        <div className="run-count">
          <dt className="eyebrow">Settled</dt>
          <dd className="record-cell">
            {formatCount(settled)} of {formatCount(rosterSize)}
          </dd>
        </div>
        <div className="run-count">
          <dt className="eyebrow">In flight</dt>
          <dd className="record-cell" data-in-flight={inFlight}>
            {formatCount(inFlight)} of {formatCount(rosterSize)}
          </dd>
        </div>
        <div className="run-count">
          <dt className="eyebrow">Queued</dt>
          <dd className="record-cell">
            {formatCount(queued)} of {formatCount(rosterSize)}
          </dd>
        </div>
        <div className="run-count">
          <dt className="eyebrow">Failed</dt>
          <dd className="record-cell">
            {formatCount(failed)} of {formatCount(rosterSize)}
          </dd>
        </div>
      </dl>
      {/* The one permitted loop, on the bar's in-flight segment: it marks
          transfers that genuinely have not resolved, which is what §2.6 says
          it is for. A count is not a row and does not take it. */}
      <div className="run-bar" role="img" aria-label={`${formatCount(resolved)} of ${formatCount(rosterSize)} transfers resolved`}>
        <span className="run-bar-settled" style={{ width: share(settled) }} />
        <span className="run-bar-failed" style={{ width: share(failed) }} />
        <span
          className={`run-bar-flight${inFlight > 0 ? ` ${PRIMITIVE_CLASS.queuePulse}` : ""}`}
          style={{ width: share(inFlight) }}
        />
      </div>
    </div>
  );
}
