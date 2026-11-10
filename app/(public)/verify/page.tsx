import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicMasthead } from "@/components/public/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Button } from "@/components/Button";
import { Hash } from "@/components/Hash";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { Stamp } from "@/components/Stamp";
import { api } from "@/lib/api/client";
import { parseJson } from "@/lib/json";
import { formatCoverage, formatNaira, formatTimestamp } from "@/lib/record";

export const metadata: Metadata = {
  title: "Verify a record",
  description:
    "Check a period against its hash, or one transfer against its proof, without seeing anything else.",
};

type Search = {
  hash?: string;
  bundle?: string;
  mode?: string;
  outcome?: string;
  code?: string;
};

/* Both modes run server-side and land on a result that can be linked to, so a
   verification can be shared as the thing it verified. */

async function verifyPeriod(formData: FormData) {
  "use server";
  const hash = String(formData.get("hash") ?? "").trim();
  if (!/^[0-9a-f]{64}$/i.test(hash)) {
    redirect(`/verify?mode=period&outcome=invalid&code=VALIDATION_FAILED`);
  }
  const result = await api.verifyAttestation({ hash });
  if (!result.ok) {
    redirect(`/verify?mode=period&outcome=error&code=${result.code}&hash=${hash}`);
  }
  redirect(
    `/verify?mode=period&outcome=${result.data.outcome}&hash=${hash}`,
  );
}

async function verifyDisclosure(formData: FormData) {
  "use server";
  const raw = String(formData.get("bundle") ?? "").trim();
  const parsed = parseJson(raw);
  if (!parsed.ok) {
    redirect(`/verify?mode=transfer&outcome=invalid&code=VALIDATION_FAILED`);
  }
  const result = await api.verifyDisclosure({ bundle: parsed.value });
  if (!result.ok) {
    redirect(`/verify?mode=transfer&outcome=error&code=${result.code}`);
  }
  const data = result.data;
  redirect(
    `/verify?mode=transfer&outcome=${data.outcome}&period=${encodeURIComponent(
      data.period ?? "",
    )}&project=${encodeURIComponent(data.projectName ?? "")}&anchor=${
      data.anchorReachable ? "reachable" : "unreachable"
    }`,
  );
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Search & { period?: string; project?: string; anchor?: string }>;
}) {
  const search = await searchParams;

  return (
    <>
      <PublicMasthead context="Verification" />
      <div className="measure section-tight stack-lg">
        <div className="stack">
          <p className="eyebrow">Verify</p>
          <h1 className="h2-display">Check a record against what it claims</h1>
          <p className="lede">
            A period verifies against its own hash. One transfer verifies
            against a disclosure bundle, which proves that transfer belongs to
            the period it names and discloses nothing else about anyone.
          </p>
          <Rule weight="heavy" />
        </div>

        <div className="split">
          <form action={verifyPeriod} className="stack">
            <h2 className="h3-display">A period</h2>
            <div className="field">
              <label className="label" htmlFor="verify-hash">
                Attestation hash
              </label>
              <input
                id="verify-hash"
                name="hash"
                className="input"
                defaultValue={search.hash ?? ""}
                placeholder="64 hexadecimal characters"
                data-verify-hash
              />
              <p className="field-note">
                Copy it from an attestation, or from a signed bundle
              </p>
            </div>
            <div className="row">
              <Button type="submit">Verify the period</Button>
            </div>
          </form>

          <form action={verifyDisclosure} className="stack">
            <h2 className="h3-display">One transfer</h2>
            <div className="field">
              <label className="label" htmlFor="verify-bundle">
                Disclosure bundle
              </label>
              <textarea
                id="verify-bundle"
                name="bundle"
                className="textarea"
                defaultValue={search.bundle ?? ""}
                placeholder='{"leaf":"…","proof":["…"],"rootReference":"…"}'
                data-verify-bundle
              />
              <p className="field-note">Leaf, proof path and root reference</p>
            </div>
            <div className="row">
              <Button type="submit" data-verify-submit>
                Verify the transfer
              </Button>
            </div>
          </form>
        </div>

        <VerifyOutcome search={search} />
      </div>
      <PublicFooter />
    </>
  );
}

