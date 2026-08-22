import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Fondo Privado — Portal de Clientes",
    template: "%s — Fondo Privado",
  },
  description: "Portal de clientes del fondo de inversion privado.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={cn("h-full antialiased", inter.variable)}>
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
