'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/ui/Button';
import { ArtworkSearchSelect } from '@/app/(portal)/admin/email/_components/ArtworkSearchSelect';
import { prepareSocialDraft, publishSocialPost } from '@/app/actions/admin-social';
import { SOCIAL_PLATFORMS, type Platform } from '@/lib/social/types';
import {
  AdminCard,
  AdminFieldLabel,
  AdminInput,
  AdminTextarea,
} from '@/app/(portal)/admin/_components/admin-ui';
import { PostHistoryBadge } from './PostHistoryBadge';
import { SaleStatusGuard } from './SaleStatusGuard';

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  threads: 'Threads',
};

interface ConfigStatus {
  platform: Platform;
  configured: boolean;
}

interface ResultLine {
  platform: Platform;
  message: string;
  error: boolean;
}

interface DraftMeta {
  status: string;
  isHidden: boolean;
  postCount: number;
  lastPublishedAt: string | null;
}

export function SocialComposer({
  selectedArtworkId,
  onArtworkChange,
  configStatus,
}: {
  selectedArtworkId: string;
  onArtworkChange: (id: string) => void;
  configStatus: ConfigStatus[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    () => new Set(configStatus.filter((c) => c.configured).map((c) => c.platform))
  );
  const [results, setResults] = useState<ResultLine[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);

  const configuredMap = new Map(configStatus.map((c) => [c.platform, c.configured]));
  const anyConfigured = configStatus.some((c) => c.configured);

  // 선택 작품이 바뀌면 즉시 리셋 — effect 내 동기 setState(cascading render) 대신
  // React 권장 "렌더 중 상태 조정" 패턴 사용(ArtworkSearchSelect와 동일).
  const [prevArtworkId, setPrevArtworkId] = useState(selectedArtworkId);
  if (selectedArtworkId !== prevArtworkId) {
    setPrevArtworkId(selectedArtworkId);
    setCaption('');
    setImageUrl('');
    setDraftMeta(null);
    setResults([]);
    setDraftLoading(Boolean(selectedArtworkId));
  }

  // 캡션·이미지·가드 데이터 비동기 로드(setState는 async 콜백 내에서만).
  useEffect(() => {
    if (!selectedArtworkId) return;
    let ignore = false;
    prepareSocialDraft(selectedArtworkId).then((draft) => {
      if (ignore) return;
      setCaption(draft.caption);
      setImageUrl(draft.imageUrl ?? '');
      setDraftMeta({
        status: draft.status,
        isHidden: draft.isHidden,
        postCount: draft.postCount,
        lastPublishedAt: draft.lastPublishedAt,
      });
      setDraftLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [selectedArtworkId]);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const canSubmit =
    !isPending && caption.trim().length > 0 && selectedPlatforms.size > 0 && anyConfigured;

  const handlePublish = () => {
    setResults([]);
    startTransition(async () => {
      const platforms = Array.from(selectedPlatforms);
      const lines: ResultLine[] = [];
      for (const platform of platforms) {
        const res = await publishSocialPost({
          platform,
          artworkId: selectedArtworkId || null,
          caption,
          imageUrl: imageUrl || null,
        });
        lines.push({ platform, message: res.message, error: Boolean(res.error) });
      }
      setResults(lines);
      router.refresh();
    });
  };

  return (
    <AdminCard className="p-6">
      <h2 className="mb-4 text-sm font-semibold text-charcoal-deep">새 게시</h2>

      {!anyConfigured && (
        <p className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger-a11y">
          연결된 소셜 계정이 없습니다. 환경 변수(INSTAGRAM_ACCESS_TOKEN 등)를 설정하면 게시할 수
          있습니다.
        </p>
      )}

      <div className="space-y-5">
        <div>
          <ArtworkSearchSelect value={selectedArtworkId} onChange={onArtworkChange} />
        </div>

        {selectedArtworkId && draftMeta && (
          <div className="space-y-2">
            <PostHistoryBadge
              postCount={draftMeta.postCount}
              lastPublishedAt={draftMeta.lastPublishedAt}
            />
            <SaleStatusGuard status={draftMeta.status} isHidden={draftMeta.isHidden} />
          </div>
        )}

        <div>
          <AdminFieldLabel htmlFor="social-caption">캡션</AdminFieldLabel>
          <AdminTextarea
            id="social-caption"
            rows={10}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={
              draftLoading ? '캡션 초안을 불러오는 중…' : '작품을 선택하면 캡션 초안이 채워집니다.'
            }
          />
          <p className="mt-1 text-xs text-charcoal-soft">{caption.length} / 2200자</p>
        </div>

        <div>
          <AdminFieldLabel htmlFor="social-image">이미지 URL</AdminFieldLabel>
          <AdminInput
            id="social-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="공개 이미지 URL (Instagram은 필수, JPEG 권장)"
          />
          {imageUrl && (
            <div className="relative mt-3 aspect-square w-40 overflow-hidden rounded-lg border border-gallery-hairline bg-canvas-strong">
              <SafeImage src={imageUrl} alt="게시 이미지 미리보기" fill className="object-cover" />
            </div>
          )}
        </div>

        <div>
          <AdminFieldLabel>게시할 플랫폼</AdminFieldLabel>
          <div className="flex flex-wrap gap-3">
            {SOCIAL_PLATFORMS.map((platform) => {
              const configured = configuredMap.get(platform) ?? false;
              const checked = selectedPlatforms.has(platform);
              return (
                <label
                  key={platform}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    configured
                      ? 'cursor-pointer border-gallery-hairline'
                      : 'cursor-not-allowed border-gallery-hairline opacity-50'
                  } ${checked && configured ? 'border-primary bg-primary/5' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={!configured}
                    checked={checked && configured}
                    onChange={() => togglePlatform(platform)}
                    className="accent-primary"
                  />
                  <span className="font-medium text-charcoal">{PLATFORM_LABELS[platform]}</span>
                  {!configured && <span className="text-xs text-charcoal-soft">(미설정)</span>}
                </label>
              );
            })}
          </div>
        </div>

        {results.length > 0 && (
          <ul className="space-y-1 text-sm">
            {results.map((line) => (
              <li
                key={line.platform}
                className={line.error ? 'text-danger-a11y' : 'text-success-a11y'}
              >
                <span className="font-semibold">{PLATFORM_LABELS[line.platform]}</span>:{' '}
                {line.message}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={!canSubmit}
            loading={isPending}
          >
            게시하기
          </Button>
        </div>
      </div>
    </AdminCard>
  );
}
