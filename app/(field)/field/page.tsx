import type { Metadata } from "next";
import { FieldHomeScreen } from "@/components/field/FieldHomeScreen";

export const metadata: Metadata = {
  title: "Today",
};

/* Rendered on the device, not on the server: this screen has to open in a
   village with no signal. */
export default function FieldHome() {
  return <FieldHomeScreen />;
}
