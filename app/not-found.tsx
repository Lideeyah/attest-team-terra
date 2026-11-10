import { PublicMasthead } from "@/components/shells/PublicMasthead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Surface } from "@/components/Surface";
import { ButtonLink } from "@/components/Button";
import { Rule } from "@/components/Rule";

export default function NotFound() {
  return (
    <Surface>
      <main>
        <PublicMasthead context="Not found" />
        <div className="measure section stack-lg">
          <div className="stack">
            <p className="eyebrow">404</p>
            <h2 className="h2-display">There is no record at this address</h2>
            <Rule weight="heavy" />
          </div>
          <p className="prose-muted">
            The address may have been a project, an attestation or a receipt
            that no longer resolves. The register lists every project that has
            closed a period.
          </p>
          <div className="row">
            <ButtonLink href="/register" variant="quiet">
              Open the register
            </ButtonLink>
          </div>
        </div>
        <PublicFooter />
      </main>
    </Surface>
  );
}
