"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useIsPresent, type Variants } from "motion/react";
import { routeBack, routeForward } from "@/lib/motion";
import { forwardRef, useState, type ReactNode } from "react";

// Outgoing pages remain visible briefly, but must not expose a second set of
// interactive controls to keyboard users or assistive technology.
const TransitionScreen=forwardRef<HTMLElement,{children:ReactNode;variants:Variants}>(function TransitionScreen({children,variants},ref){
  const present=useIsPresent();
  return <motion.main ref={ref} variants={variants} initial="rest" animate="shown" exit="gone" aria-hidden={!present||undefined} inert={!present}>{children}</motion.main>;
});

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
      <TransitionScreen
        key={pathname}
        variants={variants}
      >
        {children}
      </TransitionScreen>
    </AnimatePresence>
  );
}
