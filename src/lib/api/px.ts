import { apiRequest, toQueryString } from "@/lib/api/client";
import type {
  GetCompletionTimeResponse,
  GetLikesResponse,
  GetRecommendationResponse,
  GotoTarget,
  SetGotoResponse,
  SetLikeRequest,
  SetLikeResponse,
} from "@/lib/api/types";

export function setLike(payload: SetLikeRequest) {
  return apiRequest<SetLikeResponse>("/px/set_like", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getLikes(targetType?: "cluster" | "picture" | "tag") {
  return apiRequest<GetLikesResponse>(
    `/px/get_likes${toQueryString({ target_type: targetType })}`,
    { auth: true },
  );
}

export function getCompletionTime(payload: GotoTarget) {
  return apiRequest<GetCompletionTimeResponse>("/px/get_completion_time", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function setGoto(payload: GotoTarget) {
  return apiRequest<SetGotoResponse>("/px/set_goto", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getRecommendation(payload: {
  user_lat?: number | null;
  user_lng?: number | null;
  limit?: number;
}) {
  return apiRequest<GetRecommendationResponse>("/px/get_recommendation", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}
