import type { Metadata } from "next";
import { QueuePanel } from "@/components/field/QueuePanel";

export const metadata: Metadata = {
  title: "Queue",
};

/* The queue is entirely the device's: it reads IndexedDB and nothing else, so
   it renders with no connection at all. */
export default function QueuePage() {
  return <QueuePanel />;
}
