"use client";

import { FieldScreen } from "@/components/field/FieldScreen";
import { Today } from "@/components/field/Today";

export function FieldHomeScreen() {
  return (
    <FieldScreen>
      {(session) => (
        <Today
          captured={session.today.captured}
          target={session.today.target}
          agentName={session.agent.name}
        />
      )}
    </FieldScreen>
  );
}
