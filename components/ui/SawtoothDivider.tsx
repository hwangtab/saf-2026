import { cn } from '@/lib/utils/cn';

/**
 * SawtoothDivider가 `position="top"`으로 렌더될 때, 자기 위 섹션의 마지막 40px(데스크톱) /
 * 24px(모바일)를 톱니가 덮어씁니다(`-translate-y-full`). 따라서 이 divider가 아래에 붙는
 * 페이지·섹션은 반드시 톱니 높이 + 숨 쉴 공간을 하단 패딩으로 확보해야 합니다.
 *
 * 이 상수를 사용하면 Footer / FooterSlider 위에 오는 페이지 컨테이너가 항상 안전한 여백을
 * 유지합니다. 값 변경 시 여기를 수정하면 모든 사용처가 함께 조정됩니다.
 *
 * @example
 *   <div className={`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}`}>...</div>
 */
export const SAWTOOTH_TOP_SAFE_PADDING = 'pb-24 md:pb-32';

interface SawtoothDividerProps {
  /**
   * 톱니 방향.
   * - `'top'`: 자기 섹션 위에 올라타며(`-translate-y-full`) 위 섹션의 마지막 24~40px를 먹습니다.
   *   즉, **위 콘텐츠에 충분한 하단 패딩**이 필요합니다 → {@link SAWTOOTH_TOP_SAFE_PADDING} 사용 권장.
   * - `'bottom'`: 자기 섹션 하단 테두리에 붙습니다. 위 콘텐츠는 영향 없음.
   */
  position?: 'top' | 'bottom';
  className?: string;
  colorClass?: string;
}

export default function SawtoothDivider({
  position = 'bottom',
  className,
  colorClass = 'text-canvas-soft',
}: SawtoothDividerProps) {
  return (
    <div
      className={cn(
        'w-full leading-none z-10 h-6 md:h-10 pointer-events-none absolute left-0',
        position === 'bottom' ? '-bottom-px' : 'top-0 -translate-y-full',
        className
      )}
      aria-hidden="true"
    >
      <svg
        className={cn('w-full h-full fill-current', colorClass)}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`sawtooth-mobile-${colorClass?.replace(/[^a-z0-9]/gi, '')}`}
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <polygon points="0,24 12,0 24,24" />
          </pattern>
          <pattern
            id={`sawtooth-desktop-${colorClass?.replace(/[^a-z0-9]/gi, '')}`}
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <polygon points="0,40 20,0 40,40" />
          </pattern>
        </defs>
        <style>
          {`
            .sawtooth-rect-${colorClass?.replace(/[^a-z0-9]/gi, '')} {
              fill: url(#sawtooth-mobile-${colorClass?.replace(/[^a-z0-9]/gi, '')});
            }
            @media (min-width: 768px) {
              .sawtooth-rect-${colorClass?.replace(/[^a-z0-9]/gi, '')} {
                fill: url(#sawtooth-desktop-${colorClass?.replace(/[^a-z0-9]/gi, '')});
              }
            }
          `}
        </style>
        <rect
          className={`sawtooth-rect-${colorClass?.replace(/[^a-z0-9]/gi, '')}`}
          x="0"
          y="0"
          width="100%"
          height="100%"
        />
      </svg>
    </div>
  );
}
