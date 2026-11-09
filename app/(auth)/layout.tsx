import { Lockup } from "@/components/Mark";

/* Deliberately clean: the mark, the form and nothing else. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="auth-frame">
      <div className="auth-column stack-lg">
        <Lockup size={20} />
        {children}
      </div>
    </div>
  );
}
