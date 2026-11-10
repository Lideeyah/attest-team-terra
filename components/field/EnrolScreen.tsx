"use client";

import { useState } from "react";
import { EnrolFlow } from "@/components/field/EnrolFlow";
import { FieldScreen } from "@/components/field/FieldScreen";

/* One household at a time. Starting the next one mounts the flow again from
   nothing, so no field, no photograph and no location can carry over from
   the household before — which on a phone passed between hands is the way a
   wrong record gets made. */
export function EnrolScreen() {
  const [household, setHousehold] = useState(0);

  return (
    <FieldScreen>
      {(session) => (
        <EnrolFlow
          key={household}
          agentId={session.agent.id}
          projectId={session.agent.projectId}
          boundary={session.boundary}
          onNextHousehold={() => setHousehold((current) => current + 1)}
        />
      )}
    </FieldScreen>
  );
}
