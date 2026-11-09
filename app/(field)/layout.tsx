import { FieldShell } from "@/components/shells/FieldShell";

export default function FieldLayout({ children }: LayoutProps<"/">) {
  return <FieldShell>{children}</FieldShell>;
}
