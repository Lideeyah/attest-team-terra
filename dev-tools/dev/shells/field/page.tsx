import { Surface } from "@/components/Surface";
import { FieldShell } from "@/components/shells/FieldShell";
import { Rule } from "@/components/Rule";

export default function FieldShellPreview() {
  return (
    <Surface>
    <FieldShell online={false} pendingSync={7}>
      <div className="stack-lg">
        <p className="eyebrow">Shell reference</p>
        <h1 className="h3-display">Field app shell</h1>
        <Rule weight="heavy" />
        <p className="prose-muted">
          The tab bar carries the four destinations, and the status strip above
          states whether the device is online and how many enrolments are
          waiting to sync.
        </p>
      </div>
    </FieldShell>
    </Surface>
  );
}
