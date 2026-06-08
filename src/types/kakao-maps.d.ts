export {};

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoLatLngBounds;
        Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
        Marker: new (options: KakaoMarkerOptions) => KakaoMarker;
        CustomOverlay: new (options: KakaoCustomOverlayOptions) => KakaoCustomOverlay;
        event: {
          addListener: (
            target: unknown,
            type: string,
            callback: () => void,
          ) => void;
          removeListener: (
            target: unknown,
            type: string,
            callback: () => void,
          ) => void;
        };
      };
    };
  }
}

export type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

export type KakaoLatLngBounds = {
  extend: (latlng: KakaoLatLng) => void;
};

export type KakaoMapOptions = {
  center: KakaoLatLng;
  level: number;
};

export type KakaoMap = {
  setCenter: (latlng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  getCenter: () => KakaoLatLng;
  getBounds: () => {
    getSouthWest: () => KakaoLatLng;
    getNorthEast: () => KakaoLatLng;
  };
  relayout: () => void;
};

export type KakaoMarkerOptions = {
  map?: KakaoMap | null;
  position: KakaoLatLng;
  title?: string;
};

export type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (position: KakaoLatLng) => void;
};

export type KakaoCustomOverlayOptions = {
  map?: KakaoMap | null;
  position: KakaoLatLng;
  content: string | HTMLElement;
  yAnchor?: number;
  zIndex?: number;
};

export type KakaoCustomOverlay = {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (position: KakaoLatLng) => void;
};
