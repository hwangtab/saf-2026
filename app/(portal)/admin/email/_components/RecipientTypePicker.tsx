'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import { AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';
import {
  RECIPIENT_KINDS,
  RECIPIENT_KIND_META,
  defaultSegment,
  type MemberSubset,
  type RecipientKind,
  type RecipientSegment,
  type SelectedContact,
} from '@/lib/email/broadcast-segment';
import { ContactSearch } from './ContactSearch';
import { ArtworkSearchSelect } from './ArtworkSearchSelect';
import { FIELD_FOCUS } from './field-styles';

export interface PetitionOption {
  slug: string;
  title: string;
  isActive: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  segment: RecipientSegment;
  onSegmentChange: (next: RecipientSegment) => void;
  petitions: PetitionOption[];
  petitionsLoaded?: boolean;
  // direct 모드에서 입력 중인 유효 이메일이 아직 "추가" 안 됨 → 발송 차단용
  onManualPendingChange?: (pending: boolean) => void;
}

function advertisingBadge(kind: RecipientKind) {
  const meta = RECIPIENT_KIND_META[kind];
  // 광고가 법적으로 고정인 종류만 카드에 배지 표시.
  // optional(작품 구매자·직접 지정)은 광고 여부를 아래 체크박스로 정하므로 카드에 광고 라벨을 붙이지 않는다.
  if (meta.advertising === 'always') return <AdminBadge tone="info">광고</AdminBadge>;
  if (meta.advertising === 'never') return <AdminBadge tone="success">정보성</AdminBadge>;
  return null;
}

