import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";
import { DeveloperShell } from "@/components/shells/DeveloperShell";
import { consoleContext } from "@/lib/console";
import { api } from "@/lib/api/client";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  const context = await consoleContext();
  const session = await api.session();
  if (process.env.ATTEST_API_MODE === "live" && session.ok && session.data.role !== "developer") {
    const destinations:Record<string,string>={agent:"/field",institution:"/verifier",ops:"/ops",admin:"/admin"};
    redirect(destinations[session.data.role]??"/signin");
  }
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
            email: session.ok ? session.data.email : "",
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
