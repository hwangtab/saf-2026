import { AdminCard, AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';
import type { SocialTokenStatus as TokenStatus } from '@/app/actions/admin-social';

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  threads: 'Threads',
};

const STATE_META: Record<
  TokenStatus['state'],
  { label: string; tone: 'success' | 'warning' | 'danger' | 'default' }
> = {
  healthy: { label: '정상', tone: 'success' },
  expiring: { label: '만료 임박', tone: 'warning' },
  expired: { label: '만료됨', tone: 'danger' },
  missing: { label: '미설정', tone: 'default' },
};

function describe(status: TokenStatus): string {
  if (status.state === 'missing') return '저장된 토큰 없음';
  if (!status.expiresAt) return '장기 토큰 (만료일 미기록)';
  const date = status.expiresAt.slice(0, 10);
  if (status.daysRemaining == null) return date;
  if (status.daysRemaining < 0) return `${date} (만료됨)`;
  return `${date} (D-${status.daysRemaining})`;
}

export function SocialTokenStatusPanel({ statuses }: { statuses: TokenStatus[] }) {
  return (
    <AdminCard className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal-deep">토큰 상태</h3>
        <span className="text-xs text-gray-500">
          만료 임박 시 주간 갱신 크론이 이메일로도 알립니다
        </span>
      </div>
      <ul className="divide-y divide-[var(--admin-border-soft)]">
        {statuses.map((s) => {
          const meta = STATE_META[s.state];
          return (
            <li key={s.platform} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm font-medium text-gray-800">
                {PLATFORM_LABELS[s.platform] ?? s.platform}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{describe(s)}</span>
                <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
              </span>
            </li>
          );
        })}
      </ul>
    </AdminCard>
  );
}
