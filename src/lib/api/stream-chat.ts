import { API_BASE_URL, ApiClientError } from "@/lib/api/client";
import type { StreamChatEvent, StreamChatPayload } from "@/lib/api/types";
import { getAccessToken } from "@/lib/auth/token-store";

export async function streamChatV3({
  payload,
  onEvent,
  signal,
}: {
  payload: StreamChatPayload;
  onEvent: (event: StreamChatEvent) => void;
  signal?: AbortSignal;
}) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new ApiClientError(401, "로그인이 필요합니다.");
  }

  const response = await fetch(`${API_BASE_URL}/ax/stream_chat_v3`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

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
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;

      const raw = line.slice("data: ".length);
      onEvent(JSON.parse(raw) as StreamChatEvent);
    }
  }
}
