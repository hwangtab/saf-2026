'use client';

import { useEffect, useState } from 'react';
import { getPetitionOptions } from '@/app/actions/admin-broadcast';
import { AudiencePreview } from './AudiencePreview';
import type { BroadcastChannel } from '@/lib/email/audiences/types';

export interface SegmentSelection {
  channel: BroadcastChannel; // 'member' | 'customer' | 'petition' (individual은 검색 모드에서 별도 처리)
  subset: 'all' | 'artist' | 'exhibitor';
  petitionSlug: string;
  artworkId: string;
  isArtworkBuyer: boolean;
  advertising: boolean;
}

interface Props {
  value: SegmentSelection;
  onChange: (v: SegmentSelection) => void;
}

export function AudienceSelector({ value, onChange }: Props) {
  const [petitions, setPetitions] = useState<Array<{ slug: string; title: string }>>([]);
  useEffect(() => {
    getPetitionOptions().then(setPetitions);
  }, []);
  const set = (patch: Partial<SegmentSelection>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="seg-channel" className="mb-1 block text-sm font-medium text-charcoal">
          수신자 그룹
        </label>
        <select
          id="seg-channel"
          value={value.isArtworkBuyer ? 'artwork-buyer' : value.channel}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'artwork-buyer') set({ channel: 'customer', isArtworkBuyer: true });
            else set({ channel: v as BroadcastChannel, isArtworkBuyer: false });
          }}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="member">작가·출품자 업무</option>
          <option value="customer">고객 마케팅 (광고)</option>
          <option value="petition">청원 캠페인 알림</option>
          <option value="artwork-buyer">특정 작품 구매자</option>
        </select>
      </div>

      {value.channel === 'member' && !value.isArtworkBuyer && (
        <select
          aria-label="작가 출품자 구분"
          value={value.subset}
          onChange={(e) => set({ subset: e.target.value as SegmentSelection['subset'] })}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">전체 (작가+출품자)</option>
          <option value="artist">작가만</option>
          <option value="exhibitor">출품자만</option>
        </select>
      )}

      {value.channel === 'petition' && (
        <select
          aria-label="청원 선택"
          value={value.petitionSlug}
          onChange={(e) => set({ petitionSlug: e.target.value })}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">청원을 선택하세요</option>
          {petitions.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
      )}

      {value.isArtworkBuyer && (
        <>
          <input
            aria-label="작품 ID"
            type="text"
            value={value.artworkId}
            onChange={(e) => set({ artworkId: e.target.value })}
            placeholder="작품 ID(UUID)"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={value.advertising}
              onChange={(e) => set({ advertising: e.target.checked })}
              className="rounded border-gray-300"
            />
            광고성 메일 (수신자에게 &ldquo;(광고)&rdquo; 표기·발송사 정보 포함, 최근 6개월 구매자로
            제한)
          </label>
        </>
      )}

      <AudiencePreview
        channel={value.channel}
        filter={{
          subset: value.subset,
          petitionSlug: value.petitionSlug || undefined,
          artworkId: value.isArtworkBuyer ? value.artworkId || undefined : undefined,
          advertising: value.advertising,
        }}
      />
    </div>
  );
}
