'use client';

import { useState } from 'react';
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';

const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export default function KakaoMap() {
  const hasAppKey = Boolean(KAKAO_MAP_APP_KEY);
  const [loading, error] = useKakaoLoader({
    appkey: hasAppKey ? KAKAO_MAP_APP_KEY : 'invalid-kakao-app-key',
    libraries: ['services'],
  });
  const [isOpen, setIsOpen] = useState(false);

  if (!hasAppKey) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
        카카오 지도 APP KEY가 설정되지 않았습니다. 환경 변수 `NEXT_PUBLIC_KAKAO_MAP_KEY`에
        JavaScript 키를 등록해주세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
        지도를 불러오는 중입니다…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm text-red-600">
        카카오 지도를 불러오지 못했습니다. APP KEY와 도메인 설정을 확인해주세요.
      </div>
    );
  }

  // 인사아트센터: 서울 종로구 인사동길 41-1
  const center = { lat: 37.5718, lng: 126.9857 };

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-md">
      <Map center={center} style={{ width: '100%', height: '100%' }} level={3}>
        <MapMarker position={center} onClick={() => setIsOpen(true)} clickable>
          {isOpen && (
            <div style={{ padding: '10px', color: '#000', minWidth: '150px' }}>
              <strong>인사아트센터</strong>
              <br />
              서울 종로구 인사동길 41-1
            </div>
          )}
        </MapMarker>
      </Map>
    </div>
  );
}
