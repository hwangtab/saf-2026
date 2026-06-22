'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import ArtistNoticeCard from '@/components/features/ArtistNoticeCard';
import { NOTICE_TYPES, type NoticeType } from '@/lib/artist-notice';
import {
  setArtistNotice,
  toggleArtistNotice,
  clearArtistNotice,
} from '@/app/actions/admin-artists';

const MESSAGE_SOFT_LIMIT = 220;
const MESSAGE_HARD_LIMIT = 280;

const TYPE_LABELS: Record<NoticeType, { ko: string; en: string }> = {
  info: { ko: '안내', en: 'Notice' },
  warning: { ko: '주의', en: 'Warning' },
  urgent: { ko: '중요', en: 'Important' },
};

type Template = {
  key: string;
  label: string;
  type: NoticeType;
  ko: string;
  en: string;
};

const TEMPLATES: Template[] = [
  {
    key: 'priceIncrease',
    label: '가격 인상 예정',
    type: 'info',
    ko: '○월 ○일부터 가격이 인상될 예정입니다.',
    en: 'Prices will increase on [MM/DD].',
  },
  {
    key: 'salesPause',
    label: '판매 일시 중단',
    type: 'warning',
    ko: '○월 ○일부터 판매가 일시 중단됩니다.',
    en: 'Sales will pause starting [MM/DD].',
  },
  {
    key: 'newWorks',
    label: '신작 공개 예정',
    type: 'info',
    ko: '신작 공개 예정 — 잠시 후 안내해 드립니다.',
    en: 'New works coming soon.',
  },
];

type ArtistNoticeProps = {
  artistId: string;
  artistName: string | null;
  initial: {
    enabled: boolean;
    type: NoticeType | null;
    message: string | null;
    message_en: string | null;
    active_until: string | null;
    updated_at: string | null;
    updated_by_email?: string | null;
  };
};

