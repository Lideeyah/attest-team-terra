"use client";

import { FieldScreen } from "@/components/field/FieldScreen";
import { Me } from "@/components/field/Me";

export function MeScreen() {
  return (
    <FieldScreen>
      {(session) => <Me agent={session.agent} threshold={session.flagThreshold} />}
    </FieldScreen>
  );
}
