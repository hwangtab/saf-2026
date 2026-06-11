import { fetchPermalink, isRetryableMetaError, metaGet, metaPost } from './meta-graph';
import { sleep } from './sleep';
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

// 컨테이너 처리 대기 폴링 (Threads는 게시 전 처리 시간이 필요).
const MAX_STATUS_CHECKS = 20;
const STATUS_POLL_INTERVAL_MS = 3000;
// 답글 체인에서 연속 게시 시 버스트 제한 회피용 세그먼트 간 지연.
const INTER_SEGMENT_DELAY_MS = 1500;
// 일시 오류(미디어 미준비 등) 발생 시 컨테이너를 새로 만들어 재시도.
const MAX_PUBLISH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

function getCredentials(): { userId: string; accessToken: string } | null {
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !accessToken) return null;
  return { userId, accessToken };
}

/**
 * 컨테이너가 FINISHED 될 때까지 대기. 끝까지 안 되면 throw(안 익은 컨테이너 발행 금지).
 * 과거엔 타임아웃 시 그냥 publish를 시도해 "미디어를 찾을 수 없음"(code 24)으로 스레드가 끊겼다.
 */
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
  throw new SocialPublishError(
    'Threads 미디어 처리가 지연되어 게시하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    null,
    24
  );
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

    // 컨테이너 생성 → 처리 대기(FINISHED 확인) → publish → media_id.
    const publishOnce = async (params: Record<string, string>): Promise<string> => {
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

    // 일시 오류면 컨테이너를 새로 만들어 재시도(백오프).
    const publishOne = async (params: Record<string, string>): Promise<string> => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= MAX_PUBLISH_ATTEMPTS; attempt += 1) {
        try {
          return await publishOnce(params);
        } catch (err) {
          lastErr = err;
          if (isRetryableMetaError(err) && attempt < MAX_PUBLISH_ATTEMPTS) {
            await sleep(RETRY_BASE_DELAY_MS * attempt);
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    // 첫 글은 이미지(있으면)+첫 세그먼트, 이후 세그먼트는 직전 글에 답글로 체인(=스레드).
    const textSegments = segments.length > 0 ? segments : [''];
    let firstMediaId: string | null = null;
    let prevMediaId: string | null = null;
    let posted = 0;

    try {
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
        posted += 1;

        if (i < textSegments.length - 1) await sleep(INTER_SEGMENT_DELAY_MS);
      }
    } catch (err) {
      // Threads는 삭제 API가 없어 롤백 불가 → 어디까지 올라갔는지 메시지로 노출.
      if (posted > 0) {
        const base = err instanceof Error ? err.message : String(err);
        throw new SocialPublishError(
          `Threads 스레드 ${posted}/${textSegments.length}개까지 게시 후 중단됐습니다: ${base}`,
          err
        );
      }
      throw err;
    }

    if (!firstMediaId) {
      throw new SocialPublishError('Threads 게시에 실패했습니다.');
    }

    // permalink는 스레드 첫 글 기준(best effort)
    const permalink = await fetchPermalink(BASE_URL, firstMediaId, accessToken);
    return { platformPostId: firstMediaId, permalink };
  },
};
