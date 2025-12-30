/**
 * Kakao Maps SDK 타입 정의
 */

interface KakaoGeocoderResult {
  x: string; // longitude
  y: string; // latitude
}

interface KakaoGeocoder {
  addressSearch(
    address: string,
    callback: (result: KakaoGeocoderResult[], status: string) => void
  ): void;
}

interface KakaoMapsServices {
  Geocoder: new () => KakaoGeocoder;
  Status: { OK: string };
}

interface KakaoMaps {
  services?: KakaoMapsServices;
}

interface KakaoLink {
  sendDefault(options: {
    objectType: string;
    content: {
      title: string;
      description: string;
      imageUrl: string;
      link: { webUrl: string; mobileWebUrl: string };
    };
    buttons?: Array<{
      title: string;
      link: { webUrl: string; mobileWebUrl: string };
    }>;
  }): void;
}

interface KakaoSDK {
  init(key: string): void;
  isInitialized(): boolean;
  Link: KakaoLink;
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
    kakao?: {
      maps?: KakaoMaps;
    };
  }
}

export type { KakaoGeocoderResult, KakaoGeocoder, KakaoMapsServices, KakaoMaps };
