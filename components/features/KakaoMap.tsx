'use client';

import { useEffect, useState } from 'react';
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import { EXHIBITION } from '@/lib/constants';

const RAW_KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() ?? '';
const FALLBACK_APP_KEY = 'invalid-kakao-app-key';

interface KakaoMapProps {
  className?: string;
}

export default function KakaoMap(props?: KakaoMapProps) {
  const { className } = props ?? {};
  const hasAppKey = RAW_KAKAO_APP_KEY.length > 0;
  const appKey = hasAppKey ? RAW_KAKAO_APP_KEY : FALLBACK_APP_KEY;
  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services'],
  });
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: EXHIBITION.LAT,
    lng: EXHIBITION.LNG,
  });

  useEffect(() => {
    if (!hasAppKey || loading) return;
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const initGeocoder = () => {
      if (!window.kakao?.maps?.services) return;

      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(
        EXHIBITION.ADDRESS,
        (result: Array<{ x: string; y: string }>, status: string) => {
          if (!isMounted) return;

          if (status === window.kakao.maps.services.Status.OK && result?.[0]) {
            const { x, y } = result[0];
            setPosition({
              lat: Number(y),
              lng: Number(x),
            });
          }
        }
      );
    };

    const timeoutId = setTimeout(() => {
      if (isMounted) initGeocoder();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [hasAppKey, loading]);

  if (!hasAppKey) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-canvas-soft text-sm text-charcoal-soft">
        카카오 지도 APP KEY가 설정되지 않았습니다. 환경 변수 `NEXT_PUBLIC_KAKAO_MAP_KEY`에
        JavaScript 키를 등록해주세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-canvas-soft text-sm text-charcoal-soft">
        지도를 불러오는 중입니다…
      </div>
    );
  }

  if (error) {
    console.error('Kakao map load error', error);
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm text-red-600">
        카카오 지도를 불러오지 못했습니다. APP KEY와 도메인 설정을 확인해주세요.
        <span className="ml-2 text-xs text-red-500">{String(error)}</span>
      </div>
    );
  }

  const containerClassName = [
    'w-full',
    'min-h-[360px]',
    'h-full',
    'rounded-lg',
    'overflow-hidden',
    'shadow-md',
  ]
    .concat(className ? [className] : [])
    .join(' ');

  return (
    <div className={containerClassName}>
      <Map center={position} style={{ width: '100%', height: '100%' }} level={3}>
        <MapMarker position={position} title="인사아트센터 3층 G&J 갤러리" />
      </Map>
    </div>
  );
}
