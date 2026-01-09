import { useKakaoLoader } from 'react-kakao-maps-sdk';

const RAW_KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() ?? '';
// Share functionality might use the same key or a different one (often same JS key)
// If specific JS key for share is needed: process.env.NEXT_PUBLIC_KAKAO_JS_KEY
const RAW_KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim() ?? RAW_KAKAO_MAP_KEY;

// Fallback to avoid empty string errors in useKakaoLoader
const FALLBACK_KEY = 'invalid-kakao-key';

export function useKakaoSDK() {
  // We prioritize MAP key because useKakaoLoader is from maps-sdk
  // But for ShareButtons, we might need the JS key.
  // Ideally, they should be the same JavaScript Key from Kakao Developers.
  const appKey = RAW_KAKAO_MAP_KEY || RAW_KAKAO_JS_KEY || FALLBACK_KEY;
  const hasAppKey = appKey !== FALLBACK_KEY;

  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services', 'clusterer', 'drawing'], // Add common libraries
  });

  return {
    loading,
    error,
    hasAppKey,
    isReady: !loading && !error && hasAppKey && typeof window !== 'undefined' && !!window.Kakao,
  };
}
