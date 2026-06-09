"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Chrome, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function LoginScreen() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [message, setMessage] = useState(
    googleClientId
      ? "Google 계정으로 계속 진행하세요."
      : "로그인을 준비하는 중입니다. 잠시 후 다시 시도해 주세요.",
  );
  const { loginWithGoogleIdToken, status, user } = useAuth();
  const isLoading = status === "loading";

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace("/map");
    }
  }, [router, status, user]);

  useEffect(() => {
    if (!scriptReady || !googleClientId || !googleButtonRef.current) return;
    if (!window.google?.accounts?.id) return;

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      cancel_on_tap_outside: true,
      callback: async (response) => {
        if (!response.credential) {
          setMessage("Google credential을 받지 못했습니다.");
          return;
        }

        try {
          await loginWithGoogleIdToken(response.credential);
          setMessage("로그인되었습니다.");
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "로그인에 실패했습니다.",
          );
        }
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "pill",
      text: "continue_with",
      width: 368,
    });
  }, [loginWithGoogleIdToken, scriptReady]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <section className="w-full max-w-[420px]">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-normal">OISO</h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            여행 중 필요한 순간을 더 가볍게 이어가세요.
          </p>
        </div>

        <div className="rounded-[28px] border bg-card p-6 shadow-soft">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold">로그인</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Google 계정으로 OISO를 시작합니다.
            </p>
          </div>

          <div className="mt-7">
            {googleClientId ? (
              <div
                ref={googleButtonRef}
                className="flex min-h-11 w-full items-center justify-center"
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-full"
                disabled
              >
                <Chrome className="h-4 w-4" />
                Google 로그인 준비 중
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-primary-soft px-3 py-3 text-sm font-bold text-primary">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              로그인 상태를 확인하는 중입니다.
            </div>
          ) : null}

          <p className="mt-5 rounded-2xl bg-muted px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
            {message}
          </p>
        </div>
      </section>
    </main>
  );
}
