import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { DeveloperShell } from "@/components/shells/DeveloperShell";
import { consoleContext } from "@/lib/console";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  const context = await consoleContext();
  /* A session that has ended mid-task sends the reader to sign in with where
     they were, so signing in returns them to it rather than to the home
     screen. Nothing else in the product issues this, so without it the state
     exists only if somebody types the URL. */
  if ("sessionEnded" in context && context.sessionEnded) {
    redirect("/signin?state=expired&next=%2Fapp");
  }
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
