"use client";

import { useState } from "react";
import { Bot, ImagePlus, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const messages = [
  {
    role: "assistant",
    text: "안녕하세요. 메뉴 번역, 주변 장소 추천, 사진 기반 주문을 도와드릴게요.",
  },
  {
    role: "user",
    text: "근처에서 혼밥하기 좋은 곳 추천해줘.",
  },
];

export function ChatbotScreen() {
  const [draft, setDraft] = useState("");

  return (
    <section className="grid min-h-[calc(100dvh-3.5rem)] bg-background lg:min-h-dvh lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="hidden border-r bg-card p-4 lg:block">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Chatbot</h1>
          <Button size="sm" variant="outline">
            새 대화
          </Button>
        </div>
        <div className="mt-5 space-y-2">
          {["메뉴 번역", "주변 맛집 추천", "시장국수 상세"].map((title) => (
            <button
              key={title}
              type="button"
              className="w-full rounded-md border bg-background p-3 text-left text-sm font-semibold hover:bg-primary-soft"
            >
              {title}
              <span className="mt-1 block text-xs font-medium text-muted-foreground">
                `/v1/ax/get_chat_context`
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b bg-card px-4 py-3">
          <h1 className="text-lg font-bold lg:hidden">Chatbot</h1>
          <p className="text-sm text-muted-foreground">
            `stream_chat_v3`는 fetch + ReadableStream으로 연결됩니다.
          </p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 lg:px-8">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </span>
                )}
                <div
                  className={`max-w-[760px] rounded-md border px-4 py-3 text-sm leading-6 ${
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground"
                  }`}
                >
                  {message.text}
                </div>
                {isUser && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-primary">
                    <UserRound className="h-4 w-4" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <form
          className="border-t bg-card p-3 lg:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setDraft("");
          }}
        >
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="이미지 첨부"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="메시지를 입력하세요"
              aria-label="채팅 메시지"
            />
            <Button type="submit" size="icon" aria-label="전송">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
