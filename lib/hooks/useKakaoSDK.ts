import { useKakaoLoader } from 'react-kakao-maps-sdk';
import { useEffect, useState } from 'react';

const RAW_KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() ?? '';
const RAW_KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim() ?? RAW_KAKAO_MAP_KEY;
const FALLBACK_KEY = 'invalid-kakao-key';

const appKey = RAW_KAKAO_MAP_KEY || RAW_KAKAO_JS_KEY || FALLBACK_KEY;
const jsKey = RAW_KAKAO_JS_KEY || RAW_KAKAO_MAP_KEY || FALLBACK_KEY;
const hasAppKey = appKey !== FALLBACK_KEY;
const KAKAO_SDK_SCRIPT_ID = 'kakao-share-sdk-script';

let kakaoScriptPromise: Promise<void> | null = null;

function initializeKakaoIfNeeded(): boolean {
  if (typeof window === 'undefined' || !window.Kakao) return false;

  if (hasAppKey && !window.Kakao.isInitialized()) {
    try {
      window.Kakao.init(jsKey);
    } catch (e) {
      console.error('Failed to initialize Kakao Share SDK:', e);
      return false;
    }
  }

  return hasAppKey;
}

function loadKakaoScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Kakao SDK can only be loaded in browser'));
  }

  if (window.Kakao) {
    return Promise.resolve();
  }

  if (kakaoScriptPromise) {
    return kakaoScriptPromise;
  }

  kakaoScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(KAKAO_SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Kakao SDK script')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = KAKAO_SDK_SCRIPT_ID;
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.integrity = 'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4';
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      kakaoScriptPromise = null;
      reject(new Error('Failed to load Kakao SDK script'));
    };

    document.head.appendChild(script);
  });

  return kakaoScriptPromise;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (initializeKakaoIfNeeded()) {
      setIsLoaded(true);
    }
    return undefined;
  }, []);

  const ensureLoaded = async (): Promise<boolean> => {
    if (!hasAppKey) {
      const keyError = new Error('Kakao JavaScript key is missing');
      setError(keyError);
      return false;
    }

    if (initializeKakaoIfNeeded()) {
      setIsLoaded(true);
      setError(null);
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loadKakaoScript();
      if (!initializeKakaoIfNeeded()) {
        throw new Error('Failed to initialize Kakao Share SDK');
      }
      setIsLoaded(true);
      return true;
    } catch (loadError) {
      const normalizedError =
        loadError instanceof Error ? loadError : new Error('Failed to load Kakao Share SDK');
      setError(normalizedError);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ensureLoaded,
    loading: isLoading,
    error,
    hasAppKey,
    isReady: isLoaded && !error && hasAppKey,
  };
}

// 하위 호환성을 위해 기본 export 유지 (지도가 포함된 기존 로직)
export const useKakaoSDK = useKakaoMapSDK;
