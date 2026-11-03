import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEGA SORTE — Sua chance. Seu momento.",
  description:
    "Plataforma de campanhas promocionais com apuração transparente e auditável. Versão de demonstração.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("ms_session")?.value);
  let isAdmin = false;
  if (isLoggedIn) {
    try {
      const { getSession } = await import("@/lib/auth");
      isAdmin = Boolean((await getSession())?.isAdmin);
    } catch {
      isAdmin = false;
    }
  }

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
