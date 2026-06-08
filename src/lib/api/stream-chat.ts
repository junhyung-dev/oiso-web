import {
  API_BASE_URL,
  ApiClientError,
  refreshAccessToken,
} from "@/lib/api/client";
import type { StreamChatEvent, StreamChatPayload } from "@/lib/api/types";
import { getAccessToken } from "@/lib/auth/token-store";

type StreamChatOptions = {
  payload: StreamChatPayload;
  onEvent: (event: StreamChatEvent) => void;
  signal?: AbortSignal;
};

type OpenStreamOptions = StreamChatOptions & {
  endpoint: string;
  retryOnUnauthorized: boolean;
};

function parseSseChunk(chunk: string, onEvent: (event: StreamChatEvent) => void) {
  const line = chunk.split("\n").find((item) => item.startsWith("data: "));
  if (!line) return;

  const raw = line.slice("data: ".length).trim();
  if (!raw) return;

  onEvent(JSON.parse(raw) as StreamChatEvent);
}

function splitSseBuffer(buffer: string) {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const chunks = normalized.split("\n\n");

  return {
    chunks: chunks.slice(0, -1),
    rest: chunks.at(-1) ?? "",
  };
}

function isLikelyCorsOrNetworkError(error: unknown) {
  return error instanceof TypeError;
}

async function openStream({
  payload,
  onEvent,
  signal,
  endpoint,
  retryOnUnauthorized,
}: OpenStreamOptions): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new ApiClientError(401, "로그인이 필요합니다.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return openStream({
        payload,
        onEvent,
        signal,
        endpoint,
        retryOnUnauthorized: false,
      });
    }
  }

  if (!response.ok || !response.body) {
    throw new ApiClientError(
      response.status,
      `stream_chat_v3 failed: ${response.status}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = splitSseBuffer(buffer);
    buffer = parsed.rest;

    for (const chunk of parsed.chunks) {
      parseSseChunk(chunk, onEvent);
    }
  }

  const tail = buffer + decoder.decode();
  if (tail.trim()) {
    parseSseChunk(tail, onEvent);
  }
}

export function streamChatV3(options: StreamChatOptions) {
  return openStream({
    ...options,
    endpoint: `${API_BASE_URL}/ax/stream_chat_v3`,
    retryOnUnauthorized: true,
  }).catch((error) => {
    if (!isLikelyCorsOrNetworkError(error)) {
      throw error;
    }

    return openStream({
      ...options,
      endpoint: "/api/ax/stream_chat_v3",
      retryOnUnauthorized: true,
    });
  });
}
