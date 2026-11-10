import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { FieldShell } from "@/components/shells/FieldShell";

export default function FieldLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
      <FieldShell>
        <RouteTransition>{children}</RouteTransition>
      </FieldShell>
    </Surface>
  );
}
