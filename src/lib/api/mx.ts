import { apiRequest, toQueryString } from "@/lib/api/client";
import type {
  ClusterInfoResponse,
  GetClustersResponse,
  GetSearchResultsResponse,
} from "@/lib/api/types";

export type GetClustersParams = {
  user_long: number;
  user_lat: number;
  screen_topleft: string;
  screen_bottomright: string;
  nearmode?: boolean;
};

export function getClusters(params: GetClustersParams) {
  return apiRequest<GetClustersResponse>(
    `/mx/get_clusters${toQueryString(params)}`,
  );
}

export function getClusterInfo(clusterNo: number) {
  return apiRequest<ClusterInfoResponse>(
    `/mx/get_cluster_info${toQueryString({ cluster_no: clusterNo })}`,
  );
}

export type SearchResultsParams = {
  current_query: string;
  is_search_completed?: boolean;
  do_ai_based_search?: boolean;
  limit?: number;
  user_lat?: number | null;
  user_lng?: number | null;
  screen_topleft?: string | null;
  screen_bottomright?: string | null;
  nearmode?: boolean | null;
};

export function getSearchResults(params: SearchResultsParams) {
  return apiRequest<GetSearchResultsResponse>(
    `/mx/get_search_results${toQueryString(params)}`,
  );
}
