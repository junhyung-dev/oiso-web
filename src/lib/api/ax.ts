import { apiRequest, toQueryString } from "@/lib/api/client";
import type {
  ChatAttachmentUploadResponse,
  ChatContextResponse,
  ChatHistoryListResponse,
  PicNOrderResponse,
} from "@/lib/api/types";

export function uploadChatAttachment(image: File, threadId?: string | null) {
  const formData = new FormData();
  formData.set("image", image);
  if (threadId) formData.set("thread_id", threadId);

  return apiRequest<ChatAttachmentUploadResponse>("/ax/upload_chat_attachment", {
    method: "POST",
    body: formData,
  });
}

export function getChatHistoryList(params?: {
  recent_chat_receive_counts?: number;
  starting_timestamp?: string;
}) {
  return apiRequest<ChatHistoryListResponse>(
    `/ax/get_chat_history_list${toQueryString(params || {})}`,
    { auth: true },
  );
}

export function getChatContext(chatId: string) {
  return apiRequest<ChatContextResponse>(
    `/ax/get_chat_context${toQueryString({ chat_id: chatId })}`,
    { auth: true },
  );
}

export function getPicNOrder({
  uuid,
  userLanguage,
  pic,
}: {
  uuid: string;
  userLanguage: string;
  pic: File;
}) {
  const formData = new FormData();
  formData.set("uuid", uuid);
  formData.set("user_language", userLanguage);
  formData.set("pic", pic);

  return apiRequest<PicNOrderResponse>("/ax/get_picnorder", {
    method: "POST",
    body: formData,
  });
}
