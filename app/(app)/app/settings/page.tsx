import type { Metadata } from "next";
import { connection } from "next/server";
import { Notice } from "@/components/Notice";
import { Rule } from "@/components/Rule";
import { ApiKeys } from "@/components/console/ApiKeys";
import { ConsoleUsers } from "@/components/console/ConsoleUsers";
import { NotificationPreferences } from "@/components/console/NotificationPreferences";
import { WebhookEndpoints } from "@/components/console/WebhookEndpoints";
import { api } from "@/lib/api/client";
import { headingFor } from "@/lib/copy/codes";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await connection();
  const session = await api.session();
  if (!session.ok || session.data.projectId === null) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="review" title="This account is not on a project yet">
          <p>Users, keys and endpoints belong to a project.</p>
        </Notice>
      </div>
    );
  }
  const projectId = session.data.projectId;

  const [users, keys, endpoints, preferences] = await Promise.all([
    api.consoleUsers(projectId),
    api.apiKeys(projectId),
    api.webhookEndpoints(projectId),
    api.notificationPreferences(),
  ]);

  const refused = [users, keys, endpoints, preferences].find((result) => !result.ok);
  if (refused && !refused.ok) {
    return (
      <div className="console-page stack-lg">
        <Notice tone="blocked" title={headingFor(refused.code, refused.message)}>
          <p>{refused.message}</p>
          <p className="note">{refused.remediation}</p>
        </Notice>
      </div>
    );
  }

  return (
    <div className="console-page reading stack-lg">
      <header className="stack">
        <p className="eyebrow">Settings</p>
        <h1 className="h2-display">{session.data.organisation}</h1>
        <Rule weight="heavy" />
      </header>

      <ConsoleUsers
        projectId={projectId}
        users={users.ok ? users.data : []}
      />
      <NotificationPreferences
        preferences={preferences.ok ? preferences.data : null}
      />
      <ApiKeys projectId={projectId} keys={keys.ok ? keys.data : []} />
      <WebhookEndpoints
        projectId={projectId}
        endpoints={endpoints.ok ? endpoints.data : []}
      />
    </div>
  );
}
