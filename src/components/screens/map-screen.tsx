"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock,
  Compass,
  ExternalLink,
  Heart,
  LocateFixed,
  LockKeyhole,
  MapPin,
  MapPinned,
  Phone,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  Utensils,
  X,
} from "lucide-react";
import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getClusterInfo, getClusters, getSearchResults } from "@/lib/api/mx";
import { getRecommendation } from "@/lib/api/px";
import type {
  ClusterItem,
  ClusterPictureItem,
  RecommendedCluster,
} from "@/lib/api/types";
import { loadKakaoMapSdk } from "@/lib/kakao/load-kakao-map";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { KakaoMap, KakaoMarker } from "@/types/kakao-maps";

type LatLng = {
  lat: number;
  lng: number;
};

type MapBounds = {
  topLeft: LatLng;
  bottomRight: LatLng;
};

type SearchContext = {
  query: string;
  position: LatLng;
  bounds: MapBounds | null;
  nearMode: boolean;
  aiSearchEnabled: boolean;
};

type ClusterPreview = {
  no: number;
  name: string;
  category: string;
  description: string;
  tags: string[];
  distance: string;
  rating: string;
  lat: number;
  lng: number;
  source: "recommendation" | "search" | "map" | "fallback";
  thumbnailUrl?: string | null;
};

const DEFAULT_CENTER: LatLng = { lat: 35.86866, lng: 128.58178 };
const LIST_PANEL_WIDTH = 386;
const DETAIL_PANEL_WIDTH = 430;

const fallbackClusters: ClusterPreview[] = [
  {
    no: 12,
    name: "초록분식",
    category: "주변 추천",
    description: "간단한 식사, 로컬 맛집",
    tags: ["간단한 식사", "로컬"],
    distance: "420 m",
    rating: "4.6",
    lat: 35.889,
    lng: 128.612,
    source: "fallback",
  },
  {
    no: 18,
    name: "오이소 카페",
    category: "주변 추천",
    description: "커피와 디저트를 즐기기 좋은 곳",
    tags: ["커피", "디저트"],
    distance: "610 m",
    rating: "4.4",
    lat: 35.893,
    lng: 128.618,
    source: "fallback",
  },
  {
    no: 23,
    name: "시장국수",
    category: "주변 추천",
    description: "시장 근처에서 가볍게 들르기 좋은 국수집",
    tags: ["국수", "시장"],
    distance: "780 m",
    rating: "4.7",
    lat: 35.884,
    lng: 128.605,
    source: "fallback",
  },
];

function parseNumberParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDeepLinkedClusterFromUrl(): ClusterPreview | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const lat = parseNumberParam(params.get("lat"));
  const lng = parseNumberParam(params.get("lng"));
  if (lat === null || lng === null) return null;

  const clusterNo = parseNumberParam(params.get("cluster_no"));
  const distanceKm = parseNumberParam(params.get("distance_km"));
  const tags = (params.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const no = clusterNo ?? 0;

  return {
    no,
    name: params.get("name") || (no > 0 ? `클러스터 ${no}` : "채팅 추천 장소"),
    category: "채팅 추천",
    description:
      tags.length > 0
        ? tags.join(", ")
        : "채팅에서 추천된 장소입니다.",
    tags,
    distance: formatDistance(distanceKm),
    rating: "-",
    lat,
    lng,
    source: "recommendation",
    thumbnailUrl: params.get("thumbnail_url"),
  };
}

