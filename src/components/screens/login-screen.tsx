"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Chrome, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function LoginScreen() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [idToken, setIdToken] = useState("");
  const [message, setMessage] = useState(
    googleClientId
      ? "Google 계정으로 로그인할 수 있습니다."
      : "NEXT_PUBLIC_GOOGLE_CLIENT_ID가 설정되면 Google 버튼이 활성화됩니다.",
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
      shape: "rectangular",
      text: "continue_with",
      width: 368,
    });
  }, [loginWithGoogleIdToken, scriptReady]);

  async function submitToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idToken.trim()) {
      setMessage("Google id_token을 입력하세요.");
      return;
    }

    try {
      await loginWithGoogleIdToken(idToken.trim());
      setMessage("로그인되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    }
  }

  return (
    <main className="grid min-h-dvh bg-background px-4 py-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:p-0">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <section className="hidden items-center justify-center bg-primary-soft p-10 lg:flex">
        <div className="max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-foreground">
            OISO
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            지도, 메뉴 번역, 챗봇, 개인화 추천을 같은 계정으로 이어서
            사용합니다.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[440px] flex-col justify-center">
        <div className="rounded-md border bg-card p-5 shadow-soft">
          <h2 className="text-2xl font-bold">Google 로그인</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Google에서 받은 id_token을 `/v1/auth/google/verify`로 검증하고,
            OISO JWT를 저장합니다.
          </p>

          <div className="mt-6">
            {googleClientId ? (
              <div
                ref={googleButtonRef}
                className="flex min-h-11 w-full items-center justify-center"
              />
            ) : (
              <Button type="button" variant="outline" className="w-full" disabled>
                <Chrome className="h-4 w-4" />
                Google Client ID 필요
              </Button>
            )}
          </div>

          <form className="mt-5 space-y-3 border-t pt-5" onSubmit={submitToken}>
            <Input
              value={idToken}
              onChange={(event) => setIdToken(event.target.value)}
              placeholder="개발용 Google id_token"
              aria-label="Google id_token"
              disabled={isLoading}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              토큰 검증
            </Button>
          </form>

          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
            {message}
          </p>
        </div>
      </section>
    </main>
  );
}
