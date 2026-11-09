"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { routeBack, routeForward } from "@/lib/motion";
import { useState, type ReactNode } from "react";

function depthOf(pathname: string): number {
  return pathname.split("/").filter(Boolean).length;
}

/** Shared-axis screen transition. Deeper moves forward, back reverses. */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const depth = depthOf(pathname);

  /* The axis is held in state and revised during render, so a route change
     fixes the direction before the transition commits. */
  const [axis, setAxis] = useState({ depth, direction: "forward" });
  if (axis.depth !== depth) {
    setAxis({
      depth,
      direction: depth < axis.depth ? "back" : "forward",
    });
  }
  const variants = axis.direction === "back" ? routeBack : routeForward;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.main
        key={pathname}
        variants={variants}
        initial="rest"
        animate="shown"
        exit="gone"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
