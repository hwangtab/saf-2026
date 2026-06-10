import { SocialPublishError } from './types';

// Meta Graph API(Instagram/Threads 공용) 요청 헬퍼.
// 에러 응답을 관리자에게 노출 가능한 한국어 SocialPublishError로 정규화한다.

interface MetaErrorShape {
  message?: string;
  code?: number;
  error_subcode?: number;
  type?: string;
  fbtrace_id?: string;
}

interface MetaResponseBody {
  error?: MetaErrorShape;
  [key: string]: unknown;
}

// OAuth/토큰 관련 에러 코드 — 토큰 재발급 안내로 매핑.
const TOKEN_ERROR_CODES = new Set([190, 102, 463, 467]);

function toFriendlyMessage(error: MetaErrorShape | undefined, httpStatus: number): string {
  if (error?.code && TOKEN_ERROR_CODES.has(error.code)) {
    return '액세스 토큰이 만료되었거나 유효하지 않습니다. 토큰을 재발급한 뒤 다시 시도해 주세요.';
  }
  if (error?.message) {
    return `소셜 API 오류: ${error.message}`;
  }
  return `소셜 API 요청 실패 (HTTP ${httpStatus}).`;
}

async function parseMetaResponse(res: Response): Promise<MetaResponseBody> {
  const text = await res.text();
  let json: MetaResponseBody = {};
  if (text) {
    try {
      json = JSON.parse(text) as MetaResponseBody;
    } catch {
      // 비-JSON 응답(게이트웨이 HTML 등)
      if (!res.ok) {
        throw new SocialPublishError(`소셜 API 요청 실패 (HTTP ${res.status}).`, text);
      }
    }
  }

  if (!res.ok || json.error) {
    throw new SocialPublishError(toFriendlyMessage(json.error, res.status), json.error ?? text);
  }
  return json;
}

export async function metaPost(
  url: string,
  params: Record<string, string>
): Promise<MetaResponseBody> {
  const body = new URLSearchParams(params);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (cause) {
    throw new SocialPublishError('소셜 API 서버에 연결하지 못했습니다.', cause);
  }
  return parseMetaResponse(res);
}

export async function metaGet(url: string): Promise<MetaResponseBody> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (cause) {
    throw new SocialPublishError('소셜 API 서버에 연결하지 못했습니다.', cause);
  }
  return parseMetaResponse(res);
}

/** permalink 조회는 best effort — 실패해도 게시 자체는 성공으로 본다. */
export async function fetchPermalink(baseUrl: string, mediaId: string, accessToken: string) {
  try {
    const json = await metaGet(
      `${baseUrl}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`
    );
    return typeof json.permalink === 'string' ? json.permalink : null;
  } catch {
    return null;
  }
}
