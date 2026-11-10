import { connection } from "next/server";
import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { DeveloperShell } from "@/components/shells/DeveloperShell";
import { consoleContext } from "@/lib/console";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  const context = await consoleContext();
  const shell =
    "project" in context
      ? {
          outstanding: context.outstanding,
          period: context.period,
          account: {
            organisation: context.project.developerName,
            email: "operations@ekuri-initiative.ng",
          },
        }
      : {};

  return (
    <Surface>
      <DeveloperShell {...shell}>
        <RouteTransition>{children}</RouteTransition>
      </DeveloperShell>
    </Surface>
  );
}
