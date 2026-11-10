import { Lockup } from "@/components/Mark";
import { Surface } from "@/components/Surface";

/* Deliberately clean: the mark, the form and nothing else. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
      <div className="auth-frame">
        <div className="auth-column stack-lg">
          <Lockup size={20} />
          {children}
        </div>
      </div>
    </Surface>
  );
}
