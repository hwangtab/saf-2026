'use client';

import { useState, useTransition } from 'react';

import { ArtworkSearchSelect } from '@/app/(portal)/admin/email/_components/ArtworkSearchSelect';
import { RichEmailEditor } from '@/app/(portal)/admin/email/_components/RichEmailEditor';
import { uploadEmailBroadcastImage } from '@/app/actions/admin-broadcast';
import { getNewsletterArtworkSnapshot } from '@/app/actions/admin-newsletter';
import SafeImage from '@/components/common/SafeImage';
import type {
  ArtworkCardBlock,
  ButtonBlock,
  CoverBlock,
  EventBannerBlock,
  NewsletterBlock,
  TextBlock,
} from '@/lib/newsletter/blocks';

export function createBlock(type: NewsletterBlock['type']): NewsletterBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case 'cover':
      return { id, type: 'cover', title: '', subtitle: '', imageUrl: '' };
    case 'text':
      return { id, type: 'text', html: '<p></p>' };
    case 'artworkCard':
      return {
        id,
        type: 'artworkCard',
        artworkId: '',
        showPrice: true,
        snapshot: { title: '', artistName: '', imageUrl: '', description: '', price: '', url: '' },
      };
    case 'eventBanner':
      return {
        id,
        type: 'eventBanner',
        title: '',
        dateText: '',
        imageUrl: '',
        ctaLabel: '자세히 보기',
        ctaUrl: '',
      };
    case 'button':
      return { id, type: 'button', label: '', url: '' };
    case 'divider':
      return { id, type: 'divider' };
  }
}

const INPUT_CLASS =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-canvas-strong disabled:text-charcoal-muted';

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-charcoal-muted">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}

// 이미지 URL 필드 — 직접 붙여넣기 + 파일 업로드(기존 email-broadcasts 스토리지 경로 재사용)
function ImageField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [isUploading, startUpload] = useTransition();
  const [error, setError] = useState('');

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-charcoal-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder="https:// 이미지 URL 또는 파일 업로드"
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        />
        <label className="shrink-0 cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-charcoal hover:bg-canvas-soft">
          업로드
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            disabled={disabled || isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('file', file);
              startUpload(async () => {
                const result = await uploadEmailBroadcastImage(formData);
                if (result.error || !result.url) {
                  setError(result.message);
                  return;
                }
                setError('');
                onChange(result.url);
              });
            }}
          />
        </label>
      </div>
      {isUploading && <p className="text-xs text-charcoal-muted">업로드 중…</p>}
      {error && <p className="text-xs text-danger-a11y">{error}</p>}
      {value && (
        <SafeImage
          src={value}
          alt=""
          width={240}
          height={140}
          className="h-auto w-40 rounded border border-gray-200 object-cover"
        />
      )}
    </div>
  );
}

function CoverEditor({
  block,
  onChange,
  readOnly,
}: {
  block: CoverBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="커버 제목"
        value={block.title}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, title: v })}
      />
      <Field
        label="부제 (선택)"
        value={block.subtitle}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, subtitle: v })}
      />
      <ImageField
        label="커버 이미지 (선택)"
        value={block.imageUrl}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, imageUrl: v })}
      />
    </div>
  );
}

