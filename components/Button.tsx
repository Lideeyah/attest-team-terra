import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

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
};

export function Button({
  variant = "solid",
  small = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classesFor(variant, small, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  small?: boolean;
  children: ReactNode;
};

export function ButtonLink({
  href,
  variant = "solid",
  small = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} className={classesFor(variant, small, className)} {...rest}>
      {children}
    </Link>
  );
}
