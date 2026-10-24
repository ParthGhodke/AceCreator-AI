"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  CalendarDays,
  Camera,
  Compass,
  LayoutDashboard,
  LogIn,
  LogOut,
  Sparkles,
  UserCog,
  WandSparkles,
} from "lucide-react";

import { getCurrentUser, logoutUser, type AuthUser } from "@/lib/api";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Command Center",
    shortLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/strategy",
    label: "AI Strategy",
    shortLabel: "Strategy",
    icon: Compass,
  },
  {
    href: "/studio",
    label: "Content Studio",
    shortLabel: "Studio",
    icon: WandSparkles,
  },
  {
    href: "/calendar",
    label: "Content Calendar",
    shortLabel: "Calendar",
    icon: CalendarDays,
  },
  {
    href: "/analytics",
    label: "IG Analytics",
    shortLabel: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/manager",
    label: "AI Manager",
    shortLabel: "Manager",
    icon: Brain,
  },
] as const;

type AppShellProps = {
  children: React.ReactNode;
  creatorName?: string;
  instagramHandle?: string;
};

export function AppShell({
  children,
  creatorName,
  instagramHandle,
}: AppShellProps) {
  const pathname = usePathname();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAuthUser(user))
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    await logoutUser();
    setAuthUser(null);
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Persistent Y2K Glassmorphic Left Dock */}
      <aside
        aria-label="Primary workspace navigation"
        className="y2k-glass-panel fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-border px-4 py-6 lg:flex"
      >
        <div>
          {/* Brand Header */}
          <Link
            href="/"
            className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition hover:border-blue-500/40"
          >
            <div className="flex items-center gap-3">
              <div className="y2k-cobalt-button flex h-9 w-9 items-center justify-center rounded-xl">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-white">
                  AceCreator{" "}
                  <span className="y2k-iridescent-text font-extrabold">AI</span>
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  IG STUDIO OS v0.5
                </p>
              </div>
            </div>
          </Link>

          {/* Instagram Focus Pill */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
              <Camera className="h-3.5 w-3.5 text-[#CCFF00]" />
              {instagramHandle ? instagramHandle : "Instagram Mode"}
            </span>
            <span className="y2k-acid-badge rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold">
              IG ONLY
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            <p className="px-3 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Growth Loop
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "y2k-iridescent-border text-white shadow-sm"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive
                          ? "text-[#CCFF00]"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#CCFF00] shadow-[0_0_8px_#CCFF00]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Creator & Auth Session Card */}
        <div className="space-y-2 border-t border-border pt-4">
          {(creatorName || authUser) && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {authUser ? "Authenticated Studio" : "Active Creator"}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">
                {creatorName || authUser?.full_name}
              </p>
              {authUser && (
                <p className="truncate font-mono text-[10px] text-blue-400">
                  {authUser.email}
                </p>
              )}
            </div>
          )}

          <Link
            href="/onboarding"
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              pathname === "/onboarding"
                ? "y2k-iridescent-border text-white"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            <UserCog className="h-4 w-4 text-blue-400" />
            Creator Profile Setup
          </Link>

          {authUser ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-xs font-medium text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4 text-rose-400" />
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
            >
              <LogIn className="h-4 w-4 text-[#CCFF00]" />
              Sign In / Register
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="y2k-glass-panel sticky top-0 z-30 flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="y2k-cobalt-button flex h-8 w-8 items-center justify-center rounded-xl">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            AceCreator{" "}
            <span className="y2k-iridescent-text font-extrabold">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/onboarding"
            className="y2k-chrome-pill inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200"
          >
            <UserCog className="h-3.5 w-3.5 text-blue-400" />
            Profile
          </Link>
          {authUser ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="y2k-chrome-pill inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href="/login"
              className="y2k-chrome-pill inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#CCFF00]"
            >
              <LogIn className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="pb-24 lg:pl-64 lg:pb-12">{children}</div>

      {/* Mobile Bottom Frosted Navigation Bar */}
      <nav
        aria-label="Mobile workspace navigation"
        className="y2k-glass-panel fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border px-1 py-1.5 lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition ${
                isActive
                  ? "bg-blue-600/20 text-[#CCFF00]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
