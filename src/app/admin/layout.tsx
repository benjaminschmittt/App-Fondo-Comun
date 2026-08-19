import Link from "next/link";
import { requireAdmin } from "@/data/auth";
import { AppHeader } from "@/components/app-header";
import { C } from "@/lib/theme";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div style={{ background: C.surface, minHeight: "100vh" }}>
      <AppHeader nombre={user.email ?? ""} isAdmin />
      <div className="px-5 md:px-8 pt-4" style={{ maxWidth: 1160, margin: "0 auto" }}>
        <nav className="flex" style={{ gap: 4, borderBottom: `1px solid ${C.line}` }}>
          <Link
            href="/admin"
            style={{ padding: "10px 10px", fontSize: 13.5, color: C.ink, fontWeight: 600 }}
          >
            Clientes
          </Link>
          <Link
            href="/admin/importar"
            style={{ padding: "10px 10px", fontSize: 13.5, color: C.ink, fontWeight: 600 }}
          >
            Importar Excel
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
