export type ApiSuccess = {
  success: true;
};

export type ApiError = {
  success: false;
  reason: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer" | string;
  expires_in: number;
};

export type UserResponse = {
  id: string;
  email: string;
  name: string;
  picture_url: string | null;
  created_at: string;
};

export type AuthResponse = {
  user: UserResponse;
  tokens: TokenResponse;
  is_new_user: boolean;
};

export type ClusterItem = {
  longitude: number;
  latitude: number;
  cluster_no: number;
  cluster_name?: string | null;
  cluster_tags: string[];
  thumbnail_url?: string | null;
  reference_pic_url?: string | null;
  cluster_pics_lowres_url?: string | null;
  cluster_pics_lowres_s3_url?: string | null;
};

export type GetClustersResponse = ApiSuccess & {
  clusters: ClusterItem[];
  markers?: ClusterItem[] | null;
};

export type ClusterPictureItem = {
  picture_id: string;
  image_tags: string[];
  image_url?: string | null;
  detail_url?: string | null;
  thumbnail_url?: string | null;
  contains_parsable_data: boolean;
  menu_available: boolean;
  ocr_id?: number | null;
  image_id?: string | null;
  pic_highres_url?: string | null;
  pic_highres_lowres_s3_url?: string | null;
};

export type ClusterInfoResponse = ApiSuccess & {
  cluster_no: number;
  cluster_name?: string | null;
  common_tags: string[];
  reference_picture?: ClusterPictureItem | null;
  pictures: ClusterPictureItem[];
  posts?: ClusterPictureItem[] | null;
};

export type GetSearchResultsResponse = ApiSuccess & {
  current_query: string;
  is_search_completed: boolean;
  do_ai_based_search: boolean;
  candidates: string[];
  completed_tag: {
    tag_id?: string | null;
    tag_string: string;
    confidence?: number | null;
    is_new_tag: boolean;
  } | null;
  clusters: ClusterItem[];
  ai_suggested: boolean;
  reason?: string | null;
  search_strategy:
    | "exact"
    | "corrected"
    | "suggested"
    | "ai_fallback"
    | "not_found"
    | string;
  corrected_query?: string | null;
  correction_applied: boolean;
  correction_confidence?: number | null;
  correction_candidates: Array<{ tag_string: string; confidence: number }>;
  requires_ai_confirmation: boolean;
};

export type ChatAttachment = {
  type: "image" | string;
  attachment_id?: string | null;
  url: string;
  s3_key?: string | null;
  mime_type?: string | null;
};

export type ChatAttachmentUploadResponse = ApiSuccess & {
  attachment: ChatAttachment & {
    attachment_id: string;
    s3_bucket: string;
    s3_key: string;
    s3_version?: string | null;
    mime_type: string;
  };
};

export type StreamChatPayload = {
  uuid: string;
  user_added_message: string;
  user_language: "Korean" | "English" | "Japanese" | string;
  client_lat: number;
  client_lng: number;
  attachments?: ChatAttachment[];
};

export type StreamChatEvent =
  | { type: "token"; delta: string }
  | { type: "menu_ocr_result"; ocr_structure: Record<string, unknown> }
  | { type: "nearby_stores_result"; data: Record<string, unknown> }
  | { type: "object_candidates_result"; data: Record<string, unknown> }
  | { type: "title_update"; chat_title: string }
  | { type: "error"; message: string }
  | { type: "done" };

export type ChatHistoryItem = {
  chat_id: string;
  langgraph_thread_id: string;
  chat_title: string | null;
  updated_at: string;
};

export type ChatHistoryListResponse = ApiSuccess & {
  history: ChatHistoryItem[];
  last_timestamp?: string | null;
};

export type ChatHistoryDeleteResponse = ApiSuccess & {
  chat_id: string;
};

export type ChatContextTimelineItem = {
  kind: "message" | "event";
  seq: number;
  role?: string | null;
  content?: string | null;
  type?: string | null;
  payload?: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

export type ChatContextResponse = ApiSuccess & {
  title: string | null;
  langgraph_thread_id: string;
  timeline: ChatContextTimelineItem[];
};

export type MenuInformation = {
  number: number;
  text_in_original_language: string;
  text_in_user_language: string;
  price: number;
};

export type PicNOrderResponse = ApiSuccess & {
  ocr_structure: {
    menus: MenuInformation[];
    user_language: string;
    original_language: string;
  } | null;
};

export type LikeItem = {
  unique_id: string;
  target_type: string;
  target_id: string;
  created_at: string;
};

export type GetLikesResponse = ApiSuccess & {
  likes: LikeItem[];
  total: number;
};

export type SetLikeRequest = {
  target_type: "cluster" | "picture" | "tag";
  target_id: string;
  is_liked: boolean;
};

export type SetLikeResponse = ApiSuccess & SetLikeRequest;

export type GotoTarget =
  | {
      target_type: "cluster";
      cluster_no: number;
      user_lat?: number | null;
      user_lng?: number | null;
    }
  | {
      target_type: "tag";
      tag_id?: string | null;
      tag_string?: string | null;
      user_lat?: number | null;
      user_lng?: number | null;
    }
  | {
      target_type: "ocr_order";
      ocr_id: number;
      selected_menu_ids?: string[] | null;
    };

export type GetCompletionTimeResponse = ApiSuccess & {
  target_type: string;
  estimated_duration_sec: number;
  estimated_duration_text: string;
  estimated_completion_at: string;
  source: string;
  reason?: string | null;
};

export type SetGotoResponse = ApiSuccess & {
  visit_id: string;
  target_type: string;
  expected_duration_sec?: number | null;
  estimated_completion_at?: string | null;
};

export type RecommendedCluster = {
  cluster_no: number;
  cluster_name?: string | null;
  latitude: number;
  longitude: number;
  tags: string[];
  matched_tags: string[];
  score: number;
  distance_km?: number | null;
  thumbnail_url?: string | null;
};

export type GetRecommendationResponse = ApiSuccess & {
  recommendations: RecommendedCluster[];
  total: number;
  strategy: "personalized" | "popular" | string;
};
