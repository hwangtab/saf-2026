import { fetchPermalink, metaPost } from './meta-graph';
import { stripThreadDelimiters } from './thread-split';
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

function getCredentials(): { userId: string; accessToken: string } | null {
  const userId = process.env.INSTAGRAM_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!userId || !accessToken) return null;
  return { userId, accessToken };
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

    // 캡션 정리: 스레드 구분자(---) 제거 + Instagram 상한(2200자) 축약.
    const cleaned = stripThreadDelimiters(caption);
    const igCaption =
      cleaned.length > IG_CAPTION_MAX ? `${cleaned.slice(0, IG_CAPTION_MAX - 1)}…` : cleaned;

    // 1) 미디어 컨테이너 생성
    const container = await metaPost(`${BASE_URL}/${userId}/media`, {
      image_url: imageUrl,
      caption: igCaption,
      access_token: accessToken,
    });
    const creationId = typeof container.id === 'string' ? container.id : null;
    if (!creationId) {
      throw new SocialPublishError('Instagram 미디어 컨테이너 생성에 실패했습니다.', container);
    }

    // 2) 게시
    const published = await metaPost(`${BASE_URL}/${userId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
    const mediaId = typeof published.id === 'string' ? published.id : null;
    if (!mediaId) {
      throw new SocialPublishError('Instagram 게시에 실패했습니다.', published);
    }

    // 3) permalink 조회 (best effort)
    const permalink = await fetchPermalink(BASE_URL, mediaId, accessToken);

    return { platformPostId: mediaId, permalink };
  },
};
