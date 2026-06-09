"use client";

import Link from "next/link";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useAuth } from "@/providers/auth-provider";

type AuthStatus = ReturnType<typeof useAuth>["status"];

export function AuthRequiredCard({
  status,
  title = "로그인이 필요합니다",
  description = "OISO의 맞춤 기능을 이용하려면 먼저 로그인해 주세요.",
  compact = false,
}: {
  status: AuthStatus;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  if (status === "loading") {
    return (
      <div className="rounded-md border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Checking session
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-4 shadow-soft">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
          {!compact ? (
            <Button asChild className="mt-3">
              <Link href="/login">로그인</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
