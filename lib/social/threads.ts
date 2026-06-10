import { fetchPermalink, metaGet, metaPost } from './meta-graph';
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
    const creds = getCredentials();
    if (!creds) {
      throw new SocialPublishError(
        'Threads 환경 변수(THREADS_USER_ID, THREADS_ACCESS_TOKEN)가 설정되지 않았습니다.'
      );
    }

    const { userId, accessToken } = creds;
    const mediaType = imageUrl ? 'IMAGE' : 'TEXT';

    if (mediaType === 'TEXT' && !caption.trim()) {
      throw new SocialPublishError('Threads 텍스트 게시에는 본문이 필요합니다.');
    }

    // 1) 컨테이너 생성
    const containerParams: Record<string, string> = {
      media_type: mediaType,
      text: caption,
      access_token: accessToken,
    };
    if (imageUrl) containerParams.image_url = imageUrl;

    const container = await metaPost(`${BASE_URL}/${userId}/threads`, containerParams);
    const creationId = typeof container.id === 'string' ? container.id : null;
    if (!creationId) {
      throw new SocialPublishError('Threads 미디어 컨테이너 생성에 실패했습니다.', container);
    }

    // 2) 처리 대기 후 게시
    await waitUntilReady(creationId, accessToken);
    const published = await metaPost(`${BASE_URL}/${userId}/threads_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
    const mediaId = typeof published.id === 'string' ? published.id : null;
    if (!mediaId) {
      throw new SocialPublishError('Threads 게시에 실패했습니다.', published);
    }

    // 3) permalink 조회 (best effort)
    const permalink = await fetchPermalink(BASE_URL, mediaId, accessToken);

    return { platformPostId: mediaId, permalink };
  },
};
