import { DelegateShell } from "@/components/shell";

export default function DelegateLayout({ children }: { children: React.ReactNode }) {
  return <DelegateShell>{children}</DelegateShell>;
}
