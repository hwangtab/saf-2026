'use client';

import { useState, useEffect, useCallback, useMemo, useRef, useId, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { ROOM_PRESETS } from './roomPresets';
import type { ArtworkDimensions } from '@/lib/utils/parseArtworkSize';

const VirtualRoom = dynamic(() => import('./VirtualRoom'), { ssr: false });

interface VirtualGalleryPortalProps {
  imageUrl: string;
  dimensions: ArtworkDimensions;
  /** 실측 라벨 (예: "72.7×60.6cm · 약 20호") — 헤더에 표시. 치수 미상이면 undefined */
  sizeLabel?: string;
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
  sizeLabel,
  title,
  artist,
  onClose,
  locale,
}: VirtualGalleryPortalProps) {
  const [selectedPreset, setSelectedPreset] = useState(ROOM_PRESETS[0]);
  const [webglSupported] = useState(() => detectWebGL());
  const isMobile = useIsMobile();

  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();

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
            actualSize: '실제 크기',
          }
        : {
            controlHint: 'Drag to look around · Scroll to zoom',
            controlHintMobile: 'Touch to look around · Pinch to zoom',
            noWebgl: '3D viewer is not supported on this device.',
            errorFallback: 'An error occurred while loading the 3D viewer.',
            close: 'Close',
            actualSize: 'Actual size',
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

  // 모달 마운트 시 첫 번째 포커스 가능 요소에 포커스 + Tab 순환으로 focus trap 구현
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();

    function trapTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    dialog.addEventListener('keydown', trapTab);
    return () => dialog.removeEventListener('keydown', trapTab);
  }, []);

  return (
    <>
      {/* Backdrop */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- 배경 클릭 닫기; Escape는 useEffect handleKeyDown이 처리 */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="relative w-full max-w-5xl h-[70vh] md:h-[75vh] bg-gallery-tile rounded-2xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gallery-tile/95 border-b border-white/10">
            <div className="flex items-center gap-4 min-w-0">
              {/* Artwork info */}
              <div className="text-sm text-white truncate">
                <span id={dialogTitleId} className="font-medium">
                  {title}
                </span>
                <span className="text-white/50 ml-2">— {artist}</span>
                {sizeLabel && (
                  <span className="text-white/40 ml-2 hidden sm:inline">
                    · {copy.actualSize} {sizeLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Room selector + close */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {ROOM_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.key}
                    onClick={() => setSelectedPreset(preset)}
                    aria-pressed={selectedPreset.key === preset.key}
                    aria-label={isKo ? preset.labelKo : preset.labelEn}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedPreset.key === preset.key
                        ? 'bg-white text-gallery-tile'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {isKo ? preset.labelKo : preset.labelEn}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="ml-1 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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
            <div className="px-4 py-2 bg-gray-900/95 border-t border-white/10 text-white/60 text-xs text-center">
              {isMobile ? copy.controlHintMobile : copy.controlHint}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
