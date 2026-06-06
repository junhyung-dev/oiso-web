"use client";

import Link from "next/link";
import { Heart, LogOut, MapPin, RefreshCcw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export function SettingScreen() {
  const { status, user, logout, refreshMe } = useAuth();
  const isAuthenticated = status === "authenticated";

  const settingItems = [
    {
      icon: Heart,
      title: "Likes",
      desc: isAuthenticated ? "/v1/px/get_likes" : "Login required",
    },
    {
      icon: MapPin,
      title: "Visits",
      desc: isAuthenticated ? "/v1/px/set_goto based history" : "Login required",
    },
    {
      icon: RefreshCcw,
      title: "Recommendations",
      desc: isAuthenticated ? "/v1/px/get_recommendation" : "Login required",
    },
  ];

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5 lg:px-8 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold">Setting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, likes, visit history, and recommendations.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-md border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-primary-soft text-primary">
              {user?.picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{user?.name || "Guest"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.email || "Login is required"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshMe()}
                >
                  Refresh account
                </Button>
                <Button type="button" variant="outline" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Log out
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {settingItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                className="rounded-md border bg-card p-4 text-left shadow-soft transition-colors hover:bg-primary-soft"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="mt-3 block font-bold">{item.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
