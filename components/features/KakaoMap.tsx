'use client';

import { useState } from 'react';
import { Map, MapMarker } from 'react-kakao-maps-sdk';

export default function KakaoMap() {
  const [isOpen, setIsOpen] = useState(false);

  // 인사아트센터: 서울 종로구 인사동길 41-1
  const center = { lat: 37.5718, lng: 126.9857 };

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-md">
      <Map center={center} style={{ width: '100%', height: '100%' }} level={3}>
        <MapMarker
          position={center}
          onClick={() => setIsOpen(true)}
          clickable={true}
        >
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
