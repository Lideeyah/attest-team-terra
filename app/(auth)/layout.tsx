import { AccessFrame } from "@/components/auth/AccessFrame";
import { RouteTransition } from "@/components/RouteTransition";
import { Surface } from "@/components/Surface";

/* Deliberately clean: the mark, the form and nothing else. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Surface>
      <AccessFrame><RouteTransition>{children}</RouteTransition></AccessFrame>
    </Surface>
  );
}
