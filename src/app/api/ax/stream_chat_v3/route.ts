const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

const API_BASE_URL = rawBaseUrl.endsWith("/v1")
  ? rawBaseUrl
  : `${rawBaseUrl}/v1`;

const MAX_REQUEST_BODY_BYTES = 256 * 1024;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

class RequestBodyTooLargeError extends Error {}

function jsonError(message: string, status: number) {
  return Response.json(
    { success: false, reason: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function readLimitedTextBody(request: Request) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let totalBytes = 0;
  let body = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        throw new RequestBodyTooLargeError("Request body is too large.");
      }

      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) {
    return jsonError("Content-Type must be application/json.", 415);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0) {
      return jsonError("Invalid Content-Length.", 400);
    }
    if (parsedLength > MAX_REQUEST_BODY_BYTES) {
      return jsonError("Request body is too large.", 413);
    }
  }

  let body: string;
  try {
    body = await readLimitedTextBody(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonError("Request body is too large.", 413);
    }
    throw error;
  }

  const upstream = await fetch(`${API_BASE_URL}/ax/stream_chat_v3`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body,
    cache: "no-store",
  });

  if (!upstream.body) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/plain",
        "Cache-Control": "no-store",
      },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(": proxy-open\n\n"));

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "stream proxy failed",
            })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      void upstream.body?.cancel();
    },
  });

  return new Response(stream, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
