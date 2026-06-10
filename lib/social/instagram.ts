import { fetchPermalink, metaPost } from './meta-graph';
import {
  SocialPublishError,
  type PublishInput,
  type PublishResult,
  type SocialAdapter,
} from './types';

const GRAPH_VERSION = 'v21.0';
const BASE_URL = `https://graph.instagram.com/${GRAPH_VERSION}`;

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
    const creds = getCredentials();
    if (!creds) {
      throw new SocialPublishError(
        'Instagram 환경 변수(INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN)가 설정되지 않았습니다.'
      );
    }
    if (!imageUrl) {
      throw new SocialPublishError('Instagram 게시에는 이미지가 필요합니다.');
    }

    const { userId, accessToken } = creds;

    // 1) 미디어 컨테이너 생성
    const container = await metaPost(`${BASE_URL}/${userId}/media`, {
      image_url: imageUrl,
      caption,
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
