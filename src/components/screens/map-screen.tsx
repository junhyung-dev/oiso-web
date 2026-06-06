"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleX,
  Compass,
  Heart,
  LocateFixed,
  Search,
  SlidersHorizontal,
  Star,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ClusterPreview = {
  no: number;
  name: string;
  category: string;
  description: string;
  tags: string[];
  distance: string;
  rating: string;
  x: string;
  y: string;
};

const recommendedClusters: ClusterPreview[] = [
  {
    no: 12,
    name: "Green Bunsik",
    category: "Korean snack",
    description: "Fast local plates with tteokbokki, gimbap, and warm soup.",
    tags: ["tteokbokki", "gimbap", "quick meal"],
    distance: "420 m",
    rating: "4.6",
    x: "43%",
    y: "36%",
  },
  {
    no: 18,
    name: "Oiso Cafe",
    category: "Cafe",
    description: "Quiet cafe with desserts and photo-friendly seating.",
    tags: ["coffee", "dessert", "quiet"],
    distance: "610 m",
    rating: "4.4",
    x: "63%",
    y: "53%",
  },
  {
    no: 23,
    name: "Market Noodles",
    category: "Noodles",
    description: "Simple noodle bowls near the market entrance.",
    tags: ["noodles", "market", "solo dining"],
    distance: "780 m",
    rating: "4.7",
    x: "35%",
    y: "66%",
  },
];

const searchResults: ClusterPreview[] = [
  {
    no: 31,
    name: "Rice Table",
    category: "Korean meal",
    description: "Set meals with rice, soup, and seasonal side dishes.",
    tags: ["rice", "set menu", "comfort"],
    distance: "520 m",
    rating: "4.5",
    x: "53%",
    y: "44%",
  },
  {
    no: 44,
    name: "Late Soup House",
    category: "Soup",
    description: "Late-night soups and easy ordering for travelers.",
    tags: ["soup", "late night", "warm"],
    distance: "1.1 km",
    rating: "4.3",
    x: "69%",
    y: "61%",
  },
];

export function MapScreen() {
  const [coords, setCoords] = useState("waiting for location");
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedNo, setSelectedNo] = useState<number>(recommendedClusters[0].no);

  const isSearching = query.trim().length > 0;
  const visibleClusters = useMemo(
    () => (isSearching ? searchResults : recommendedClusters),
    [isSearching],
  );

  const selectedCluster =
    visibleClusters.find((cluster) => cluster.no === selectedNo) ||
    visibleClusters[0];

  function requestLocation() {
    if (!navigator.geolocation) {
      setCoords("browser location unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords(
          `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        );
      },
      () => setCoords("location permission needed"),
    );
  }

  function clearSearch() {
    setQuery("");
    setSelectedNo(recommendedClusters[0].no);
  }

  return (
    <section
      className={cn(
        "relative min-h-[calc(100dvh-3.5rem)] bg-[#eef4f2] lg:min-h-dvh",
        panelOpen
          ? "lg:grid lg:grid-cols-[386px_minmax(0,1fr)]"
          : "lg:grid lg:grid-cols-[0_minmax(0,1fr)]",
      )}
    >
      <aside
        className={cn(
          "z-10 border-r bg-card shadow-soft transition-[width,opacity] duration-200 lg:h-dvh lg:overflow-hidden",
          panelOpen ? "lg:w-[386px] lg:opacity-100" : "lg:w-0 lg:opacity-0",
        )}
      >
        <div className="flex h-full min-w-[386px] flex-col">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedNo(searchResults[0].no);
                }}
                className="h-12 border-primary/70 pl-10 pr-11 text-base"
                placeholder="Search menu, place, tag"
                aria-label="Map search"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <CircleX className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  {isSearching ? "Search results" : "Recommended clusters"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSearching
                    ? "Results replace recommendations until the query is cleared."
                    : "Later this list will use /v1/px/get_recommendation."}
                </p>
              </div>
              <Button variant="outline" size="icon" aria-label="Filters">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {visibleClusters.map((cluster) => {
                const selected = cluster.no === selectedCluster.no;
                return (
                  <button
                    key={cluster.no}
                    type="button"
                    onClick={() => setSelectedNo(cluster.no)}
                    className={cn(
                      "w-full rounded-md border bg-background p-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary-soft"
                        : "hover:border-primary/50 hover:bg-muted/60",
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-md bg-[#dfeee7] text-primary">
                        <Utensils className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold text-foreground">
                              {cluster.name}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                              {cluster.category} · {cluster.distance}
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
                          <span className="text-muted-foreground">
                            #{cluster.no}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setPanelOpen((current) => !current)}
        aria-label={panelOpen ? "Collapse search panel" : "Expand search panel"}
        className={cn(
          "absolute top-1/2 z-20 hidden h-12 w-7 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 bg-card text-muted-foreground shadow-soft transition-[left] hover:bg-muted hover:text-foreground lg:flex",
          panelOpen ? "left-[386px]" : "left-0",
        )}
      >
        {panelOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="map-grid relative min-h-[58dvh] overflow-hidden lg:min-h-dvh">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-soft">
          <Compass className="h-4 w-4 text-primary" />
          Location: {coords}
        </div>

        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Find current location"
          onClick={requestLocation}
          className="absolute right-4 top-4 z-10 bg-card"
        >
          <LocateFixed className="h-4 w-4" />
        </Button>

        {visibleClusters.map((cluster) => {
          const selected = cluster.no === selectedCluster.no;
          return (
            <button
              key={cluster.no}
              type="button"
              onClick={() => setSelectedNo(cluster.no)}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold shadow-soft transition-transform hover:scale-105",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground",
              )}
              style={{ left: cluster.x, top: cluster.y }}
            >
              <Utensils className="h-4 w-4" />
              {cluster.name}
            </button>
          );
        })}

        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-md border bg-card p-3 shadow-soft lg:left-auto lg:w-[320px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{selectedCluster.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedCluster.category} · {selectedCluster.distance}
              </p>
            </div>
            <span className="rounded-sm bg-primary-soft px-2 py-1 text-xs font-bold text-primary">
              {selectedCluster.rating}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedCluster.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
