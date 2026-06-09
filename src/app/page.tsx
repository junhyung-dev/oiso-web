import Link from "next/link";
import {
  Bot,
  Camera,
  ChevronRight,
  ImagePlus,
  LocateFixed,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  Sparkles,
  Store,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "AI 시장 지도",
    description:
      "사진과 위치 정보를 바탕으로 시장 곳곳의 가게와 장소를 한눈에 확인할 수 있어요.",
    icon: Map,
  },
  {
    title: "메뉴판 분석",
    description:
      "촬영한 메뉴판을 읽고 메뉴 이름과 가격을 보기 쉽게 정리해 줍니다.",
    icon: Camera,
  },
  {
    title: "주변 가게 탐색",
    description:
      "현재 위치나 관심 지점을 기준으로 가까운 가게와 관련 정보를 빠르게 찾습니다.",
    icon: LocateFixed,
  },
  {
    title: "대화형 시장 안내",
    description:
      "궁금한 내용을 편하게 물어보면 지도와 연결된 정보를 바탕으로 안내해 줍니다.",
    icon: Bot,
  },
];

const steps = [
  {
    title: "시장 정보를 확인해요",
    description: "지도를 둘러보거나 메뉴판 사진을 올려 시작합니다.",
  },
  {
    title: "OISO가 보기 쉽게 정리해요",
    description: "가게, 위치, 메뉴 정보를 필요한 형태로 묶어 보여줍니다.",
  },
  {
    title: "지도와 대화로 이어가요",
    description: "장소를 확인하고 궁금한 점은 채팅으로 바로 물어봅니다.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <Sparkles className="h-4 w-4" />
            </span>
            OISO
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex"
            aria-label="랜딩 섹션"
          >
            <a href="#about" className="transition-colors hover:text-foreground">
              서비스 소개
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              핵심 기능
            </a>
            <a href="#flow" className="transition-colors hover:text-foreground">
              사용 흐름
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden rounded-full sm:inline-flex"
            >
              <Link href="/map">지도 보기</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/login">로그인</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="landing-hero mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(430px,1fr)] lg:px-8 lg:py-28">
        <div>
          <h1 className="max-w-3xl break-words text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            전통시장을 더 쉽고 똑똑하게 탐색하는 방법
          </h1>
          <p className="mt-5 max-w-2xl break-words text-base leading-7 text-muted-foreground sm:text-lg">
            시장 사진과 위치 정보를 바탕으로 골목 속 가게를 찾고, 메뉴판과
            주변 정보는 OISO가 보기 쉽게 도와드려요.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-full px-6 text-base">
              <Link href="/login">
                로그인하고 시작하기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full px-6 text-base"
            >
              <Link href="/map">
                AI 지도 둘러보기
                <Map className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div
          className="relative min-h-[450px] overflow-hidden rounded-[34px] border bg-card/95 p-5 shadow-[0_24px_70px_rgba(31,41,55,0.12)] sm:min-h-[520px]"
          aria-label="OISO 지도와 채팅 기능 미리보기"
        >
          <div className="absolute inset-5 rounded-[28px] bg-primary-soft map-grid" />
          <div className="absolute left-9 top-9 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Navigation className="h-5 w-5" />
          </div>

          <div className="absolute left-[18%] top-[20%] flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-soft">
            <Store className="h-5 w-5" />
          </div>
          <div className="absolute right-[24%] top-[28%] flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-soft">
            <Utensils className="h-5 w-5" />
          </div>
          <div className="absolute bottom-[30%] left-[34%] flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft">
            <MapPin className="h-5 w-5" />
          </div>

          <div className="absolute right-7 top-11 w-[min(74%,320px)] rounded-3xl border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold">오늘의 추천 장소</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  현재 위치에서 가까운 시장 맛집
                </p>
              </div>
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 grid gap-2">
              {["초록분식", "시장국수", "오이소 카페"].map((name, index) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-2xl border bg-background p-2"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    {index === 1 ? (
                      <Utensils className="h-4 w-4" />
                    ) : (
                      <Store className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      도보 {4 + index * 2}분
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-9 left-7 w-[min(78%,330px)] rounded-3xl border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MessageCircle className="h-4 w-4" />
              </span>
              <p className="text-sm font-extrabold">무엇을 찾고 계신가요?</p>
            </div>
            <div className="mt-3 rounded-2xl bg-primary-soft px-3 py-2 text-sm font-semibold text-foreground">
              “근처에서 가볍게 먹을 만한 곳 추천해줘”
            </div>
            <div className="mt-2 rounded-2xl bg-background px-3 py-2 text-sm text-muted-foreground">
              가까운 가게와 메뉴 정보를 함께 보여드릴게요.
            </div>
          </div>

          <div className="absolute bottom-24 right-8 hidden w-[230px] rounded-3xl border bg-card p-3 shadow-soft sm:block">
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <ImagePlus className="h-4 w-4 text-primary" />
              메뉴판 분석
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2 text-xs font-semibold">
                <span>떡볶이</span>
                <span className="text-primary">5,000원</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background px-3 py-2 text-xs font-semibold">
                <span>순대</span>
                <span className="text-primary">4,000원</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="landing-reveal border-y bg-card">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center lg:px-8">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            시장 골목 속 정보가 지도와 대화로 이어집니다
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            OISO는 사진, 위치, 메뉴판처럼 흩어져 있는 시장 정보를 이해하고
            사용자가 필요한 장소와 메뉴를 더 빠르게 찾을 수 있도록 돕습니다.
          </p>
        </div>
      </section>

      <section
        id="features"
        className="landing-reveal mx-auto max-w-6xl px-4 py-24 lg:px-8"
      >
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold">시장 탐색을 쉽게 만드는 기능</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            지도, 메뉴판, 주변 가게, 채팅을 하나의 흐름으로 연결해 낯선
            시장에서도 필요한 정보를 놓치지 않게 도와줍니다.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-3xl border bg-card p-6 shadow-soft transition-transform duration-300 hover:-translate-y-1"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 break-words text-lg font-extrabold">
                  {feature.title}
                </h3>
                <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="flow" className="landing-reveal bg-card">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-extrabold">
                복잡한 시장도 자연스럽게 따라가요
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                처음 보는 시장에서도 확인하고, 이해하고, 물어보는 흐름이
                끊기지 않도록 구성했습니다.
              </p>
            </div>

            <div className="grid gap-4">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="grid gap-4 rounded-3xl border bg-background p-5 shadow-soft sm:grid-cols-[56px_minmax(0,1fr)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-reveal mx-auto max-w-6xl px-4 py-24 lg:px-8">
        <div className="rounded-[34px] border bg-primary-soft p-10 text-center shadow-soft sm:p-14">
          <h2 className="text-3xl font-extrabold">
            지금 바로 AI 시장 지도를 경험해보세요
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            숨은 맛집과 가게를 더 쉽게 찾고, 궁금한 정보는 대화로 간편하게
            확인할 수 있습니다.
          </p>
          <Button asChild className="mt-8 h-12 rounded-full px-7 text-base">
            <Link href="/login">
              로그인하고 시작하기
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
