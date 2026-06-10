import { instagramAdapter } from './instagram';
import { threadsAdapter } from './threads';
import { SOCIAL_PLATFORMS, type Platform, type SocialAdapter } from './types';

const ADAPTERS: Record<Platform, SocialAdapter> = {
  instagram: instagramAdapter,
  threads: threadsAdapter,
};

export function getAdapter(platform: Platform): SocialAdapter {
  return ADAPTERS[platform];
}

export function isPlatformConfigured(platform: Platform): boolean {
  return ADAPTERS[platform].isConfigured();
}

export interface PlatformConfigStatus {
  platform: Platform;
  configured: boolean;
}

/** 각 플랫폼의 환경 변수 설정 여부 — UI에서 비활성 처리·안내 배너에 사용. */
export function getPlatformConfigStatuses(): PlatformConfigStatus[] {
  return SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    configured: ADAPTERS[platform].isConfigured(),
  }));
}
