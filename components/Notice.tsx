import type { ReactNode } from "react";

type NoticeProps = {
  /** Omit the tone for the bottle-edged default. */
  tone?: "flagged" | "blocked" | "review";
  title: string;
  children: ReactNode;
};

export function Notice({ tone, title, children }: NoticeProps) {
  return (
    <div className={["notice", tone ? `notice-${tone}` : null].filter(Boolean).join(" ")}>
      <p className="notice-title">{title}</p>
      <div className="notice-body">{children}</div>
    </div>
  );
}
