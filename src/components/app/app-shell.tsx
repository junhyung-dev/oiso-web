"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Camera, LogIn, Map, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const navItems = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/pic-order", label: "Pic & Order", icon: Camera },
  { href: "/chatbot", label: "Chatbot", icon: Bot },
  { href: "/setting", label: "Setting", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, user } = useAuth();
  const accountHref = status === "authenticated" ? "/setting" : "/login";
  const accountLabel = status === "authenticated" ? "Account" : "Login";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-[72px] border-r bg-card lg:flex lg:flex-col lg:items-center">
        <Link
          href="/map"
          aria-label="OISO home"
          className="mt-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft"
        >
          <Sparkles className="h-5 w-5" />
        </Link>

        <nav className="mt-7 flex w-full flex-1 flex-col items-center gap-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>

        <Link
          href={accountHref}
          aria-label={accountLabel}
          title={accountLabel}
          className="mb-4 flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {user?.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
        </Link>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Link href="/map" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          OISO
        </Link>
        <Link
          href={accountHref}
          aria-label={accountLabel}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-card"
        >
          {user?.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
        </Link>
      </header>

      <main className="pb-20 lg:ml-[72px] lg:pb-0">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid h-16 grid-cols-4 border-t bg-card/95 px-2 backdrop-blur lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
