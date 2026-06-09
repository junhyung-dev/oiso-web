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
      title: "좋아요",
      desc: isAuthenticated ? "저장한 장소와 콘텐츠" : "로그인 후 확인할 수 있어요",
    },
    {
      icon: MapPin,
      title: "방문 기록",
      desc: isAuthenticated ? "최근 이동과 방문 흐름" : "로그인 후 확인할 수 있어요",
    },
    {
      icon: RefreshCcw,
      title: "추천 관리",
      desc: isAuthenticated ? "내 취향에 맞춘 추천" : "로그인 후 확인할 수 있어요",
    },
  ];

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5 lg:px-8 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          계정 정보와 OISO 이용 내역을 확인합니다.
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
              <p className="truncate font-bold">{user?.name || "게스트"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.email || "로그인이 필요합니다"}
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
                  계정 새로고침
                </Button>
                <Button type="button" variant="outline" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">로그인</Link>
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
