import type { Metadata } from "next";
import { typeset } from "@/lib/fonts";
import { DevStates } from "./DevStates";

export const metadata: Metadata = {
  title: "State control — Attest",
  description:
    "Forces any contract error code on the next call, and configures the mock run stream.",
  robots: { index: false, follow: false },
};

export default function DevStatesPage() {
  return (
    <div className={typeset}>
      <DevStates />
    </div>
  );
}
