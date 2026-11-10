import { typeset } from "@/lib/fonts";
import { FieldShell } from "@/components/shells/FieldShell";

export default function FieldLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={typeset}>
      <FieldShell>{children}</FieldShell>
    </div>
  );
}