function TextEditor({
  block,
  onChange,
  readOnly,
}: {
  block: TextBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  if (readOnly) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-canvas-soft p-3 text-sm text-charcoal"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }
  return (
    <RichEmailEditor
      value={block.html}
      onChange={({ html }) => onChange({ ...block, html })}
      onDirty={() => {}}
    />
  );
}

function ArtworkCardEditor({
  block,
  onChange,
  readOnly,
}: {
  block: ArtworkCardBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  const [isLoading, startLoading] = useTransition();
  const [error, setError] = useState('');

  const loadSnapshot = (artworkId: string) => {
    if (!artworkId) return;
    startLoading(async () => {
      const result = await getNewsletterArtworkSnapshot(artworkId);
      if (result.error || !result.snapshot) {
        setError(result.message);
        return;
      }
      setError('');
      onChange({ ...block, artworkId, snapshot: result.snapshot });
    });
  };

  if (!block.snapshot.title) {
    return (
      <div className="space-y-2">
        <ArtworkSearchSelect value={block.artworkId} onChange={loadSnapshot} />
        {isLoading && <p className="text-xs text-charcoal-muted">작품 정보 불러오는 중…</p>}
        {error && <p className="text-xs text-danger-a11y">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-canvas-soft p-3">
        {block.snapshot.imageUrl && (
          <SafeImage
            src={block.snapshot.imageUrl}
            alt={block.snapshot.title}
            width={96}
            height={96}
            className="h-16 w-16 shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal-deep">
            {block.snapshot.title}
          </p>
          <p className="truncate text-xs text-charcoal-muted">{block.snapshot.artistName}</p>
          {block.snapshot.price && (
            <p className="text-xs font-medium text-sun-strong">{block.snapshot.price}</p>
          )}
        </div>
        {!readOnly && (
          <div className="flex shrink-0 flex-col gap-1 text-xs">
            <button
              type="button"
              onClick={() => loadSnapshot(block.artworkId)}
              className="text-primary-strong underline underline-offset-2"
            >
              {isLoading ? '갱신 중…' : '정보 새로고침'}
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...block,
                  artworkId: '',
                  snapshot: {
                    title: '',
                    artistName: '',
                    imageUrl: '',
                    description: '',
                    price: '',
                    url: '',
                  },
                })
              }
              className="text-charcoal-muted underline underline-offset-2"
            >
              다른 작품 선택
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger-a11y">{error}</p>}
      <label className="block space-y-1">
        <span className="text-xs font-medium text-charcoal-muted">
          소개글 (이 호에 맞게 수정 가능)
        </span>
        <textarea
          value={block.snapshot.description}
          disabled={readOnly}
          rows={4}
          onChange={(e) =>
            onChange({ ...block, snapshot: { ...block.snapshot, description: e.target.value } })
          }
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={block.showPrice}
          disabled={readOnly}
          onChange={(e) => onChange({ ...block, showPrice: e.target.checked })}
        />
        가격 표시
      </label>
    </div>
  );
}

function EventBannerEditor({
  block,
  onChange,
  readOnly,
}: {
  block: EventBannerBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="이벤트 제목"
        value={block.title}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, title: v })}
      />
      <Field
        label="일시 문구 (선택)"
        value={block.dateText}
        disabled={readOnly}
        placeholder="예: 2026. 7. 15 — 7. 30"
        onChange={(v) => onChange({ ...block, dateText: v })}
      />
      <ImageField
        label="배너 이미지 (선택)"
        value={block.imageUrl}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, imageUrl: v })}
      />
      <Field
        label="버튼 문구"
        value={block.ctaLabel}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, ctaLabel: v })}
      />
      <Field
        label="버튼 링크 (https://)"
        value={block.ctaUrl}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, ctaUrl: v })}
      />
    </div>
  );
}

function ButtonEditor({
  block,
  onChange,
  readOnly,
}: {
  block: ButtonBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="버튼 문구"
        value={block.label}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, label: v })}
      />
      <Field
        label="버튼 링크 (https://)"
        value={block.url}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, url: v })}
      />
    </div>
  );
}

export function BlockEditor({
  block,
  onChange,
  readOnly,
}: {
  block: NewsletterBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  switch (block.type) {
    case 'cover':
      return <CoverEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'text':
      return <TextEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'artworkCard':
      return <ArtworkCardEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'eventBanner':
      return <EventBannerEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'button':
      return <ButtonEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'divider':
      return <p className="text-xs text-charcoal-soft">구분선 — 설정할 내용이 없습니다.</p>;
  }
}
