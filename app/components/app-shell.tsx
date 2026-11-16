"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, Boxes, Database, Gauge, LogOut, Menu, Moon, PlugZap, RadioTower, Settings, Sun, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { clearStored, readStored, THEME_KEY, TOKEN_KEY } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Button, Skeleton } from "@/components/ui/primitives";
import { Brand } from "@/components/brand";

const nav = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/gateways", label: "Gateways", icon: RadioTower },
  { href: "/sensors", label: "Sensors", icon: Activity },
  { href: "/device-types", label: "Device types", icon: Boxes },
  { href: "/data", label: "Readings", icon: Database },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/integrations", label: "Integrations", icon: PlugZap, adminOnly: true },
  { href: "/users", label: "People", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

function initials(name?: string) {
  return (name ?? "").split(" ").map(v => v[0]).join("").slice(0, 2).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [token, setToken] = useState<string | null>();
  useEffect(() => { const stored = readStored(TOKEN_KEY); setToken(stored); if (!stored) router.replace("/login"); }, [router]);
  const me = useQuery({ queryKey: ["me"], queryFn: api.me, enabled: Boolean(token) });
  // first login: no wandering off until the temporary password is changed
  useEffect(() => { if (me.data?.mustChangePassword && pathname !== "/onboarding") router.replace("/onboarding"); }, [me.data, pathname, router]);
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: api.alerts, enabled: Boolean(token), refetchInterval: 60_000 });
  const alertCount = alerts.data?.items.length ?? 0;
  // Light is the default; dark only when someone has chosen it with the moon button.
  useEffect(() => { const value = readStored(THEME_KEY) === "dark"; setDark(value); document.documentElement.classList.toggle("dark", value); document.documentElement.classList.toggle("light", !value); }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen]);

  function toggleTheme() { const next = !dark; setDark(next); localStorage.setItem(THEME_KEY, next ? "dark" : "light"); document.documentElement.classList.toggle("dark", next); document.documentElement.classList.toggle("light", !next); }
  async function logout() { await api.logout().catch(() => null); clearStored(TOKEN_KEY); router.replace("/login"); }
  if (!token) return null;

  const orgName = me.data?.orgName || "Your organization";
  const sidebar = <>
    <div className="flex h-[4.5rem] shrink-0 items-center gap-3 px-5">
      <Link href="/" onClick={() => setMobileOpen(false)} aria-label="LoRaWAN by Community Hub: overview" className="-m-1.5 rounded-xl p-1.5"><Brand/></Link>
      <Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X/></Button>
    </div>
    <p className="truncate px-6 pb-3 text-[0.9375rem] font-semibold text-pine lg:hidden">{orgName}</p>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Primary navigation">
      {nav.filter(item => !item.adminOnly || me.data?.role === "admin").map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined}
          className={cn("flex min-h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] font-semibold transition-colors", active ? "bg-field text-pine" : "text-muted hover:bg-field hover:text-pine")}>
          <Icon size={18} aria-hidden="true"/>{label}
          {label === "Alerts" && alertCount > 0 && <span className="ml-auto grid h-6 min-w-6 place-items-center rounded-full bg-danger px-1.5 text-xs font-semibold text-paper" aria-label={`${alertCount} open`}>{alertCount}</span>}
        </Link>;
      })}
    </nav>
    <div className="space-y-1 border-t border-line p-3">
      <Link href="/onboarding" onClick={() => setMobileOpen(false)} className="mb-2 flex items-start gap-3 rounded-[1rem] bg-field p-4 text-[0.875rem] leading-snug transition-colors hover:bg-lime-pale">
        <RadioTower size={18} className="mt-0.5 shrink-0 text-pine" aria-hidden="true"/>
        <span><span className="block font-semibold text-pine">Setup guide</span><span className="text-muted">Add a gateway or a sensor</span></span>
      </Link>
      <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-[0.9375rem] font-semibold text-muted transition-colors hover:bg-field hover:text-pine"><LogOut size={18} aria-hidden="true"/>Sign out</button>
    </div>
  </>;

  return <div className="min-h-screen bg-paper">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-paper lg:flex">{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <button className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_42%,transparent)]" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>
      <aside className="relative flex h-full w-[19rem] max-w-[86vw] flex-col bg-paper shadow-[0_28px_48px_-28px_rgb(18_58_41/.35)]">{sidebar}</aside>
    </div>}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper px-4 sm:px-6 lg:px-10">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu/></Button>
        <Link href="/" aria-label="LoRaWAN by Community Hub: overview" className="rounded-xl lg:hidden"><Brand compact/></Link>
        <p className="hidden min-w-0 truncate text-[0.9375rem] font-semibold text-pine lg:block">{orgName}</p>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label={dark ? "Use the light theme" : "Use the dark theme"} onClick={toggleTheme}>{dark ? <Sun/> : <Moon/>}</Button>
          <div className="hidden items-center gap-3 border-l border-line pl-4 sm:flex">
            {me.isLoading ? <Skeleton className="h-9 w-32"/> : <>
              <span className="grid size-9 place-items-center rounded-full bg-pine text-[0.8125rem] font-semibold text-paper" aria-hidden="true">{initials(me.data?.name)}</span>
              <span className="leading-tight"><span className="block text-[0.9375rem] font-semibold text-ink">{me.data?.name}</span><span className="block text-[0.8125rem] capitalize text-muted">{me.data?.role}</span></span>
            </>}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[80rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  </div>;
}
