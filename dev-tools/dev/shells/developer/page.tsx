import { Surface } from "@/components/Surface";
import { DeveloperShell } from "@/components/shells/DeveloperShell";
import { Figure } from "@/components/Figure";
import { Rule } from "@/components/Rule";
import { OPEN_PERIOD, PROJECT } from "@/lib/sample";
import { formatCoverage, formatCount, formatNaira } from "@/lib/record";

export default function DeveloperShellPreview() {
  return (
    <Surface>
    <DeveloperShell
      outstanding={{
        "/app/roster": { count: 12, label: "flagged" },
        "/app/runs": { count: 1, label: "in flight", blocking: true },
        "/app/disputes": { count: 3 },
      }}
    >
      <div className="stack-lg">
        <p className="eyebrow">Shell reference</p>
        <h1 className="h2-display">Developer console shell</h1>
        <Rule weight="heavy" />
        <div
          className="grid-ruled"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
            <Figure
              label="Households enrolled"
              value={formatCount(PROJECT.enrolled)}
              denominator="Cross River, Akamkpa LGA"
            />
          </div>
          <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
            <Figure
              label="Households paid"
              value={formatCount(PROJECT.paid)}
              denominator={`${formatCoverage(PROJECT.paid, PROJECT.enrolled)} enrolled`}
            />
          </div>
          <div style={{ background: "var(--surface-reading)", padding: "var(--pad-panel)" }}>
            <Figure
              label="Shortfall"
              value={formatNaira(OPEN_PERIOD.shortfall)}
              denominator={`of ${formatNaira(OPEN_PERIOD.required)} required`}
            />
          </div>
        </div>
      </div>
    </DeveloperShell>
    </Surface>
  );
}
