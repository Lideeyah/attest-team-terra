import { Lockup } from "@/components/Mark";
import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";

/* Deliberately clean: the mark, the form and nothing else. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
      <div className="auth-frame">
        <div className="auth-column stack-lg">
          <Lockup size={20} />
          {/* Wizard progress carries routeForward and routeBack, which is
              where a step moving forward differs from one going back. */}
          <RouteTransition>{children}</RouteTransition>
        </div>
      </div>
    </Surface>
  );
}
