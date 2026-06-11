import { fetchPermalink, isRetryableMetaError, metaGet, metaPost } from './meta-graph';
import { sleep } from './sleep';
import { clampForSinglePost, stripThreadDelimiters } from './thread-split';
import { resolveAccessToken } from './token-store';
import {
  SocialPublishError,
  type PublishInput,
  type PublishResult,
  type SocialAdapter,
} from './types';

const GRAPH_VERSION = 'v21.0';
const BASE_URL = `https://graph.instagram.com/${GRAPH_VERSION}`;
const IG_CAPTION_MAX = 2200; // Instagram caption 상한
const MAX_STATUS_CHECKS = 15;
const STATUS_POLL_INTERVAL_MS = 2500;
const MAX_PUBLISH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 3000;

function getCredentials(): { userId: string; accessToken: string } | null {
  const userId = process.env.INSTAGRAM_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!userId || !accessToken) return null;
  return { userId, accessToken };
}

/** 컨테이너가 FINISHED 될 때까지 대기. 안 익은 채 publish하면 "Media ID is not available". */
async function waitUntilReady(containerId: string, accessToken: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_STATUS_CHECKS; attempt += 1) {
    const json = await metaGet(
      `${BASE_URL}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`
    );
    const status = typeof json.status_code === 'string' ? json.status_code : '';
    if (status === 'FINISHED' || status === 'PUBLISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new SocialPublishError(`Instagram 미디어 처리에 실패했습니다 (status: ${status}).`, json);
    }
    await sleep(STATUS_POLL_INTERVAL_MS);
  }
  throw new SocialPublishError(
    'Instagram 미디어 처리가 지연되어 게시하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    null,
    24
  );
}

export const instagramAdapter: SocialAdapter = {
  platform: 'instagram',

  isConfigured() {
    return getCredentials() !== null;
  },

  async publish({ caption, imageUrl }: PublishInput): Promise<PublishResult> {
    const userId = process.env.INSTAGRAM_USER_ID;
    if (!userId) {
      throw new SocialPublishError('Instagram 환경 변수(INSTAGRAM_USER_ID)가 설정되지 않았습니다.');
    }
    if (!imageUrl) {
      throw new SocialPublishError('Instagram 게시에는 이미지가 필요합니다.');
    }

    // 토큰은 DB(cron 갱신본) 우선, 없으면 env fallback — 60일 만료 자동 회피.
    const accessToken = await resolveAccessToken(
      'instagram',
      process.env.INSTAGRAM_ACCESS_TOKEN ?? null
    );
    if (!accessToken) {
      throw new SocialPublishError('Instagram 액세스 토큰이 설정되지 않았습니다.');
    }

    // 캡션 정리: 스레드 구분자(---) 제거 + 단어/링크 보존하며 2200자 안전 축약.
    const igCaption = clampForSinglePost(stripThreadDelimiters(caption), IG_CAPTION_MAX);

    // 컨테이너 생성 → 처리 대기(FINISHED) → publish. 일시 오류면 컨테이너 새로 만들어 재시도.
    const publishOnce = async (): Promise<string> => {
      const container = await metaPost(`${BASE_URL}/${userId}/media`, {
        image_url: imageUrl,
        caption: igCaption,
        access_token: accessToken,
      });
      const creationId = typeof container.id === 'string' ? container.id : null;
      if (!creationId) {
        throw new SocialPublishError('Instagram 미디어 컨테이너 생성에 실패했습니다.', container);
      }
      await waitUntilReady(creationId, accessToken);
      const published = await metaPost(`${BASE_URL}/${userId}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken,
      });
      const mediaId = typeof published.id === 'string' ? published.id : null;
      if (!mediaId) {
        throw new SocialPublishError('Instagram 게시에 실패했습니다.', published);
      }
      return mediaId;
    };

    let mediaId: string | null = null;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_PUBLISH_ATTEMPTS; attempt += 1) {
      try {
        mediaId = await publishOnce();
        break;
      } catch (err) {
        lastErr = err;
        const transient = isRetryableMetaError(err) || /not available/i.test((err as Error).message);
        if (transient && attempt < MAX_PUBLISH_ATTEMPTS) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        throw err;
      }
    }
    if (!mediaId) throw lastErr ?? new SocialPublishError('Instagram 게시에 실패했습니다.');

    const permalink = await fetchPermalink(BASE_URL, mediaId, accessToken);
    return { platformPostId: mediaId, permalink };
  },
};