function formatDistance(distanceKm?: number | null) {
  if (distanceKm === undefined || distanceKm === null) return "근처";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function imageUrlFromPicture(picture?: ClusterPictureItem | null) {
  return (
    picture?.thumbnail_url ||
    picture?.image_url ||
    picture?.pic_highres_lowres_s3_url ||
    picture?.pic_highres_url ||
    picture?.detail_url ||
    null
  );
}

function clusterFromMx(item: ClusterItem, source: "map" | "search"): ClusterPreview {
  return {
    no: item.cluster_no,
    name: item.cluster_name || `클러스터 ${item.cluster_no}`,
    category: source === "search" ? "검색 결과" : "지도 클러스터",
    description:
      item.cluster_tags.length > 0
        ? item.cluster_tags.join(", ")
        : "클러스터를 선택하면 상세 정보를 불러옵니다.",
    tags: item.cluster_tags,
    distance: "근처",
    rating: "-",
    lat: item.latitude,
    lng: item.longitude,
    source,
    thumbnailUrl: item.thumbnail_url,
  };
}

function clusterFromRecommendation(item: RecommendedCluster): ClusterPreview {
  const tags = item.matched_tags.length > 0 ? item.matched_tags : item.tags;

  return {
    no: item.cluster_no,
    name: item.cluster_name || `클러스터 ${item.cluster_no}`,
    category: "추천",
    description: tags.join(", "),
    tags,
    distance: formatDistance(item.distance_km),
    rating: item.score.toFixed(1),
    lat: item.latitude,
    lng: item.longitude,
    source: "recommendation",
    thumbnailUrl: item.thumbnail_url,
  };
}

function toBoundsQuery(bounds: MapBounds) {
  return {
    screen_topleft: `${bounds.topLeft.lat},${bounds.topLeft.lng}`,
    screen_bottomright: `${bounds.bottomRight.lat},${bounds.bottomRight.lng}`,
  };
}

function getClusterMarkerKey(cluster: ClusterPreview) {
  return `cluster-${cluster.no}`;
}

function RecommendationCard({
  cluster,
  selected,
  onSelect,
  compact = false,
}: {
  cluster: ClusterPreview;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full rounded-md border bg-background p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-primary bg-primary-soft"
            : "hover:border-primary/50 hover:bg-muted/60",
        )}
      >
        <div className="flex gap-3">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-[#dfeee7] text-primary">
            {cluster.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cluster.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Utensils className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-[#0475d9]">
              {cluster.name}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {cluster.category} · {cluster.distance}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {cluster.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border bg-background p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary-soft"
          : "hover:border-primary/50 hover:bg-muted/60",
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[#dfeee7] text-primary">
        {cluster.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cluster.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Utensils className="h-10 w-10" />
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-bold text-white">
          1/10
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[19px] font-extrabold leading-6 text-[#0475d9]">
            {cluster.name}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">
              {cluster.category}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cluster.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            추천 점수 {cluster.rating} / {cluster.distance}
          </p>
        </div>
        <Heart className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}

function SearchClusterCard({
  cluster,
  selected,
  onSelect,
}: {
  cluster: ClusterPreview;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border bg-background p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary-soft"
          : "hover:border-primary/50 hover:bg-muted/60",
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#dfeee7] text-primary">
          {cluster.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cluster.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Utensils className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">
                {cluster.name}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                {cluster.category} - {cluster.distance}
              </p>
            </div>
            <Heart className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {cluster.description}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 text-primary">
              <Star className="h-3.5 w-3.5 fill-current" />
              {cluster.rating}
            </span>
            <span className="text-muted-foreground">#{cluster.no}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function MapScreen() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<Map<string, KakaoMarker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchContext, setSearchContext] = useState<SearchContext | null>(null);
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [nearMode, setNearMode] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedNo, setSelectedNo] = useState<number | null>(null);
  const [deepLinkedCluster, setDeepLinkedCluster] =
    useState<ClusterPreview | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 350);

  const activePosition = coords || DEFAULT_CENTER;
  const isSearching = searchContext !== null;
  const effectiveSearchQuery = searchContext?.query || "";

  const recommendationQuery = useQuery({
    queryKey: ["recommendations", activePosition.lat, activePosition.lng],
    queryFn: () =>
      getRecommendation({
        user_lat: activePosition.lat,
        user_lng: activePosition.lng,
        limit: 20,
      }),
    enabled: isAuthenticated,
  });

  const mapClustersQuery = useQuery({
    queryKey: ["map-clusters", activePosition, bounds, nearMode],
    queryFn: () => {
      const queryBounds =
        bounds ||
        ({
          topLeft: {
            lat: activePosition.lat + 0.02,
            lng: activePosition.lng - 0.02,
          },
          bottomRight: {
            lat: activePosition.lat - 0.02,
            lng: activePosition.lng + 0.02,
          },
        } satisfies MapBounds);

      return getClusters({
        user_lat: activePosition.lat,
        user_long: activePosition.lng,
        ...toBoundsQuery(queryBounds),
        nearmode: nearMode,
      });
    },
    enabled: isAuthenticated && mapReady && !deepLinkedCluster,
    placeholderData: keepPreviousData,
  });

  const autocompleteQuery = useQuery({
    queryKey: ["map-search-autocomplete", debouncedQuery],
    queryFn: () =>
      getSearchResults({
        current_query: debouncedQuery,
        is_search_completed: false,
        do_ai_based_search: false,
        limit: 8,
      }),
    enabled:
      isAuthenticated &&
      debouncedQuery.length > 0 &&
      submittedQuery.trim().length === 0,
  });

  const searchQuery = useQuery({
    queryKey: [
      "map-search",
      searchContext?.query,
      searchContext?.position.lat,
      searchContext?.position.lng,
      searchContext?.bounds,
      searchContext?.nearMode,
      searchContext?.aiSearchEnabled,
    ],
    queryFn: () => {
      const context = searchContext;
      if (!context) {
        throw new Error("Search context is required.");
      }

      return getSearchResults({
        current_query: context.query,
        is_search_completed: true,
        do_ai_based_search: context.aiSearchEnabled,
        limit: 20,
        user_lat: context.position.lat,
        user_lng: context.position.lng,
        ...(context.bounds ? toBoundsQuery(context.bounds) : {}),
        nearmode: context.nearMode,
      });
    },
    enabled: isAuthenticated && effectiveSearchQuery.length > 0,
  });

  const selectedClusterInfoQuery = useQuery({
    queryKey: ["cluster-info", selectedNo],
    queryFn: () => getClusterInfo(selectedNo ?? 0),
    enabled: isAuthenticated && selectedNo !== null && selectedNo > 0,
  });

  const recommendationClusters = useMemo(() => {
    const recommendations =
      recommendationQuery.data?.recommendations.map(clusterFromRecommendation) ||
      [];
    if (recommendations.length > 0) return recommendations;

    return isAuthenticated ? [] : fallbackClusters;
  }, [isAuthenticated, recommendationQuery.data?.recommendations]);

  const searchClusters = useMemo(
    () =>
      searchQuery.data?.clusters.map((item) => clusterFromMx(item, "search")) ||
      [],
    [searchQuery.data?.clusters],
  );

  const mapClusters = useMemo(
    () => mapClustersQuery.data?.clusters.map((item) => clusterFromMx(item, "map")) || [],
    [mapClustersQuery.data?.clusters],
  );

  const baseVisibleClusters = isAuthenticated
    ? isSearching
      ? searchClusters
      : recommendationClusters
    : fallbackClusters;

  const visibleClusters = useMemo(() => {
    if (!deepLinkedCluster) return baseVisibleClusters;
    const matchedCluster = baseVisibleClusters.find(
      (cluster) => cluster.no === deepLinkedCluster.no,
    );
    return [matchedCluster || deepLinkedCluster];
  }, [baseVisibleClusters, deepLinkedCluster]);

  const markerClusters = useMemo(() => {
    if (deepLinkedCluster) return [visibleClusters[0] || deepLinkedCluster];
    if (isSearching) return searchClusters;
    if (mapClusters.length > 0) return mapClusters;
    return visibleClusters;
  }, [
    deepLinkedCluster,
    isSearching,
    mapClusters,
    searchClusters,
    visibleClusters,
  ]);

  const selectedCluster =
    selectedNo === null
      ? null
      : visibleClusters.find((cluster) => cluster.no === selectedNo) ||
        markerClusters.find((cluster) => cluster.no === selectedNo) ||
        null;

  const detailPictures = selectedClusterInfoQuery.data?.pictures || [];
  const detailHeroUrl =
    imageUrlFromPicture(selectedClusterInfoQuery.data?.reference_picture) ||
    imageUrlFromPicture(detailPictures[0]) ||
    selectedCluster?.thumbnailUrl ||
    null;
  const detailTags =
    selectedClusterInfoQuery.data?.common_tags.length
      ? selectedClusterInfoQuery.data.common_tags
      : selectedCluster?.tags || [];

  const shouldShowSuggestedTags =
    isAuthenticated &&
    Boolean(submittedQuery) &&
    searchQuery.data?.search_strategy === "suggested" &&
    Boolean(searchQuery.data?.correction_candidates?.length);

  const shouldShowSearchReason =
    isAuthenticated &&
    Boolean(submittedQuery) &&
    Boolean(searchQuery.data?.reason) &&
    searchQuery.data?.search_strategy !== "suggested" &&
    !searchQuery.data?.requires_ai_confirmation;

  const overlayWidth =
    panelOpen && selectedCluster
      ? LIST_PANEL_WIDTH + DETAIL_PANEL_WIDTH
      : panelOpen
        ? LIST_PANEL_WIDTH
        : 0;

  const focusCluster = useCallback((cluster: ClusterPreview) => {
    setSelectedNo((current) => (current === cluster.no ? null : cluster.no));
    const kakao = window.kakao;
    const map = mapRef.current;
    if (kakao?.maps && map) {
      map.setCenter(new kakao.maps.LatLng(cluster.lat, cluster.lng));
    }
  }, []);

  const updateBoundsFromMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapBounds = map.getBounds();
    const sw = mapBounds.getSouthWest();
    const ne = mapBounds.getNorthEast();
    setBounds({
      topLeft: { lat: ne.getLat(), lng: sw.getLng() },
      bottomRight: { lat: sw.getLat(), lng: ne.getLng() },
    });
  }, []);

  useEffect(() => {
    const cluster = getDeepLinkedClusterFromUrl();
    if (!cluster) return;

    setDeepLinkedCluster(cluster);
    setCoords({ lat: cluster.lat, lng: cluster.lng });
    setPanelOpen(true);
    setSelectedNo(cluster.no);
    setQuery("");
    setSubmittedQuery("");
    setSearchContext(null);
    setAiSearchEnabled(false);
  }, []);

  useEffect(() => {
    if (!mapReady || !deepLinkedCluster) return;

    const kakao = window.kakao;
    const map = mapRef.current;
    if (kakao?.maps && map) {
      map.setCenter(
        new kakao.maps.LatLng(deepLinkedCluster.lat, deepLinkedCluster.lng),
      );
      updateBoundsFromMap();
    }
  }, [deepLinkedCluster, mapReady, updateBoundsFromMap]);

  useEffect(() => {
    let cancelled = false;
    const container = mapContainerRef.current;
    if (!container) return;

    loadKakaoMapSdk()
      .then((kakao) => {
        if (cancelled || !kakao?.maps || mapRef.current) return;

        const center = new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        const map = new kakao.maps.Map(container, {
          center,
          level: 4,
        });

        mapRef.current = map;
        kakao.maps.event.addListener(map, "idle", updateBoundsFromMap);
        updateBoundsFromMap();
        setMapReady(true);
      })
      .catch((error) => {
        setMapError(
          error instanceof Error
            ? error.message
            : "지도를 불러오지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [updateBoundsFromMap]);

  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;

    if (!kakao?.maps || !map) return;

    const nextKeys = new Set(markerClusters.map(getClusterMarkerKey));

    markersRef.current.forEach((marker, key) => {
      if (!nextKeys.has(key)) {
        marker.setMap(null);
        markersRef.current.delete(key);
      }
    });

    markerClusters.forEach((cluster) => {
      const key = getClusterMarkerKey(cluster);
      const existingMarker = markersRef.current.get(key);
      if (existingMarker) {
        existingMarker.setPosition(new kakao.maps.LatLng(cluster.lat, cluster.lng));
        return;
      }

      const marker = new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(cluster.lat, cluster.lng),
        title: cluster.name,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        focusCluster(cluster);
      });

      markersRef.current.set(key, marker);
    });

  }, [focusCluster, markerClusters]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (
      selectedNo !== null &&
      !visibleClusters.some((cluster) => cluster.no === selectedNo) &&
      !markerClusters.some((cluster) => cluster.no === selectedNo)
    ) {
      setSelectedNo(null);
    }
  }, [markerClusters, selectedNo, visibleClusters]);

  function requestLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const nextCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(nextCoords);

      const kakao = window.kakao;
      const map = mapRef.current;
      if (kakao?.maps && map) {
        map.setCenter(new kakao.maps.LatLng(nextCoords.lat, nextCoords.lng));
        updateBoundsFromMap();
      }
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) return;
    const nextQuery = query.trim();
    if (!nextQuery) return;
    setAiSearchEnabled(false);
    setSubmittedQuery(nextQuery);
    setSearchContext({
      query: nextQuery,
      position: activePosition,
      bounds,
      nearMode,
      aiSearchEnabled: false,
    });
    setSelectedNo(null);
  }

  function selectCandidate(candidate: string) {
    setQuery(candidate);
    setAiSearchEnabled(false);
    setSubmittedQuery(candidate);
    setSearchContext({
      query: candidate,
      position: activePosition,
      bounds,
      nearMode,
      aiSearchEnabled: false,
    });
    setSelectedNo(null);
  }

  function enableAiSearch() {
    setAiSearchEnabled(true);
    setSearchContext((current) =>
      current
        ? {
            ...current,
            aiSearchEnabled: true,
          }
        : null,
    );
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
    setSearchContext(null);
    setAiSearchEnabled(false);
    setSelectedNo(null);
  }

  function clearFocusedCluster() {
    if (deepLinkedCluster && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/map");
      setDeepLinkedCluster(null);
    }
    setSelectedNo(null);
  }

  const listTitle = isAuthenticated
    ? isSearching
      ? "검색 결과"
      : "추천 장소"
    : "주변 추천";

  const isListLoading =
    isAuthenticated &&
    !deepLinkedCluster &&
    (isSearching
      ? searchQuery.isFetching
      : recommendationQuery.isFetching);

  return (
    <section className="relative h-[calc(100dvh-7.5rem)] min-h-[520px] overflow-hidden bg-[#eef4f2] lg:h-dvh">
      <div className="absolute inset-0">
        <div ref={mapContainerRef} className="h-full" />
      </div>

      {mapError ? (
        <div className="absolute inset-4 z-10 flex items-center justify-center rounded-md border bg-card p-5 text-center shadow-soft">
          <div>
            <MapPinned className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-bold">카카오 지도를 불러오지 못했습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">{mapError}</p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-y-0 left-0 z-20 hidden transition-transform duration-200 lg:flex",
          panelOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ width: `${overlayWidth || LIST_PANEL_WIDTH}px` }}
      >
        <aside
          className="h-full w-[386px] shrink-0 border-r bg-card shadow-soft"
          aria-label="검색 및 클러스터 목록"
        >
          <div className="flex h-full flex-col">
            <div className="border-b p-4">
              <form className="relative" onSubmit={submitSearch}>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSubmittedQuery("");
                    setAiSearchEnabled(false);
                    setSelectedNo(null);
                  }}
                  disabled={!isAuthenticated}
                  className="h-12 border-primary/70 pl-10 pr-20 text-base disabled:bg-muted/70"
                  placeholder={
                    isAuthenticated
                      ? "메뉴, 장소, 태그 검색"
                      : "로그인 후 검색할 수 있어요"
                  }
                  aria-label="지도 검색"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="검색어 지우기"
                    className="absolute right-11 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <CircleX className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={!isAuthenticated || !query.trim()}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                  aria-label="검색"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>

              {isAuthenticated &&
              !submittedQuery &&
              debouncedQuery &&
              autocompleteQuery.data?.candidates?.length ? (
                <div className="mt-2 rounded-md border bg-card p-2 shadow-soft">
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">
                    자동완성
                  </p>
                  <div className="grid gap-1">
                    {autocompleteQuery.data.candidates.map((candidate) => (
                      <button
                        key={candidate}
                        type="button"
                        onClick={() => selectCandidate(candidate)}
                        className="rounded-md px-2 py-2 text-left text-sm font-semibold text-foreground hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {candidate}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {isAuthenticated &&
              submittedQuery &&
              searchQuery.data?.requires_ai_confirmation ? (
                <div className="mt-2 rounded-md border bg-primary-soft p-3">
                  <p className="text-sm font-semibold text-foreground">
                    일치하는 태그가 없습니다. AI 기반 검색을 시도할까요?
                  </p>
                  {searchQuery.data.reason ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {searchQuery.data.reason}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={clearSearch}
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={enableAiSearch}
                    >
                      AI 검색
                    </Button>
                  </div>
                </div>
              ) : null}

              {shouldShowSuggestedTags ? (
                <div className="mt-2 rounded-md border bg-card p-3">
                  <p className="text-sm font-semibold text-foreground">
                    유사한 태그 후보가 있습니다.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {searchQuery.data?.correction_candidates.map((candidate) => (
                      <Button
                        key={candidate.tag_string}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => selectCandidate(candidate.tag_string)}
                      >
                        {candidate.tag_string}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {shouldShowSearchReason ? (
                <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {searchQuery.data?.reason}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-primary">
                  {listTitle}
                </p>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="필터"
                  disabled={!isAuthenticated}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-2 rounded-md border bg-background p-1">
                <button
                  type="button"
                  title="현재 지도 화면 안의 클러스터만 보여줍니다."
                  onClick={() => setNearMode(true)}
                  disabled={!isAuthenticated}
                  className={cn(
                    "h-9 rounded-sm px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    nearMode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  화면 내 검색
                </button>
                <button
                  type="button"
                  title="화면 안에 결과가 없으면 가까운 클러스터까지 찾아봅니다."
                  onClick={() => setNearMode(false)}
                  disabled={!isAuthenticated}
                  className={cn(
                    "h-9 rounded-sm px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    !nearMode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  주변 자동 검색
                </button>
              </div>

              {!isAuthenticated ? (
                <div className="mt-3">
                  <AuthRequiredCard
                    status={status}
                    title="로그인이 필요합니다"
                    description="로그인하면 현재 위치와 취향에 맞춘 장소를 더 정확하게 추천받을 수 있어요."
                    compact
                  />
                  <Button asChild className="mt-3 w-full">
                    <Link href="/login">
                      <LockKeyhole className="h-4 w-4" />
                      로그인
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isListLoading ? (
                <div className="rounded-md border bg-background p-4 text-sm font-semibold text-muted-foreground">
                  {isSearching
                    ? "검색 결과를 불러오는 중입니다."
                    : "추천 장소를 불러오는 중입니다."}
                </div>
              ) : null}

              {!isListLoading && visibleClusters.length === 0 ? (
                <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                  표시할 장소가 없습니다.
                </div>
              ) : null}

              <div className="space-y-3">
                {visibleClusters.map((cluster) =>
                  isSearching ? (
                    <SearchClusterCard
                      key={`${cluster.source}-${cluster.no}`}
                      cluster={cluster}
                      selected={cluster.no === selectedNo}
                      onSelect={() => focusCluster(cluster)}
                    />
                  ) : (
                    <RecommendationCard
                      key={`${cluster.source}-${cluster.no}`}
                      cluster={cluster}
                      selected={cluster.no === selectedNo}
                      onSelect={() => focusCluster(cluster)}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </aside>

        {selectedCluster ? (
          <aside
            className="h-full w-[430px] shrink-0 overflow-y-auto border-r bg-card shadow-soft"
            aria-label="클러스터 상세 정보"
          >
            <div className="relative h-56 bg-[#dfeee7]">
              {detailHeroUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detailHeroUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-primary">
                  <Utensils className="h-12 w-12" />
                </div>
              )}
              <button
                type="button"
                onClick={clearFocusedCluster}
                aria-label="상세 정보 닫기"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
                사진 {Math.max(detailPictures.length, detailHeroUrl ? 1 : 0)}개
              </span>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold tracking-normal text-foreground">
                    {selectedCluster.name}
                    <span className="ml-2 text-base font-semibold text-muted-foreground">
                      {selectedCluster.category}
                    </span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">
                    #{selectedCluster.no} · {selectedCluster.distance}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="상세 정보 닫기"
                  onClick={clearFocusedCluster}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {detailTags.slice(0, 8).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button type="button" className="h-11 rounded-full text-base">
                  출발
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-full bg-[#0875f5] text-base text-white hover:bg-[#0868dc]"
                >
                  도착
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-3 border-y py-3 text-center">
                <button
                  type="button"
                  className="flex flex-col items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Bookmark className="h-5 w-5" />
                  저장
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center gap-1 border-x text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <MapPinned className="h-5 w-5" />
                  거리뷰
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-5 w-5" />
                  공유
                </button>
              </div>

              <div className="mt-4 flex gap-6 border-b text-sm font-bold text-muted-foreground">
                {["홈", "메뉴", "리뷰", "사진", "정보"].map((tab, index) => (
                  <button
                    key={tab}
                    type="button"
                    className={cn(
                      "pb-2",
                      index === 0 && "border-b-2 border-foreground text-foreground",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-4 text-sm text-foreground">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <p>
                    현재 지도 기준 위치의 클러스터입니다.
                    <span className="ml-1 font-semibold text-primary">
                      {coords ? "내 위치 기준" : "기본 위치 기준"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <p>
                    상세 데이터는 선택 시{" "}
                    <span className="font-semibold">/v1/mx/get_cluster_info</span>
                    에서 불러옵니다.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <p>연락처와 영업 정보는 다음 단계에서 실제 필드에 연결합니다.</p>
                </div>
                <div className="flex gap-3">
                  <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <p>
                    {selectedClusterInfoQuery.isFetching
                      ? "상세 정보를 불러오는 중입니다."
                      : selectedClusterInfoQuery.data
                        ? `사진 ${selectedClusterInfoQuery.data.pictures.length}개를 확인했습니다.`
                        : "클러스터 상세 정보를 확인할 수 있습니다."}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          if (panelOpen && selectedCluster) {
            clearFocusedCluster();
            return;
          }

          setPanelOpen((current) => !current);
        }}
        aria-label={
          panelOpen && selectedCluster
            ? "상세 정보 닫기"
            : panelOpen
              ? "검색 패널 접기"
              : "검색 패널 펼치기"
        }
        className="absolute top-1/2 z-30 hidden h-12 w-7 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 bg-card text-muted-foreground shadow-soft transition-[left] hover:bg-muted hover:text-foreground lg:flex"
        style={{ left: panelOpen ? `${overlayWidth}px` : "0px" }}
      >
        {panelOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-soft lg:left-auto lg:right-16">
        <Compass className="h-4 w-4 text-primary" />
        {coords
          ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
          : "기본 위치"}
      </div>

      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="현재 위치 찾기"
        onClick={requestLocation}
        className="absolute right-4 top-4 z-10 bg-card"
      >
        <LocateFixed className="h-4 w-4" />
      </Button>

      <div className="absolute inset-x-0 bottom-0 z-20 max-h-[48dvh] overflow-y-auto rounded-t-xl border bg-card p-3 shadow-soft lg:hidden">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <form className="relative mb-3" onSubmit={submitSearch}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSubmittedQuery("");
              setAiSearchEnabled(false);
              setSelectedNo(null);
            }}
            disabled={!isAuthenticated}
            className="h-10 border-primary/60 pl-9 pr-10 text-sm disabled:bg-muted/70"
            placeholder={
              isAuthenticated ? "메뉴, 장소, 태그 검색" : "로그인 후 검색"
            }
            aria-label="모바일 지도 검색"
          />
          <button
            type="submit"
            disabled={!isAuthenticated || !query.trim()}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
            aria-label="검색"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-extrabold text-primary">{listTitle}</p>
          {selectedCluster ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFocusedCluster}
            >
              선택 해제
            </Button>
          ) : null}
        </div>
        <div className="space-y-3">
          {visibleClusters.slice(0, 6).map((cluster) =>
            isSearching ? (
              <SearchClusterCard
                key={`${cluster.source}-${cluster.no}`}
                cluster={cluster}
                selected={cluster.no === selectedNo}
                onSelect={() => focusCluster(cluster)}
              />
            ) : (
              <RecommendationCard
                key={`${cluster.source}-${cluster.no}`}
                cluster={cluster}
                selected={cluster.no === selectedNo}
                onSelect={() => focusCluster(cluster)}
                compact
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
