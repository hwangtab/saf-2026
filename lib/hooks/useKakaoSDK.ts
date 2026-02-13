import { useKakaoLoader } from 'react-kakao-maps-sdk';
import { useEffect, useState } from 'react';

const RAW_KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() ?? '';
const RAW_KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim() ?? RAW_KAKAO_MAP_KEY;
const FALLBACK_KEY = 'invalid-kakao-key';

const appKey = RAW_KAKAO_MAP_KEY || RAW_KAKAO_JS_KEY || FALLBACK_KEY;
const jsKey = RAW_KAKAO_JS_KEY || RAW_KAKAO_MAP_KEY || FALLBACK_KEY;
const hasAppKey = appKey !== FALLBACK_KEY;

/**
 * 지도와 관련 라이브러리(services, clusterer, drawing)를 모두 로드하는 훅
 */
export function useKakaoMapSDK() {
  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services', 'clusterer', 'drawing'],
  });

  const [isKakaoInitialized, setIsKakaoInitialized] = useState(false);

  useEffect(() => {
    if (loading || error) return;

    if (hasAppKey && typeof window !== 'undefined' && window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        try {
          window.Kakao.init(jsKey);
        } catch (e) {
          console.error('Failed to initialize Kakao SDK:', e);
        }
      }
      const timerId = setTimeout(() => {
        setIsKakaoInitialized(true);
      }, 0);
      return () => clearTimeout(timerId);
    }
    return undefined;
  }, [loading, error]);

  return {
    loading,
    error,
    hasAppKey,
    isReady: !loading && !error && hasAppKey && isKakaoInitialized,
  };
}

/**
 * 카카오 공유 기능만 필요한 페이지를 위한 가벼운 SDK 로더 (지도 라이브러리 제외)
 */
export function useKakaoShareSDK() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(jsKey);
      }
      const timerId = setTimeout(() => {
        setIsLoaded(true);
      }, 0);
      return () => clearTimeout(timerId);
    }

    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.integrity = 'sha384-TiCUE00h649Pfg779juy6Wt6GNau90fB44K9LYLYi76V4G6Gzbw2P7fGqfX4n4W6';
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(jsKey);
      }
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError(new Error('Failed to load Kakao SDK script'));
    };

    document.head.appendChild(script);

    return undefined;
  }, []);

  return {
    loading: !isLoaded && !error,
    error,
    hasAppKey,
    isReady: isLoaded && !error && hasAppKey,
  };
}

// 하위 호환성을 위해 기본 export 유지 (지도가 포함된 기존 로직)
export const useKakaoSDK = useKakaoMapSDK;