export function RecipientTypePicker({
  segment,
  onSegmentChange,
  petitions,
  petitionsLoaded = true,
  onManualPendingChange,
}: Props) {
  const [manualEmails, setManualEmails] = useState('');

  // 직접 입력 textarea 파싱: 유효/형식오류/중복/이미추가됨 집계 (기존 BroadcastForm 로직 보존).
  const manualSummary = useMemo(() => {
    const selectedContacts = segment.kind === 'direct' ? segment.contacts : [];
    const tokens = manualEmails
      .split(/[\s,;]+/)
      .map((token) => token.toLowerCase().trim())
      .filter(Boolean);
    const seen = new Set<string>();
    let valid = 0;
    let invalid = 0;
    let duplicate = 0;
    let alreadySelected = 0;

    for (const token of tokens) {
      if (!EMAIL_RE.test(token)) {
        invalid += 1;
        continue;
      }
      if (seen.has(token)) {
        duplicate += 1;
        continue;
      }
      seen.add(token);
      if (selectedContacts.some((contact) => contact.email.toLowerCase() === token)) {
        alreadySelected += 1;
        continue;
      }
      valid += 1;
    }

    return { tokens, valid, invalid, duplicate, alreadySelected };
  }, [manualEmails, segment]);

  // 입력 중인 유효 이메일이 남아 있으면(추가 미클릭) 발송 차단 신호.
  useEffect(() => {
    onManualPendingChange?.(segment.kind === 'direct' && manualSummary.valid > 0);
  }, [segment.kind, manualSummary.valid, onManualPendingChange]);

  const selectKind = (kind: RecipientKind) => {
    if (kind === segment.kind) return;
    setManualEmails('');
    onSegmentChange(defaultSegment(kind));
  };

  const addManualRecipients = () => {
    if (segment.kind !== 'direct') return;
    const existing = new Set(segment.contacts.map((c) => c.email.toLowerCase()));
    const next: SelectedContact[] = [];
    const seen = new Set<string>();
    for (const token of manualSummary.tokens) {
      if (!EMAIL_RE.test(token) || seen.has(token) || existing.has(token)) continue;
      seen.add(token);
      next.push({ email: token, name: null });
    }
    if (next.length === 0) return;
    onSegmentChange({ ...segment, contacts: [...segment.contacts, ...next] });
    setManualEmails('');
  };

  return (
    <div className="space-y-4">
      {/* 타입 카드 */}
      <fieldset>
        <legend className="sr-only">받는 사람 유형</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RECIPIENT_KINDS.map((kind) => {
            const meta = RECIPIENT_KIND_META[kind];
            const active = segment.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => selectKind(kind)}
                className={clsx(
                  'flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary-surface ring-1 ring-primary/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-canvas-soft'
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={clsx(
                      'text-sm font-semibold',
                      active ? 'text-primary-strong' : 'text-charcoal-deep'
                    )}
                  >
                    {meta.label}
                  </span>
                  {advertisingBadge(kind)}
                </span>
                <span className="text-xs leading-relaxed text-charcoal-muted">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 2차 필터 — 종류별 */}
      {segment.kind === 'member' && (
        <div>
          <label htmlFor="seg-subset" className="mb-1 block text-sm font-medium text-charcoal">
            발송 범위
          </label>
          <select
            id="seg-subset"
            value={segment.subset}
            onChange={(e) =>
              onSegmentChange({ ...segment, subset: e.target.value as MemberSubset })
            }
            className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${FIELD_FOCUS}`}
          >
            <option value="all">전체 (작가+출품자)</option>
            <option value="artist">작가만</option>
            <option value="exhibitor">출품자만</option>
          </select>
        </div>
      )}

      {segment.kind === 'customer' && (
        <p className="rounded-lg bg-primary-surface px-3 py-2 text-xs text-primary-strong">
          마케팅 수신 동의 고객과 최근 6개월 거래 고객 전체에게 발송됩니다. 정보통신망법에 따라 항상
          광고로 표기됩니다.
        </p>
      )}

      {segment.kind === 'petition' && (
        <div>
          <label htmlFor="seg-petition" className="mb-1 block text-sm font-medium text-charcoal">
            청원 선택
          </label>
          <select
            id="seg-petition"
            value={segment.petitionSlug}
            disabled={!petitionsLoaded || petitions.length === 0}
            onChange={(e) => onSegmentChange({ ...segment, petitionSlug: e.target.value })}
            className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-canvas-strong disabled:text-charcoal-soft ${FIELD_FOCUS}`}
          >
            <option value="">
              {!petitionsLoaded
                ? '청원 목록 불러오는 중…'
                : petitions.length === 0
                  ? '등록된 청원이 없습니다'
                  : '청원을 선택하세요'}
            </option>
            {petitions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.isActive ? '[진행] ' : '[종료] '}
                {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {segment.kind === 'artwork-buyer' && (
        <div className="space-y-3">
          <ArtworkSearchSelect
            value={segment.artworkId}
            onChange={(artworkId) => onSegmentChange({ ...segment, artworkId })}
          />
          <label className="flex cursor-pointer items-start gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={segment.advertising}
              onChange={(e) => onSegmentChange({ ...segment, advertising: e.target.checked })}
              className="mt-0.5 rounded border-gray-300"
            />
            <span>
              광고로 표기해서 보내기
              <span className="block text-xs text-charcoal-muted">
                체크 시 “(광고)” 표기·발송사 정보가 포함되고 대상이 최근 6개월 구매자로 제한됩니다.
                기본은 정보성(전체 구매자 대상 개별 안내).
              </span>
            </span>
          </label>
        </div>
      )}

      {segment.kind === 'direct' && (
        <div className="space-y-4">
          <ContactSearch
            selected={segment.contacts}
            onChange={(contacts) => onSegmentChange({ ...segment, contacts })}
          />

          <div className="space-y-2">
            <label
              htmlFor="broadcast-manual-emails"
              className="block text-sm font-medium text-charcoal"
            >
              이메일 직접 추가
            </label>
            <textarea
              id="broadcast-manual-emails"
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              rows={3}
              placeholder={'name@example.com, another@example.com\n줄바꿈 또는 쉼표로 구분'}
              className={`block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm ${FIELD_FOCUS}`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p aria-live="polite" className="text-xs text-charcoal-muted">
                추가 가능 {manualSummary.valid.toLocaleString('ko-KR')}명
                {manualSummary.invalid > 0 &&
                  ` · 형식 오류 ${manualSummary.invalid.toLocaleString('ko-KR')}건`}
                {manualSummary.duplicate > 0 &&
                  ` · 입력 중복 ${manualSummary.duplicate.toLocaleString('ko-KR')}건`}
                {manualSummary.alreadySelected > 0 &&
                  ` · 이미 추가됨 ${manualSummary.alreadySelected.toLocaleString('ko-KR')}건`}
              </p>
              <button
                type="button"
                onClick={addManualRecipients}
                disabled={manualSummary.valid === 0}
                className="rounded-lg border border-primary-strong px-3 py-1.5 text-sm font-medium text-primary-strong hover:bg-primary-soft disabled:opacity-50"
              >
                입력한 이메일 추가
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={segment.advertising}
              onChange={(e) => onSegmentChange({ ...segment, advertising: e.target.checked })}
              className="mt-0.5 rounded border-gray-300"
            />
            <span>
              광고성 메일로 보내기 (체크 시 “(광고)” 표기·발송사 정보 포함)
              <span className="block text-xs text-charcoal-muted">
                문의 답변·개별 안내 등 정보성 메일이면 체크하지 마세요.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
