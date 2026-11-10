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
          <dd className="record-cell">
            {formatCount(inFlight)}
            {inFlight > 0 ? (
              <span
                className={`queue-underline ${PRIMITIVE_CLASS.queuePulse}`}
                data-in-flight="true"
              />
            ) : null}
          </dd>
        </div>
        <div className="run-count">
          <dt className="eyebrow">Queued</dt>
          <dd className="record-cell">{formatCount(queued)}</dd>
        </div>
        <div className="run-count">
          <dt className="eyebrow">Failed</dt>
          <dd className="record-cell">{formatCount(failed)}</dd>
        </div>
      </dl>
      <div className="run-bar" role="img" aria-label={`${formatCount(resolved)} of ${formatCount(rosterSize)} transfers resolved`}>
        <span className="run-bar-settled" style={{ width: share(settled) }} />
        <span className="run-bar-failed" style={{ width: share(failed) }} />
        <span className="run-bar-flight" style={{ width: share(inFlight) }} />
      </div>
    </div>
  );
}