async function VerifyOutcome({
  search,
}: {
  search: Search & { period?: string; project?: string; anchor?: string };
}) {
  if (!search.outcome) {
    return (
      <p className="eyebrow" data-verify-outcome>
        Nothing checked yet
      </p>
    );
  }

  if (search.outcome === "invalid") {
    return (
      <div data-verify-outcome>
        <Notice tone="blocked" title="The input is not in the right shape">
          A period is verified with a 64-character hexadecimal hash. A transfer
          is verified with the disclosure bundle as it was issued, including its
          leaf, its proof path and the root it refers to.
        </Notice>
      </div>
    );
  }

  if (search.outcome === "error") {
    const code = search.code ?? "";
    const copy: Record<string, { title: string; body: string; tone: "flagged" | "blocked" }> = {
      PROOF_INVALID: {
        title: "The proof path does not compute to the stated root",
        body: "The bundle's own arithmetic does not hold, so nothing here is evidence of anything. Ask the developer for a fresh bundle.",
        tone: "blocked",
      },
      LEAF_NOT_IN_ROOT: {
        title: "That transfer does not belong to the period it names",
        body: "The proof is well formed and the transfer is real, but it is not in the period this bundle cites. Check the period on the bundle against the attestation it refers to.",
        tone: "blocked",
      },
      ANCHOR_UNREACHABLE: {
        title: "The anchoring network could not be reached",
        body: "The hash and the proof still verify locally against the attestation, so the arithmetic holds. What cannot be checked right now is when it was published.",
        tone: "flagged",
      },
      RATE_LIMITED: {
        title: "Too many checks from this address",
        body: "Wait sixty seconds and try again. Verification is public, so it is rate-limited per address.",
        tone: "flagged",
      },
    };
    const chosen = copy[code] ?? {
      title: code || "The check did not complete",
      body: "Nothing was verified. Try again.",
      tone: "blocked" as const,
    };
    return (
      <div data-verify-outcome>
        <Notice tone={chosen.tone} title={chosen.title}>
          {chosen.body}
        </Notice>
      </div>
    );
  }

  if (search.mode === "transfer") {
    const matched = search.outcome === "match";
    return (
      <div className="stack" data-verify-outcome>
        <div className="row">
          <Stamp
            state={matched ? "sealed" : "blocked"}
            label={matched ? "In the period" : "No match"}
            recordId={`verify-${search.outcome}`}
          />
          {search.anchor === "unreachable" ? (
            <Stamp state="flagged" label="Anchor unreachable" recordId="verify-anchor" />
          ) : null}
        </div>
        <p className="prose-muted">
          {matched
            ? `This transfer belongs to ${search.period} of ${search.project}. The bundle proves that and nothing else: no household, no amount for anyone else, no part of the roster.`
            : "This bundle does not resolve to any period on the register. Nothing about it is disputed; it simply does not verify."}
        </p>
      </div>
    );
  }

  const matched = search.outcome === "match";
  if (!matched) {
    return (
      <div className="stack" data-verify-outcome>
        <Stamp state="blocked" label="No match" recordId="verify-period-none" />
        <p className="prose-muted">
          No period on the register has that hash. A hash that does not match is
          not evidence of anything having been altered: it may simply belong to
          a record that was never published here.
        </p>
      </div>
    );
  }

  const found = await api.verifyAttestation({ hash: search.hash ?? "" });
  const record = found.ok ? found.data.attestation : null;

  return (
    <div className="stack" data-verify-outcome>
      <Stamp state="sealed" label="Match" recordId="verify-period-match" />
      {record ? (
        <div className="definition">
          <div className="definition-row">
            <span className="eyebrow">Project</span>
            <span className="record-cell">
              <Link href={`/register/${record.projectId}`}>{record.projectName}</Link>
            </span>
          </div>
          <div className="definition-row">
            <span className="eyebrow">Period</span>
            <span className="record-cell">{record.period}</span>
          </div>
          <div className="definition-row">
            <span className="eyebrow">Households paid</span>
            <span className="record-cell" data-coverage>
              {formatCoverage(record.paid, record.enrolled)}
            </span>
          </div>
          <div className="definition-row">
            <span className="eyebrow">Received by households</span>
            <span className="record-cell">{formatNaira(record.amountToHouseholds)}</span>
          </div>
          <div className="definition-row">
            <span className="eyebrow">Closed</span>
            <span className="record-cell">{formatTimestamp(record.closedAt)}</span>
          </div>
          <div className="definition-row">
            <span className="eyebrow">Hash</span>
            <span className="record-cell">
              <Hash value={record.hash} full />
            </span>
          </div>
        </div>
      ) : null}
      {record ? (
        <Link href={`/attestation/${record.id}`} className="btn-outline btn-sm">
          Open the attestation
        </Link>
      ) : null}
    </div>
  );
}
