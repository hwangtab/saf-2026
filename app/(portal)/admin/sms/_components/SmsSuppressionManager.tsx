'use client';

import { useTransition, useState } from 'react';

import {
  AdminCard,
  AdminInput,
  AdminFieldLabel,
  AdminBadge,
} from '@/app/(portal)/admin/_components/admin-ui';
import { addSmsSuppression, removeSmsSuppression, isSmsSuppressed } from '@/app/actions/admin-sms';

type ChannelValue = 'all' | 'customer' | 'member' | 'individual' | 'petition';

const CHANNEL_LABELS: Record<ChannelValue, string> = {
  all: '전체',
  customer: '고객 마케팅',
  member: '작가·출품자',
  individual: '직접 지정',
  petition: '청원 (petition)',
};

type StatusMsg = { type: 'ok' | 'error'; text: string } | null;

interface Props {
  initialCount: number;
}

export function SmsSuppressionManager({ initialCount }: Props) {
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<ChannelValue>('all');
  const [addStatus, setAddStatus] = useState<StatusMsg>(null);
  const [removeStatus, setRemoveStatus] = useState<StatusMsg>(null);
  const [checkStatus, setCheckStatus] = useState<StatusMsg>(null);
  const [suppressedChannels, setSuppressedChannels] = useState<string[] | null>(null);
  const [count, setCount] = useState(initialCount);

  const [isAdding, startAdd] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const [isChecking, startCheck] = useTransition();

  function handleAdd() {
    setAddStatus(null);
    startAdd(async () => {
      const res = await addSmsSuppression(phone.trim(), channel);
      if (res.ok) {
        setAddStatus({ type: 'ok', text: '수신거부가 등록되었습니다.' });
        setCount((prev) => prev + 1);
        setPhone('');
      } else {
        setAddStatus({ type: 'error', text: res.error ?? '등록에 실패했습니다.' });
      }
    });
  }

  function handleRemove() {
    setRemoveStatus(null);
    startRemove(async () => {
      // 해제는 항상 모든 채널의 수신거부를 풉니다 — channel 인자 없이 phone_hash 전체 삭제
      const res = await removeSmsSuppression(phone.trim());
      if (res.ok) {
        setRemoveStatus({ type: 'ok', text: '모든 채널의 수신거부가 해제되었습니다.' });
        setCount((prev) => Math.max(0, prev - 1));
        setSuppressedChannels(null);
      } else {
        setRemoveStatus({ type: 'error', text: res.error ?? '해제에 실패했습니다.' });
      }
    });
  }

  function handleCheck() {
    setCheckStatus(null);
    setSuppressedChannels(null);
    startCheck(async () => {
      const res = await isSmsSuppressed(phone.trim());
      if (res.suppressed) {
        setSuppressedChannels(res.channels);
        setCheckStatus({ type: 'error', text: '차단 중인 채널이 있습니다.' });
      } else {
        setSuppressedChannels([]);
        setCheckStatus({ type: 'ok', text: '차단 안 됨 — 발송 가능한 번호입니다.' });
      }
    });
  }

  const isPhoneEmpty = !phone.trim();
  const isPending = isAdding || isRemoving || isChecking;

  return (
    <AdminCard className="p-6">
      <div className="mb-5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-charcoal-deep">SMS 수신거부 관리</h3>
          <p className="mt-0.5 text-xs text-charcoal-muted">
            해시로만 저장되므로 번호 목록 조회는 불가합니다. 번호를 입력해 등록·조회·해제합니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-charcoal-muted">총 등록</span>
          <AdminBadge tone="info">{count.toLocaleString('ko-KR')}건</AdminBadge>
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <AdminFieldLabel htmlFor="suppression-phone">전화번호</AdminFieldLabel>
            <AdminInput
              id="suppression-phone"
              type="tel"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setAddStatus(null);
                setRemoveStatus(null);
                setCheckStatus(null);
                setSuppressedChannels(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPhoneEmpty && !isPending) handleCheck();
              }}
              disabled={isPending}
            />
          </div>
          <div>
            <AdminFieldLabel htmlFor="suppression-channel">채널</AdminFieldLabel>
            <select
              id="suppression-channel"
              className="block h-11 w-full rounded-md border border-[var(--admin-border)] bg-white px-3 text-sm text-charcoal-deep shadow-sm focus-visible:outline-none transition focus-visible:border-primary-a11y focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelValue)}
              disabled={isPending}
            >
              {(Object.keys(CHANNEL_LABELS) as ChannelValue[]).map((ch) => (
                <option key={ch} value={ch}>
                  {CHANNEL_LABELS[ch]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPhoneEmpty || isPending}
            className="rounded-lg bg-danger/10 px-4 py-2 text-sm font-semibold text-danger-a11y ring-1 ring-inset ring-danger-a11y/20 transition hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAdding ? '등록 중…' : '수신거부 등록'}
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={isPhoneEmpty || isPending}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep transition hover:bg-canvas-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? '조회 중…' : '차단 여부 확인'}
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPhoneEmpty || isPending}
              className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep transition hover:bg-canvas-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRemoving ? '해제 중…' : '모든 채널 수신거부 해제'}
            </button>
            <span className="text-xs text-charcoal-soft">해제는 모든 채널의 수신거부를 풉니다</span>
          </div>
        </div>

        {/* 피드백 */}
        {addStatus && (
          <p
            className={`text-sm ${addStatus.type === 'ok' ? 'text-success-a11y' : 'text-danger-a11y'}`}
          >
            {addStatus.text}
          </p>
        )}
        {removeStatus && (
          <p
            className={`text-sm ${removeStatus.type === 'ok' ? 'text-success-a11y' : 'text-danger-a11y'}`}
          >
            {removeStatus.text}
          </p>
        )}
        {checkStatus && (
          <div className="space-y-1.5">
            <p
              className={`text-sm ${checkStatus.type === 'ok' ? 'text-success-a11y' : 'text-danger-a11y'}`}
            >
              {checkStatus.text}
            </p>
            {suppressedChannels && suppressedChannels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suppressedChannels.map((ch) => (
                  <AdminBadge key={ch} tone="danger">
                    {CHANNEL_LABELS[ch as ChannelValue] ?? ch}
                  </AdminBadge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-charcoal-soft">
        수신거부 번호는 sha-256 해시로만 저장됩니다. 원본 번호 목록은 조회·내보내기가 불가하며,
        번호를 직접 입력해야만 차단 여부를 확인할 수 있습니다.
      </p>
    </AdminCard>
  );
}
