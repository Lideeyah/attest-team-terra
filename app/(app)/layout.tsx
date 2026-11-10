import { typeset } from "@/lib/fonts";
import { DeveloperShell } from "@/components/shells/DeveloperShell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={typeset}>
      <DeveloperShell>{children}</DeveloperShell>
    </div>
  );
}
