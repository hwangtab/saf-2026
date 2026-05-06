import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { NoticeType } from '@/lib/artist-notice';

type Props = {
  type: NoticeType;
  message: string;
  label: string;
  className?: string;
};

const TYPE_STYLES: Record<NoticeType, { border: string; accent: string; Icon: typeof Info }> = {
  info: {
    border: 'border-primary',
    accent: 'text-primary',
    Icon: Info,
  },
  warning: {
    border: 'border-sun-strong',
    accent: 'text-sun-strong',
    Icon: AlertTriangle,
  },
  urgent: {
    border: 'border-danger-a11y',
    accent: 'text-danger-a11y',
    Icon: AlertOctagon,
  },
};

/**
 * 작가 공지 카드 — stateless, label까지 prop으로 받는 dumb 컴포넌트.
 * - DESIGN.md §2·§4·§7 준수: 화이트 스케일 배경, type별 좌측 컬러 border, brand 토큰만 사용
 * - role="note" 정적 카드 (사용자 dismiss 없음)
 * - server/client 어디서든 사용 가능 — i18n 의존 없음
 */
export default function ArtistNoticeCard({ type, message, label, className }: Props) {
  const { border, accent, Icon } = TYPE_STYLES[type];

  return (
    <aside
      role="note"
      className={cn(
        'flex gap-4 rounded-l-md rounded-r-xl border-l-4 bg-canvas-soft p-5 shadow-sm md:p-6',
        border,
        className
      )}
    >
      <Icon className={cn('mt-0.5 h-6 w-6 shrink-0', accent)} aria-hidden="true" />
      <div className="min-w-0">
        <span className={cn('text-eyebrow mb-1.5 block', accent)}>{label}</span>
        <p className="break-keep text-base leading-relaxed text-charcoal md:text-lg">{message}</p>
      </div>
    </aside>
  );
}
