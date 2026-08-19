import { C } from "@/lib/theme";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ background: C.surface, minHeight: "100vh" }}>{children}</div>;
}
