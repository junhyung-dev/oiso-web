"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  Clock,
  ExternalLink,
  ImageIcon,
  ImagePlus,
  Loader2,
  MapPin,
  MapPinned,
  MessageSquarePlus,
  PanelLeft,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteChatHistory,
  getChatContext,
  getChatHistoryList,
  uploadChatAttachment,
} from "@/lib/api/ax";
import { streamChatV3 } from "@/lib/api/stream-chat";
import type {
  ChatAttachment,
  ChatContextTimelineItem,
  MenuInformation,
  StreamChatEvent,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type ChatRole = "user" | "assistant" | "event";
type ChatStatus = "completed" | "streaming" | "failed";

type UiEvent =
  | {
      id: string;
      type: "attachments";
      attachments: ChatAttachment[];
    }
  | {
      id: string;
      type: "menu_ocr_result";
      menus: MenuInformation[];
      originalLanguage?: string | null;
    }
  | {
      id: string;
      type: "nearby_stores_result";
      stores: NearbyStore[];
    }
  | {
      id: string;
      type: "object_candidates_result";
      candidates: ObjectCandidate[];
      query?: string | null;
    };

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status: ChatStatus;
  createdAt: string;
  attachments?: ChatAttachment[];
  attachmentPreviews?: string[];
  events?: UiEvent[];
};

type PendingAttachment = {
  id: string;
  file: File;
  previewUrl: string;
};

type NearbyStore = {
  cluster_no?: number | null;
  cluster_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  tags?: string[] | null;
  thumbnail_url?: string | null;
};

type ObjectCandidate = {
  candidate_id?: string | null;
  display_name?: string | null;
  query_tag?: string | null;
  matched_db_tag?: string | null;
  is_db_supported?: boolean | null;
  confidence?: number | null;
  reason?: string | null;
  thumbnail_url?: string | null;
};

const DEFAULT_POSITION = { lat: 35.889, lng: 128.612 };
const USER_LANGUAGE = "Korean";
const FALLBACK_CHAT_TITLES: Record<string, string> = {
  Korean: "새 대화",
  English: "New chat",
  Japanese: "新しいチャット",
};

function getFallbackChatTitle(language = USER_LANGUAGE) {
  return FALLBACK_CHAT_TITLES[language] || FALLBACK_CHAT_TITLES.Korean;
}

function normalizeChatTitle(title?: string | null) {
  const trimmed = title?.trim();
  return trimmed || getFallbackChatTitle();
}

function getStoreKey(store: NearbyStore, index: number) {
  return String(store.cluster_no ?? `${store.cluster_name || "store"}-${index}`);
}

function getStoreDisplayName(store: NearbyStore, index: number) {
  return store.cluster_name?.trim() || `추천 장소 ${index + 1}`;
}

