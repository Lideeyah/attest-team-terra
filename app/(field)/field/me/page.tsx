import type { Metadata } from "next";
import { MeScreen } from "@/components/field/MeScreen";

export const metadata: Metadata = {
  title: "Your record",
};

export default function MePage() {
  return <MeScreen />;
}
