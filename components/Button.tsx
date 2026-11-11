import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import {LinkFeedback} from "@/components/LinkFeedback";

type Variant = "solid" | "outline" | "quiet";

const CLASS: Record<Variant, string> = {
  solid: "btn",
  outline: "btn-outline",
  quiet: "btn-quiet",
};

function classesFor(variant: Variant, small: boolean, extra?: string): string {
  return [CLASS[variant], small ? "btn-sm" : null, extra]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  small?: boolean;
  children: ReactNode;
  pending?: boolean;
};

export function Button({
  variant = "solid",
  small = false,
  className,
  children,
  type = "button",
  pending = false,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classesFor(variant, small, className)}
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || rest["aria-busy"] || undefined}
    >
      {pending ? <span className="busy-spinner" aria-hidden="true"/> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  small?: boolean;
  /** A route a later phase builds is not prefetched, because a prefetch of a
      route that is not there is a console error rather than a faster load. */
  prefetch?: boolean;
  children: ReactNode;
};

export function ButtonLink({
  href,
  variant = "solid",
  small = false,
  prefetch,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={classesFor(variant, small, className)}
      {...rest}
    >
      {children}<LinkFeedback/>
    </Link>
  );
}
