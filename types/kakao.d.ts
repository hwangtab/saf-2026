// Kakao SDK Type Definitions for SAF 2026

declare global {
  interface Window {
    Kakao: KakaoSDK;
    kakao: {
      maps: {
        services: {
          Geocoder: new () => KakaoGeocoder;
          Status: {
            OK: string;
            ZERO_RESULT: string;
            ERROR: string;
          };
        };
        Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMapInstance;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        Marker: new (options: KakaoMarkerOptions) => KakaoMarker;
      };
    };
  }
}

// Kakao SDK Main Interface
interface KakaoSDK {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Link: KakaoLink;
}

// Kakao Link (Share)
interface KakaoLink {
  sendDefault: (options: KakaoShareOptions) => void;
}

interface KakaoShareOptions {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: {
      webUrl: string;
      mobileWebUrl: string;
    };
  };
  buttons?: Array<{
    title: string;
    link: {
      webUrl: string;
      mobileWebUrl: string;
    };
  }>;
}

// Kakao Maps
interface KakaoGeocoder {
  addressSearch: (
    address: string,
    callback: (result: KakaoGeocoderResult[], status: string) => void
  ) => void;
  coord2Address: (
    lng: number,
    lat: number,
    callback: (result: KakaoGeocoderResult[], status: string) => void
  ) => void;
}

interface KakaoGeocoderResult {
  x: string;
  y: string;
  address_name?: string;
  road_address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
  };
}

interface KakaoMapOptions {
  center: KakaoLatLng;
  level?: number;
}

interface KakaoMapInstance {
  setCenter: (latlng: KakaoLatLng) => void;
  getCenter: () => KakaoLatLng;
  setLevel: (level: number, options?: { animate?: boolean }) => void;
  getLevel: () => number;
}

interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

interface KakaoMarkerOptions {
  position: KakaoLatLng;
  map?: KakaoMapInstance;
}

interface KakaoMarker {
  setMap: (map: KakaoMapInstance | null) => void;
  getPosition: () => KakaoLatLng;
}

export {};
