import { PublicShell } from "@/components/shell";

export default function PublicRouteLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
