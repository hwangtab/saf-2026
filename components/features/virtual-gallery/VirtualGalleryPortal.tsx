'use client';

import { useState, useEffect, useCallback, useMemo, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { ROOM_PRESETS } from './roomPresets';
import type { ArtworkDimensions } from '@/lib/utils/parseArtworkSize';

const VirtualRoom = dynamic(() => import('./VirtualRoom'), { ssr: false });

interface VirtualGalleryPortalProps {
  imageUrl: string;
  dimensions: ArtworkDimensions;
  title: string;
  artist: string;
  onClose: () => void;
  locale: string;
}

class GalleryErrorBoundary extends Component<
  { children: ReactNode; fallbackMessage: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallbackMessage: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VirtualGallery]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full text-white/60 text-center px-8">
          {this.props.fallbackMessage}
        </div>
      );
    }
    return this.props.children;
  }
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

export default function VirtualGalleryPortal({
  imageUrl,
  dimensions,
  title,
  artist,
  onClose,
  locale,
}: VirtualGalleryPortalProps) {
  const [selectedPreset, setSelectedPreset] = useState(ROOM_PRESETS[0]);
  const [webglSupported] = useState(() => detectWebGL());
  const isMobile = useIsMobile();

  const isKo = locale !== 'en';

  const copy = useMemo(
    () =>
      isKo
        ? {
            controlHint: '드래그로 시점 이동 · 스크롤로 줌',
            controlHintMobile: '터치로 시점 이동 · 핀치로 줌',
            noWebgl: '이 기기에서는 3D 뷰어를 지원하지 않습니다.',
            errorFallback: '3D 뷰어 로딩 중 오류가 발생했습니다.',
            close: '닫기',
          }
        : {
            controlHint: 'Drag to look around · Scroll to zoom',
            controlHintMobile: 'Touch to look around · Pinch to zoom',
            noWebgl: '3D viewer is not supported on this device.',
            errorFallback: 'An error occurred while loading the 3D viewer.',
            close: 'Close',
          },
    [isKo]
  );

  // ESC to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div className="relative w-full max-w-5xl h-[70vh] md:h-[75vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/95 border-b border-white/10">
            <div className="flex items-center gap-4 min-w-0">
              {/* Artwork info */}
              <div className="text-sm text-white truncate">
                <span className="font-medium">{title}</span>
                <span className="text-white/50 ml-2">— {artist}</span>
              </div>
            </div>

            {/* Room selector + close */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {ROOM_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => setSelectedPreset(preset)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedPreset.key === preset.key
                        ? 'bg-white text-gray-900'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {isKo ? preset.labelKo : preset.labelEn}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="ml-1 p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                aria-label={copy.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 relative">
            {webglSupported ? (
              <GalleryErrorBoundary fallbackMessage={copy.errorFallback}>
                <VirtualRoom
                  preset={selectedPreset}
                  imageUrl={imageUrl}
                  dimensions={dimensions}
                  isMobile={isMobile}
                />
              </GalleryErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-full text-white/60 text-center px-8">
                {copy.noWebgl}
              </div>
            )}
          </div>

          {/* Bottom hint */}
          {webglSupported && (
            <div className="px-4 py-2 bg-gray-900/95 border-t border-white/10 text-white/40 text-xs text-center">
              {isMobile ? copy.controlHintMobile : copy.controlHint}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
