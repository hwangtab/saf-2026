import { fetchPermalink, metaGet, metaPost } from './meta-graph';
import { splitIntoThreadSegments, THREADS_MAX_LEN } from './thread-split';
import { resolveAccessToken } from './token-store';
import {
  SocialPublishError,
  type PublishInput,
  type PublishResult,
  type SocialAdapter,
} from './types';

const GRAPH_VERSION = 'v1.0';
const BASE_URL = `https://graph.threads.net/${GRAPH_VERSION}`;

// 컨테이너 처리 대기 폴링 (Threads는 게시 전 처리 시간이 필요할 수 있음).
const MAX_STATUS_CHECKS = 8;
const STATUS_POLL_INTERVAL_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCredentials(): { userId: string; accessToken: string } | null {
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !accessToken) return null;
  return { userId, accessToken };
}

async function waitUntilReady(containerId: string, accessToken: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_STATUS_CHECKS; attempt += 1) {
    const json = await metaGet(
      `${BASE_URL}/${containerId}?fields=status&access_token=${encodeURIComponent(accessToken)}`
    );
    const status = typeof json.status === 'string' ? json.status : '';
    if (status === 'FINISHED' || status === 'PUBLISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new SocialPublishError(`Threads 미디어 처리에 실패했습니다 (status: ${status}).`, json);
    }
    await sleep(STATUS_POLL_INTERVAL_MS);
  }
  // 마지막까지 FINISHED가 아니어도 publish를 시도(텍스트 게시는 즉시 가능한 경우가 많음).
}

export const threadsAdapter: SocialAdapter = {
  platform: 'threads',

  isConfigured() {
    return getCredentials() !== null;
  },

  async publish({ caption, imageUrl }: PublishInput): Promise<PublishResult> {
    const userId = process.env.THREADS_USER_ID;
    if (!userId) {
      throw new SocialPublishError('Threads 환경 변수(THREADS_USER_ID)가 설정되지 않았습니다.');
    }

    // 토큰은 DB(cron 갱신본) 우선, 없으면 env fallback — 60일 만료 자동 회피.
    const accessToken = await resolveAccessToken(
      'threads',
      process.env.THREADS_ACCESS_TOKEN ?? null
    );
    if (!accessToken) {
      throw new SocialPublishError('Threads 액세스 토큰이 설정되지 않았습니다.');
    }

    const segments = splitIntoThreadSegments(caption, THREADS_MAX_LEN);
    if (segments.length === 0 && !imageUrl) {
      throw new SocialPublishError('Threads 게시에는 본문 또는 이미지가 필요합니다.');
    }

    // 컨테이너 생성 → 처리 대기 → publish → media_id 반환.
    const publishOne = async (params: Record<string, string>): Promise<string> => {
      const container = await metaPost(`${BASE_URL}/${userId}/threads`, params);
      const creationId = typeof container.id === 'string' ? container.id : null;
      if (!creationId) {
        throw new SocialPublishError('Threads 미디어 컨테이너 생성에 실패했습니다.', container);
      }
      await waitUntilReady(creationId, accessToken);
      const published = await metaPost(`${BASE_URL}/${userId}/threads_publish`, {
        creation_id: creationId,
        access_token: accessToken,
      });
      const mediaId = typeof published.id === 'string' ? published.id : null;
      if (!mediaId) {
        throw new SocialPublishError('Threads 게시에 실패했습니다.', published);
      }
      return mediaId;
    };

    // 첫 글은 이미지(있으면)+첫 세그먼트, 이후 세그먼트는 직전 글에 답글로 체인(=스레드).
    const textSegments = segments.length > 0 ? segments : [''];
    let firstMediaId: string | null = null;
    let prevMediaId: string | null = null;

    for (let i = 0; i < textSegments.length; i += 1) {
      const seg = textSegments[i];
      const params: Record<string, string> = { access_token: accessToken };
      if (i === 0 && imageUrl) {
        params.media_type = 'IMAGE';
        params.image_url = imageUrl;
        if (seg) params.text = seg;
      } else {
        params.media_type = 'TEXT';
        params.text = seg;
      }
      if (prevMediaId) params.reply_to_id = prevMediaId;

      const mediaId = await publishOne(params);
      if (i === 0) firstMediaId = mediaId;
      prevMediaId = mediaId;
    }

    if (!firstMediaId) {
      throw new SocialPublishError('Threads 게시에 실패했습니다.');
    }

    // permalink는 스레드 첫 글 기준(best effort)
    const permalink = await fetchPermalink(BASE_URL, firstMediaId, accessToken);
    return { platformPostId: firstMediaId, permalink };
  },
};
