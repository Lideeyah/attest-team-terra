import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { DeveloperShell } from "@/components/shells/DeveloperShell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
      <DeveloperShell>
        <RouteTransition>{children}</RouteTransition>
      </DeveloperShell>
    </Surface>
  );
}
