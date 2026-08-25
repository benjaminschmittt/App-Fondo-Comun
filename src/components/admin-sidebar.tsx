"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  FileText,
  History,
  LineChart,
  LogOut,
  Percent,
  PieChart,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { logout } from "@/app/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Clientes", icon: Users },
  { href: "/admin/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/admin/posiciones", label: "Posiciones", icon: PieChart },
  { href: "/admin/valuaciones", label: "Valuaciones", icon: LineChart },
  { href: "/admin/importar", label: "Importar Excel", icon: UploadCloud },
  { href: "/admin/documentos", label: "Documentos", icon: FileText },
  { href: "/admin/comisiones", label: "Comisiones", icon: Percent },
  { href: "/admin/auditoria", label: "Auditoría", icon: History },
];

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentLabel =
    NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Panel Administrador";

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-gold">
              <span className="font-heading text-sm font-semibold text-gold-soft">
                F
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Fondo Privado
              </div>
              <div className="text-[10px] tracking-wider text-white/50 uppercase">
                Panel Administrador
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 px-3 pb-4">
          <div className="truncate px-1 text-xs text-white/50">{email}</div>
          <form action={logout}>
            <SidebarMenuButton
              type="submit"
              className="text-white/80 hover:text-white"
            >
              <LogOut />
              <span>Salir</span>
            </SidebarMenuButton>
          </form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold text-foreground">
            {currentLabel}
          </span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
