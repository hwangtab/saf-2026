// 소셜 미디어 게시 — 플랫폼 공통 타입.

export const SOCIAL_PLATFORMS = ['instagram', 'threads'] as const;
export type Platform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_POST_STATUSES = ['pending', 'publishing', 'published', 'failed'] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export interface PublishInput {
  /** 게시물 본문(캡션). Instagram caption / Threads text. */
  caption: string;
  /** 공개 절대 이미지 URL. 없으면 Threads는 텍스트 전용 게시, Instagram은 게시 불가. */
  imageUrl?: string;
}

export interface PublishResult {
  /** 플랫폼이 반환한 게시물(media) ID. */
  platformPostId: string;
  /** 게시물 공개 링크(best effort, 조회 실패 시 null). */
  permalink: string | null;
}

export interface SocialAdapter {
  readonly platform: Platform;
  /** 필요한 환경 변수(토큰·사용자 ID)가 모두 설정됐는지. */
  isConfigured(): boolean;
  /** 컨테이너 생성 → publish → permalink 조회. 실패 시 SocialPublishError throw. */
  publish(input: PublishInput): Promise<PublishResult>;
}

/** 게시 실패를 나타내는 도메인 에러. message는 사용자(관리자)에게 노출 가능한 한국어. */
export class SocialPublishError extends Error {
  constructor(
    message: string,
    /** 원본 에러/응답(로깅용, 노출 안 함). */
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SocialPublishError';
  }
}

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}
