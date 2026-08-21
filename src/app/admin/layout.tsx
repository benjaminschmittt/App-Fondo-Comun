import { requireAdmin } from "@/data/auth";
import { AdminShell } from "@/components/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <AdminShell email={user.email ?? ""}>
      <div className="mx-auto max-w-[1160px] px-5 py-6 md:px-8">{children}</div>
    </AdminShell>
  );
}
