import type { ReactNode } from "react";

type RegisteredProps = {
  children: ReactNode;
  className?: string;
};

/** Printer's crop marks at opposite corners. Document surfaces and
    downloadable artifacts only, never an interactive control. */
export function Registered({ children, className }: RegisteredProps) {
  return (
    <div className={["registered", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
