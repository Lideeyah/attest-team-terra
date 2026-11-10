import type { Metadata } from "next";
import { Suspense } from "react";
import { EnrolScreen } from "@/components/field/EnrolScreen";

export const metadata: Metadata = {
  title: "Enrol",
};

/* The capture flow renders from the device's cached session, so an agent with
   no connection opens the app and captures. That is the normal case. */
export default function EnrolPage() {
  return (
    <Suspense fallback={<p className="field-note">Opening the capture flow</p>}>
      <EnrolScreen />
    </Suspense>
  );
}