function getMapHref(store: NearbyStore) {
  const params = new URLSearchParams();
  if (store.cluster_no !== undefined && store.cluster_no !== null) {
    params.set("cluster_no", String(store.cluster_no));
  }
  if (store.latitude !== undefined && store.latitude !== null) {
    params.set("lat", String(store.latitude));
  }
  if (store.longitude !== undefined && store.longitude !== null) {
    params.set("lng", String(store.longitude));
  }
  if (store.cluster_name) params.set("name", store.cluster_name);
  if (store.thumbnail_url) params.set("thumbnail_url", store.thumbnail_url);
  if (store.distance_km !== undefined && store.distance_km !== null) {
    params.set("distance_km", String(store.distance_km));
  }
  if (store.tags?.length) params.set("tags", store.tags.join(","));

  const query = params.toString();
  return query ? `/map?${query}` : "/map";
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createThreadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function payloadToEvent(item: ChatContextTimelineItem): UiEvent | null {
  const payload = item.payload as Record<string, unknown> | null;
  const type = item.type || (payload?.type as string | undefined);

  if (type === "attachments") {
    const attachments = payload?.attachments as ChatAttachment[] | undefined;
    return {
      id: createId("event"),
      type: "attachments",
      attachments: attachments || [],
    };
  }

  if (type === "menu_ocr_result") {
    const ocr = payload?.ocr_structure as
      | { menus?: MenuInformation[]; original_language?: string }
      | undefined;
    return {
      id: createId("event"),
      type: "menu_ocr_result",
      menus: ocr?.menus || [],
      originalLanguage: ocr?.original_language || null,
    };
  }

  if (type === "nearby_stores_result") {
    const data = payload?.data as { results?: NearbyStore[] } | undefined;
    return {
      id: createId("event"),
      type: "nearby_stores_result",
      stores: data?.results || [],
    };
  }

  if (type === "object_candidates_result") {
    const data = payload?.data as
      | { candidates?: ObjectCandidate[]; query?: string }
      | undefined;
    return {
      id: createId("event"),
      type: "object_candidates_result",
      candidates: data?.candidates || [],
      query: data?.query || null,
    };
  }

  return null;
}

function timelineToMessages(timeline: ChatContextTimelineItem[]) {
  return [...timeline]
    .sort((a, b) => a.seq - b.seq)
    .flatMap<ChatMessage>((item) => {
      if (item.kind === "message") {
        return [
          {
            id: createId("message"),
            role: item.role === "user" ? "user" : "assistant",
            content: item.content || "",
            status: item.status === "failed" ? "failed" : "completed",
            createdAt: item.created_at,
          },
        ];
      }

      const event = payloadToEvent(item);
      if (!event) return [];
      return [
        {
          id: createId("event-message"),
          role: "event",
          content: "",
          status: "completed",
          createdAt: item.created_at,
          events: [event],
        },
      ];
    });
}

function ChatEventCard({
  event,
  onCandidateSelect,
}: {
  event: UiEvent;
  onCandidateSelect: (candidate: ObjectCandidate) => void;
}) {
  const [expandedStoreKey, setExpandedStoreKey] = useState<string | null>(null);

  if (event.type === "attachments") {
    return (
      <div className="rounded-md border bg-card p-3">
        <p className="text-sm font-extrabold text-foreground">첨부 이미지</p>
        {event.attachments.length === 0 ? (
          <p className="mt-3 rounded-md bg-background px-3 py-2 text-sm text-muted-foreground">
            첨부된 이미지가 없습니다.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {event.attachments.map((attachment, index) => (
            <div
              key={attachment.attachment_id || `${attachment.url}-${index}`}
              className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border bg-background text-muted-foreground"
            >
              {attachment.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (event.type === "menu_ocr_result") {
    return (
      <div className="rounded-md border bg-primary-soft p-3">
        <p className="text-sm font-extrabold text-primary">메뉴 인식 결과</p>
        {event.originalLanguage ? (
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            원문 언어: {event.originalLanguage}
          </p>
        ) : null}
        {event.menus.length === 0 ? (
          <p className="mt-3 rounded-md bg-card px-3 py-2 text-sm text-muted-foreground">
            인식된 메뉴가 없습니다.
          </p>
        ) : null}
        <div className="mt-3 space-y-2">
          {event.menus.slice(0, 6).map((menu) => (
            <div
              key={`${menu.number}-${menu.text_in_user_language}`}
              className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm"
            >
              <div>
                <p className="font-bold text-foreground">
                  {menu.text_in_user_language}
                </p>
                <p className="text-xs text-muted-foreground">
                  {menu.text_in_original_language}
                </p>
              </div>
              <span className="font-bold text-primary">
                {menu.price.toLocaleString("ko-KR")}원
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (event.type === "nearby_stores_result") {
    return (
      <div className="rounded-md border bg-card p-3">
        <p className="text-sm font-extrabold text-foreground">근처 추천 장소</p>
        {event.stores.length === 0 ? (
          <p className="mt-3 rounded-md bg-background px-3 py-2 text-sm text-muted-foreground">
            추천 장소 결과가 없습니다.
          </p>
        ) : null}
        <div className="mt-3 grid gap-2">
          {event.stores.slice(0, 4).map((store, index) => {
            const storeKey = getStoreKey(store, index);
            const isExpanded = expandedStoreKey === storeKey;
            const displayName = getStoreDisplayName(store, index);

            return (
              <div key={storeKey} className="rounded-md border bg-background">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStoreKey((current) =>
                      current === storeKey ? null : storeKey,
                    )
                  }
                  className="flex w-full gap-3 rounded-md p-2 text-left hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#dfeee7] text-primary">
                    {store.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <MapPin className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {displayName}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {store.distance_km !== undefined && store.distance_km !== null
                        ? `${store.distance_km.toFixed(1)} km`
                        : "근처"}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {(store.tags || []).join(", ") || "추천 장소 상세를 확인해 보세요."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-sm bg-primary-soft px-2 py-1 text-xs font-bold text-primary">
                    {isExpanded ? "접기" : "상세정보 보기"}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="border-t px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(store.tags || []).slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-sm bg-primary-soft px-2 py-1 text-xs font-bold text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-1.5 text-xs font-semibold text-muted-foreground">
                      <p>
                        {store.latitude !== undefined && store.latitude !== null
                          ? `${store.latitude.toFixed(5)}, ${
                              store.longitude?.toFixed(5) ?? "-"
                            }`
                          : "위치 정보 확인이 필요합니다."}
                      </p>
                      <p>
                        {store.cluster_no !== undefined && store.cluster_no !== null
                          ? `클러스터 #${store.cluster_no}`
                          : "지도에서 주변 장소로 확인할 수 있습니다."}
                      </p>
                    </div>
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link href={getMapHref(store)}>
                        <MapPinned className="h-4 w-4" />
                        지도에서 보기
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-sm font-extrabold text-foreground">
        비슷한 후보를 찾았습니다
      </p>
      {event.query ? (
        <p className="mt-1 text-xs text-muted-foreground">검색어: {event.query}</p>
      ) : null}
      {event.candidates.length === 0 ? (
        <p className="mt-3 rounded-md bg-background px-3 py-2 text-sm text-muted-foreground">
          선택할 후보가 없습니다.
        </p>
      ) : null}
      <div className="mt-3 grid gap-2">
        {event.candidates.slice(0, 8).map((candidate, index) => (
          <button
            key={candidate.candidate_id || `${candidate.display_name}-${index}`}
            type="button"
            onClick={() => onCandidateSelect(candidate)}
            className="flex items-center gap-3 rounded-md border bg-background p-2 text-left hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#dfeee7] text-primary">
              {candidate.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={candidate.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {candidate.display_name || candidate.query_tag || "후보"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {candidate.reason || candidate.matched_db_tag || "후보를 선택해 이어서 질문할 수 있습니다."}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {candidate.is_db_supported === false ? "DB 미지원" : "DB 지원"}
              </p>
            </div>
            {typeof candidate.confidence === "number" ? (
              <span className="rounded-sm bg-primary-soft px-2 py-1 text-xs font-bold text-primary">
                {Math.round(candidate.confidence * 100)}%
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatbotScreen() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threadId, setThreadId] = useState(() => createThreadId());
  const [chatTitle, setChatTitle] = useState(getFallbackChatTitle());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>(
    [],
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [historyItems, setHistoryItems] = useState<
    NonNullable<Awaited<ReturnType<typeof getChatHistoryList>>["history"]>
  >([]);
  const [historyCursor, setHistoryCursor] = useState<string | undefined>();

  const historyQuery = useQuery({
    queryKey: ["chat-history", historyCursor],
    queryFn: () =>
      getChatHistoryList({
        recent_chat_receive_counts: 20,
        starting_timestamp: historyCursor,
      }),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((result) => {
      setPosition({
        lat: result.coords.latitude,
        lng: result.coords.longitude,
      });
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setHistoryItems([]);
      setHistoryCursor(undefined);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const nextHistory = historyQuery.data?.history;
    if (!nextHistory) return;

    setHistoryItems((current) => {
      if (!historyCursor) return nextHistory;

      const seen = new Set(current.map((item) => item.chat_id));
      return [
        ...current,
        ...nextHistory.filter((item) => !seen.has(item.chat_id)),
      ];
    });
  }, [historyCursor, historyQuery.data?.history]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      pendingAttachmentsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, []);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  const hasMessages = messages.length > 0;

  const selectedHistoryId = useMemo(() => {
    return historyItems.find((item) => item.langgraph_thread_id === threadId)?.chat_id;
  }, [historyItems, threadId]);

  function startNewChat() {
    abortControllerRef.current?.abort();
    pendingAttachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setThreadId(createThreadId());
    setChatTitle(getFallbackChatTitle());
    setMessages([]);
    setDraft("");
    setPendingAttachments([]);
    setIsStreaming(false);
  }

  async function restoreChat(chatId: string) {
    if (isStreaming) return;
    setIsRestoring(true);
    setHistoryError(null);
    try {
      const context = await getChatContext(chatId);
      setThreadId(context.langgraph_thread_id);
      setChatTitle(normalizeChatTitle(context.title));
      setMessages(timelineToMessages(context.timeline));
      setDraft("");
      setPendingAttachments([]);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "대화 내용을 불러오지 못했습니다.",
      );
    } finally {
      setIsRestoring(false);
    }
  }

  async function removeHistory(chatId: string) {
    if (isStreaming || deletingChatId) return;

    setDeletingChatId(chatId);
    setHistoryError(null);
    try {
      const response = await deleteChatHistory(chatId);
      setHistoryItems((current) =>
        current.filter((item) => item.chat_id !== response.chat_id),
      );
      void queryClient.invalidateQueries({ queryKey: ["chat-history"] });

      if (selectedHistoryId === response.chat_id) {
        startNewChat();
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "대화를 삭제하지 못했습니다.",
      );
    } finally {
      setDeletingChatId(null);
    }
  }

  function onAttachChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!files.length) return;
    setUploadError(null);

    setPendingAttachments((current) => [
      ...current,
      ...files.slice(0, 4).map((file) => ({
        id: createId("attachment"),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    event.target.value = "";
  }

  function removeAttachment(id: string) {
    setPendingAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  const appendAssistantEvent = useCallback((assistantId: string, event: UiEvent) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              events: [...(message.events || []), event],
            }
          : message,
      ),
    );
  }, []);

  const handleStreamEvent = useCallback(
    (assistantId: string, event: StreamChatEvent) => {
      if (event.type === "token") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: `${message.content}${event.delta}`,
                }
              : message,
          ),
        );
        return;
      }

      if (event.type === "menu_ocr_result") {
        const ocr = event.ocr_structure as {
          menus?: MenuInformation[];
          original_language?: string;
        };
        appendAssistantEvent(assistantId, {
          id: createId("event"),
          type: "menu_ocr_result",
          menus: ocr.menus || [],
          originalLanguage: ocr.original_language || null,
        });
        return;
      }

      if (event.type === "nearby_stores_result") {
        const data = event.data as { results?: NearbyStore[] };
        appendAssistantEvent(assistantId, {
          id: createId("event"),
          type: "nearby_stores_result",
          stores: data.results || [],
        });
        return;
      }

      if (event.type === "object_candidates_result") {
        const data = event.data as {
          candidates?: ObjectCandidate[];
          query?: string;
        };
        appendAssistantEvent(assistantId, {
          id: createId("event"),
          type: "object_candidates_result",
          candidates: data.candidates || [],
          query: data.query || null,
        });
        return;
      }

      if (event.type === "title_update") {
        const nextTitle = normalizeChatTitle(event.chat_title);
        setChatTitle(nextTitle);
        setHistoryItems((current) =>
          current.map((item) =>
            item.langgraph_thread_id === threadId
              ? { ...item, chat_title: nextTitle }
              : item,
          ),
        );
        void queryClient.invalidateQueries({ queryKey: ["chat-history"] });
        return;
      }

      if (event.type === "error") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content:
                    message.content ||
                    `응답 중 오류가 발생했습니다. ${event.message}`,
                  status: "failed",
                }
              : message,
          ),
        );
        return;
      }

      if (event.type === "done") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  status: message.status === "failed" ? "failed" : "completed",
                }
              : message,
          ),
        );
      }
    },
    [appendAssistantEvent, queryClient, threadId],
  );

  async function sendMessage(messageOverride?: string) {
    if (!isAuthenticated || isStreaming) return;

    const text = (messageOverride ?? draft).trim();
    if (!text && pendingAttachments.length === 0) return;
    setUploadError(null);

    const localAttachments = pendingAttachments;
    const attachmentPreviews = localAttachments.map((item) => item.previewUrl);
    const userMessage: ChatMessage = {
      id: createId("user-message"),
      role: "user",
      content: text || "이미지를 보냈습니다.",
      status: "completed",
      createdAt: new Date().toISOString(),
      attachmentPreviews,
    };
    const assistantId = createId("assistant-message");
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "streaming",
      createdAt: new Date().toISOString(),
      events: [],
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft("");
    setPendingAttachments([]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let receivedStreamEvent = false;
    let streamTimedOut = false;
    const firstEventTimeout = window.setTimeout(() => {
      streamTimedOut = true;
      controller.abort();
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  "응답 대기 시간이 길어지고 있습니다. 백엔드 스트림이 첫 이벤트를 보내지 못했습니다.",
                status: "failed",
              }
            : message,
        ),
      );
    }, 45000);

    try {
      let uploadedAttachments: ChatAttachment[] = [];

      if (localAttachments.length > 0) {
        try {
          uploadedAttachments = await Promise.all(
            localAttachments.map((item) =>
              uploadChatAttachment(item.file, threadId).then(
                (response) => response.attachment,
              ),
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? `이미지 업로드에 실패했습니다. ${error.message}`
              : "이미지 업로드에 실패했습니다. 파일을 다시 선택해 주세요.";
          setUploadError(message);
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    content: message,
                    status: "failed",
                  }
                : item,
            ),
          );
          return;
        }
      }

      await streamChatV3({
        payload: {
          uuid: threadId,
          user_added_message: userMessage.content,
          user_language: USER_LANGUAGE,
          client_lat: position.lat,
          client_lng: position.lng,
          attachments: uploadedAttachments,
        },
        signal: controller.signal,
        onEvent: (event) => {
          receivedStreamEvent = true;
          window.clearTimeout(firstEventTimeout);
          handleStreamEvent(assistantId, event);
        },
      });

      window.clearTimeout(firstEventTimeout);
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== assistantId) return message;
          if (message.status !== "streaming") return message;

          return {
            ...message,
            content:
              message.content ||
              (receivedStreamEvent
                ? ""
                : "스트림이 종료되었지만 표시할 응답 이벤트가 없습니다."),
            status: receivedStreamEvent ? "completed" : "failed",
          };
        }),
      );

      void queryClient.invalidateQueries({ queryKey: ["chat-history"] });
    } catch (error) {
      window.clearTimeout(firstEventTimeout);
      if (streamTimedOut) return;
      if (controller.signal.aborted && !streamTimedOut) return;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  error instanceof Error
                    ? error.message
                    : "응답을 불러오지 못했습니다.",
                status: "failed",
              }
            : message,
        ),
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      localAttachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function stopStreaming() {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }

  function sendCandidate(candidate: ObjectCandidate) {
    const name = candidate.display_name || candidate.query_tag || "선택한 후보";
    void sendMessage(`선택한 객체: ${name}. 근처 추천해줘`);
  }

  return (
    <section
      className={cn(
        "grid h-[calc(100dvh-3.5rem)] min-h-0 bg-background lg:h-dvh",
        sidebarOpen
          ? "lg:grid-cols-[320px_minmax(0,1fr)]"
          : "lg:grid-cols-[0_minmax(0,1fr)]",
      )}
    >
      <aside
        className={cn(
          "hidden min-h-0 overflow-hidden border-r bg-card lg:block",
          sidebarOpen ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex h-full min-w-[320px] flex-col">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold">채팅</h1>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  히스토리와 대화 맥락을 이어갑니다
                </p>
              </div>
              <Button
                size="icon"
                variant="outline"
                disabled={!isAuthenticated || isStreaming}
                aria-label="새 대화"
                onClick={startNewChat}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="p-4">
              <AuthRequiredCard
                status={status}
                title="로그인이 필요합니다"
                description="채팅 스트림, 히스토리 복원, 대화 맥락 저장은 로그인 후 사용할 수 있습니다."
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {historyQuery.isLoading ? (
                <div className="rounded-md border bg-background p-4 text-sm font-semibold text-muted-foreground">
                  대화 목록을 불러오는 중입니다.
                </div>
              ) : null}

              {!historyQuery.isLoading &&
              !historyItems.length ? (
                <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                  아직 저장된 대화가 없습니다.
                </div>
              ) : null}

              {historyError ? (
                <div className="mb-2 flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <span>{historyError}</span>
                </div>
              ) : null}

              <div className="space-y-2">
                {historyItems.map((item) => (
                  <div
                    key={item.chat_id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border bg-background p-2 transition-colors hover:bg-primary-soft",
                      item.chat_id === selectedHistoryId &&
                        "border-primary bg-primary-soft",
                    )}
                  >
                    <button
                      type="button"
                      disabled={isStreaming || isRestoring}
                      onClick={() => void restoreChat(item.chat_id)}
                      className="min-w-0 flex-1 rounded-sm px-1 py-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <p className="line-clamp-1 text-sm font-bold text-foreground">
                        {normalizeChatTitle(item.chat_title)}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatUpdatedAt(item.updated_at)}
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={isStreaming || deletingChatId === item.chat_id}
                      onClick={() => void removeHistory(item.chat_id)}
                      aria-label="대화 삭제"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingChatId === item.chat_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              {historyQuery.data?.last_timestamp ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  disabled={historyQuery.isFetching}
                  onClick={() =>
                    setHistoryCursor(historyQuery.data?.last_timestamp || undefined)
                  }
                >
                  {historyQuery.isFetching ? "불러오는 중" : "이전 대화 더 보기"}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="shrink-0 flex items-center justify-between border-b bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="hidden lg:inline-flex"
              aria-label="히스토리 패널 토글"
              onClick={() => setSidebarOpen((current) => !current)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold">{chatTitle}</h1>
              <p className="text-xs font-semibold text-muted-foreground">
                stream_chat_v3 · fetch + ReadableStream
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isAuthenticated || isStreaming}
            onClick={startNewChat}
          >
            새 대화
          </Button>
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4 lg:px-6"
        >
          {!isAuthenticated ? (
            <AuthRequiredCard
              status={status}
              title="로그인 후 채팅을 시작할 수 있습니다"
              description="채팅 API는 인증이 필요한 흐름으로 구성되어 있습니다."
            />
          ) : null}

          {isAuthenticated && !hasMessages ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold">
                무엇을 도와드릴까요?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                메뉴판 번역, 근처 장소 추천, 이미지 기반 주문 보조를 한 대화에서 이어갈 수 있습니다.
              </p>
              <div className="mt-5 grid w-full gap-2 sm:grid-cols-3">
                {[
                  "이 메뉴판을 읽어줘",
                  "근처 조용한 식당 추천해줘",
                  "매운 고기 요리 후보를 찾아줘",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setDraft(prompt)}
                    className="rounded-md border bg-card px-3 py-3 text-sm font-bold hover:bg-primary-soft"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const isEventOnly = message.role === "event";
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  isUser ? "justify-end" : "justify-start",
                )}
              >
                {!isUser ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </span>
                ) : null}

                <div
                  className={cn(
                    "max-w-[680px] space-y-2",
                    isUser && "items-end",
                  )}
                >
                  {message.attachmentPreviews?.length ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {message.attachmentPreviews.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-24 w-24 rounded-md border object-cover"
                        />
                      ))}
                    </div>
                  ) : null}

                  {message.content || message.status === "streaming" ? (
                    <div
                      className={cn(
                        "rounded-md border px-3.5 py-2.5 text-sm leading-6",
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : message.status === "failed"
                            ? "border-destructive/30 bg-destructive/10 text-foreground"
                            : "bg-card text-foreground",
                      )}
                    >
                      {message.content ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          답변을 생성하는 중입니다.
                        </span>
                      )}
                    </div>
                  ) : null}

                  {!isEventOnly && message.events?.length ? (
                    <div className="space-y-2">
                      {message.events.map((event) => (
                        <ChatEventCard
                          key={event.id}
                          event={event}
                          onCandidateSelect={sendCandidate}
                        />
                      ))}
                    </div>
                  ) : null}

                  {isEventOnly && message.events?.map((event) => (
                    <ChatEventCard
                      key={event.id}
                      event={event}
                      onCandidateSelect={sendCandidate}
                    />
                  ))}
                </div>

                {isUser ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-primary">
                    <UserRound className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <form className="shrink-0 border-t bg-card p-3 lg:p-4" onSubmit={submitMessage}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onAttachChange}
          />

          {pendingAttachments.length ? (
            <div className="mx-auto mb-3 flex max-w-4xl flex-wrap gap-2">
              {pendingAttachments.map((item) => (
                <div key={item.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-16 w-16 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="첨부 이미지 제거"
                    onClick={() => removeAttachment(item.id)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {uploadError ? (
            <div className="mx-auto mb-3 flex max-w-4xl gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <span>{uploadError}</span>
            </div>
          ) : null}

          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="이미지 첨부"
              disabled={!isAuthenticated || isStreaming}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                isAuthenticated
                  ? "메시지를 입력하세요"
                  : "로그인 후 메시지를 보낼 수 있습니다"
              }
              aria-label="채팅 메시지"
              disabled={!isAuthenticated}
            />
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="응답 중지"
                onClick={stopStreaming}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                aria-label="전송"
                disabled={
                  !isAuthenticated ||
                  (!draft.trim() && pendingAttachments.length === 0)
                }
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