// datetime-local input은 timezone 없는 'YYYY-MM-DDTHH:mm' 포맷.
// DB는 ISO timestamptz로 저장하니 양방향 변환 필요.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ArtistNoticeFieldset({ artistId, artistName, initial }: ArtistNoticeProps) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);

  const [enabled, setEnabled] = useState(initial.enabled);
  const [type, setType] = useState<NoticeType>(initial.type ?? 'info');
  const [message, setMessage] = useState(initial.message ?? '');
  const [messageEn, setMessageEn] = useState(initial.message_en ?? '');
  const [activeUntilLocal, setActiveUntilLocal] = useState(isoToLocalInput(initial.active_until));
  const [previewLocale, setPreviewLocale] = useState<'ko' | 'en'>('ko');
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Deep link from artist-list: ?focus=notice → 자동 스크롤 + 1.5s 하이라이트
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    if (searchParams?.get('focus') !== 'notice' || !cardRef.current) {
      return undefined;
    }
    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 1500);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const messageLength = message.length;
  const overSoft = messageLength > MESSAGE_SOFT_LIMIT;
  const overHard = messageLength > MESSAGE_HARD_LIMIT;
  const messageEnOver = messageEn.length > MESSAGE_HARD_LIMIT;

  const trimmedMessage = message.trim();
  const trimmedMessageEn = messageEn.trim();
  const canEnable = trimmedMessage.length > 0;

  const previewMessage = previewLocale === 'en' ? trimmedMessageEn : trimmedMessage;
  const previewLabel = TYPE_LABELS[type][previewLocale];

  const activeUntilWarning = useMemo(() => {
    if (!activeUntilLocal) return null;
    const iso = localInputToIso(activeUntilLocal);
    if (!iso) return '시각 형식이 올바르지 않습니다.';
    if (new Date(iso) <= new Date())
      return '만료 시각이 현재보다 과거입니다 — 저장하면 즉시 미노출됩니다.';
    return null;
  }, [activeUntilLocal]);

  function applyTemplate(tpl: Template) {
    setType(tpl.type);
    setMessage(tpl.ko);
    setMessageEn(tpl.en);
  }

  function applyQuickRange(days: number) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setActiveUntilLocal(isoToLocalInput(target.toISOString()));
  }

  async function handleSave() {
    if (!canEnable) {
      toast.error('공지 메시지(한국어)를 입력해 주세요.');
      return;
    }
    if (overHard) {
      toast.error(`공지 메시지는 ${MESSAGE_HARD_LIMIT}자 이내로 입력해 주세요.`);
      return;
    }
    if (messageEnOver) {
      toast.error(`영문 공지 메시지는 ${MESSAGE_HARD_LIMIT}자 이내로 입력해 주세요.`);
      return;
    }
    setSaving(true);
    try {
      await setArtistNotice(artistId, {
        type,
        message: trimmedMessage,
        message_en: trimmedMessageEn || null,
        active_until: activeUntilLocal ? localInputToIso(activeUntilLocal) : null,
        enabled,
      });
      toast.success('공지가 저장되었습니다');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleOnly(nextEnabled: boolean) {
    if (nextEnabled && !canEnable) {
      toast.error('공지 메시지를 먼저 입력하고 저장해 주세요.');
      return;
    }
    // 미저장 메시지 변경 상태에서 ON으로 토글하면 DB의 옛 메시지가 활성화될 위험.
    // UI도 그대로 두고(setEnabled 호출 안 함) 안내 — 사용자가 [저장] 버튼으로 확정해야 함.
    if (nextEnabled && trimmedMessage !== (initial.message ?? '').trim()) {
      toast.info('변경된 메시지는 [저장] 버튼을 눌러 적용해 주세요.');
      return;
    }
    setEnabled(nextEnabled);
    setSaving(true);
    try {
      await toggleArtistNotice(artistId, nextEnabled);
      toast.success(nextEnabled ? '공지를 활성화했습니다' : '공지를 비활성화했습니다');
      router.refresh();
    } catch (err) {
      // 실패 시 UI 롤백
      setEnabled(!nextEnabled);
      toast.error(err instanceof Error ? err.message : '토글에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await clearArtistNotice(artistId);
      setEnabled(false);
      setType('info');
      setMessage('');
      setMessageEn('');
      setActiveUntilLocal('');
      toast.success('공지를 삭제했습니다');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다');
    } finally {
      setSaving(false);
      setShowClearConfirm(false);
    }
  }

  return (
    <>
      <div ref={cardRef} id="notice">
        <AdminCard
          className={cn('p-6 transition-shadow', highlight && 'ring-2 ring-primary-a11y shadow-lg')}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-1">작가 페이지 공지</h2>
          <p className="text-sm text-gray-500 mb-4">
            작가 페이지와 그 작가의 모든 작품 상세 페이지에 동시에 노출됩니다.
            {artistName ? ` (${artistName})` : ''}
          </p>

          {/* 활성 토글 */}
          <label className="flex items-center justify-between gap-4 mb-6 cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">공지 활성</p>
              <p className="text-xs text-gray-500">
                {enabled ? '현재 작가 페이지·작품 상세에 공지가 표시됩니다' : '비활성 상태입니다'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggleOnly(e.target.checked)}
              disabled={saving || (!enabled && !canEnable)}
              className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-primary-a11y disabled:cursor-not-allowed disabled:opacity-50 relative before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
              aria-label="공지 활성"
            />
          </label>

          {/* 종류 */}
          <fieldset className="mb-5">
            <legend className="block text-sm font-medium text-gray-700 mb-2">종류</legend>
            <div className="flex flex-wrap gap-3">
              {NOTICE_TYPES.map((t) => (
                <label
                  key={t}
                  className={cn(
                    'cursor-pointer rounded-full border px-4 py-1.5 text-sm transition-colors',
                    type === t
                      ? 'border-primary-a11y bg-primary-surface text-primary-strong'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <input
                    type="radio"
                    name="notice-type"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="sr-only"
                  />
                  {TYPE_LABELS[t].ko} ({t})
                </label>
              ))}
            </div>
          </fieldset>

          {/* 자주 쓰는 문구 */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">자주 쓰는 문구</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 메시지 (한국어) */}
          <div className="mb-5">
            <label
              htmlFor="notice-message-ko"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              공지 메시지 (한국어, 필수)
            </label>
            <textarea
              id="notice-message-ko"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_HARD_LIMIT}
              placeholder="예: 5월 1일부터 가격이 10% 인상될 예정입니다."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">220자 이내 권장 — 모바일 가독성</span>
              <span className={cn(overSoft ? 'text-danger-a11y font-medium' : 'text-gray-400')}>
                {messageLength}/{MESSAGE_SOFT_LIMIT}
              </span>
            </div>
          </div>

          {/* 메시지 (영어) */}
          <div className="mb-5">
            <label
              htmlFor="notice-message-en"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              공지 메시지 (English, 선택)
            </label>
            <textarea
              id="notice-message-en"
              rows={3}
              value={messageEn}
              onChange={(e) => setMessageEn(e.target.value)}
              maxLength={MESSAGE_HARD_LIMIT}
              placeholder="e.g., Prices will increase by 10% on May 1."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
            <p className="mt-1 text-xs text-gray-400">
              비우면 영어 페이지(`/en/...`)에서는 미노출됩니다.
            </p>
          </div>

          {/* 만료 시각 */}
          <div className="mb-6">
            <label
              htmlFor="notice-active-until"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              만료 시각 (선택)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="notice-active-until"
                type="datetime-local"
                value={activeUntilLocal}
                onChange={(e) => setActiveUntilLocal(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickRange(7)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  지금부터 7일
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickRange(30)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  30일
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUntilLocal('')}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  지우기
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              비워두면 수동으로 끌 때까지 무기한 노출됩니다.
            </p>
            {activeUntilWarning && (
              <p className="mt-1 text-xs text-danger-a11y">{activeUntilWarning}</p>
            )}
          </div>

          {/* 미리보기 */}
          {trimmedMessage && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">미리보기</p>
                <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewLocale('ko')}
                    className={cn(
                      'px-3 py-1 rounded',
                      previewLocale === 'ko'
                        ? 'bg-primary-surface text-primary-strong'
                        : 'text-gray-500'
                    )}
                  >
                    ko
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLocale('en')}
                    className={cn(
                      'px-3 py-1 rounded',
                      previewLocale === 'en'
                        ? 'bg-primary-surface text-primary-strong'
                        : 'text-gray-500'
                    )}
                  >
                    en
                  </button>
                </div>
              </div>
              {previewMessage ? (
                <ArtistNoticeCard type={type} message={previewMessage} label={previewLabel} />
              ) : (
                <p className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-400">
                  영어 메시지가 비어있어 영어 페이지에는 표시되지 않습니다.
                </p>
              )}
            </div>
          )}

          {/* 마지막 수정 + 액션 */}
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              마지막 수정: {formatDateTime(initial.updated_at)}
              {initial.updated_by_email ? ` · ${initial.updated_by_email}` : ''}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="white"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                disabled={saving || !initial.message}
                className="text-danger-a11y hover:text-danger-a11y border-danger/30"
              >
                메시지 비우기
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || !canEnable || overHard || messageEnOver}
              >
                {saving ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
        title="공지 메시지 삭제"
        confirmText="삭제하기"
        variant="danger"
        isLoading={saving}
        description="공지 메시지를 영구 삭제할까요?\n메시지를 보존하면서 끄기만 하려면 '취소'를 누르고 활성 토글을 OFF하세요."
      />
    </>
  );
}
