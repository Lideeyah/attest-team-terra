import { DeveloperShell } from "@/components/shells/DeveloperShell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <DeveloperShell>{children}</DeveloperShell>;
}
