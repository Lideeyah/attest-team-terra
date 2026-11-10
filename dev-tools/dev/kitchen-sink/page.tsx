import type { Metadata } from "next";
import { Surface } from "@/components/Surface";
import { KitchenSink } from "./KitchenSink";

export const metadata: Metadata = {
  title: "Component and motion reference",
  description:
    "Every component and every motion primitive in the Attest design system, shown at its real size with its real states.",
  robots: { index: false, follow: false },
};

export default function KitchenSinkPage() {
  return (
    <Surface>
      <KitchenSink />
    </Surface>
  );
}
