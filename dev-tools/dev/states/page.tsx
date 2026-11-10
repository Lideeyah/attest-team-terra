import type { Metadata } from "next";
import { Surface } from "@/components/Surface";
import { DevStates } from "./DevStates";

export const metadata: Metadata = {
  title: "State control — Attest",
  description:
    "Forces any contract error code on the next call, and configures the mock run stream.",
  robots: { index: false, follow: false },
};

export default function DevStatesPage() {
  return (
    <Surface>
      <DevStates />
    </Surface>
  );
}
