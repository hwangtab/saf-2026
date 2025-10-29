'use client';

import { useState } from 'react';
import { Map, MapMarker, MapInfoWindow, useKakaoLoader } from 'react-kakao-maps-sdk';

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
  const [isOpen, setIsOpen] = useState(false);

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

  // 인사아트센터 3층 G&J 갤러리: 서울 종로구 인사동길 41-1
  const center = { lat: 37.5718, lng: 126.9857 };

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
      <Map center={center} style={{ width: '100%', height: '100%' }} level={3}>
        <MapMarker
          position={center}
          onClick={() => setIsOpen((prev) => !prev)}
          clickable
        >
          {isOpen ? (
            <MapInfoWindow
              position={center}
              zIndex={2}
              removable
              onClose={() => setIsOpen(false)}
            >
              <div
                style={{
                  padding: '12px',
                  color: '#000000',
                  minWidth: '210px',
                  lineHeight: 1.5,
                  wordBreak: 'keep-all',
                  fontSize: '14px',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '4px' }}>
                  인사아트센터 3층 G&amp;J 갤러리
                </strong>
                <span style={{ display: 'block', whiteSpace: 'normal' }}>
                  서울 종로구 인사동길 41-1
                </span>
              </div>
            </MapInfoWindow>
          ) : null}
        </MapMarker>
      </Map>
    </div>
  );
}
