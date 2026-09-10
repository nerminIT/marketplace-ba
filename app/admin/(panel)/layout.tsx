import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { canAccess, getSession, ROLE_LABELS } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Administracija", template: "%s | Administracija" },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `proxy.ts` vec cuva ove rute, ali provjera se ponavlja i ovdje:
  // proxy zna samo je li kolacic ispravan, a ovdje imamo pravog korisnika.
  const user = await getSession();
  if (!user) redirect("/admin/login");

  const settings = await getSettings();

  // Meni prikazuje samo ono sto uloga smije otvoriti.
  const nav = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(user.role, item.area)),
  })).filter((group) => group.items.length > 0);

  return (
    <AdminShell
      nav={nav}
      siteName={settings.site.name}
      user={{
        name: user.name,
        email: user.email,
        roleLabel: ROLE_LABELS[user.role] ?? user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
