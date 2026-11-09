import { ButtonLink } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="measure section">
      <div className="stack-lg">
        <p className="eyebrow">Not found</p>
        <h1 className="h2-display">There is no record at this address</h1>
        <p className="prose-muted">
          The page may have been a project, an attestation or a receipt that no
          longer resolves. The public register lists every project that has
          closed a period.
        </p>
        <div className="row">
          <ButtonLink href="/register">Open the register</ButtonLink>
        </div>
      </div>
    </div>
  );
}
