import type { ReactNode } from "react";
import {headingFor} from "@/lib/copy/codes";
import type {ErrorCode} from "@/lib/api/contract";

type NoticeProps = {
  /** Omit the tone for the bottle-edged default. */
  tone?: "flagged" | "blocked" | "review";
  title: string;
  children: ReactNode;
};

export function Notice({ tone, title, children }: NoticeProps) {
  const heading=/^[A-Z][A-Z0-9_]+$/.test(title)&&title.includes('_')?headingFor(title as ErrorCode,'This action needs attention'):title;
  return (
    <div role={tone === "blocked" ? "alert" : "status"} className={["notice", tone ? `notice-${tone}` : null].filter(Boolean).join(" ")}>
      <p className="notice-title">{heading}</p>
      <div className="notice-body">{children}</div>
    </div>
  );
}
