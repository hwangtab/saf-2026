import { isRetryableMetaError } from '@/lib/social/meta-graph';
import { SocialPublishError } from '@/lib/social/types';

describe('isRetryableMetaError', () => {
  it('일시 오류 코드(24=미디어 미준비, 4=레이트리밋 등)는 재시도 대상', () => {
    expect(isRetryableMetaError(new SocialPublishError('x', null, 24))).toBe(true);
    expect(isRetryableMetaError(new SocialPublishError('x', null, 4))).toBe(true);
    expect(isRetryableMetaError(new SocialPublishError('x', null, 2))).toBe(true);
  });

  it('영구 오류 코드(190=토큰만료, 100=잘못된 요청)는 재시도 안 함', () => {
    expect(isRetryableMetaError(new SocialPublishError('x', null, 190))).toBe(false);
    expect(isRetryableMetaError(new SocialPublishError('x', null, 100))).toBe(false);
  });

  it('메시지로도 일시 오류 판별("does not exist"/"찾을 수 없")', () => {
    expect(isRetryableMetaError(new SocialPublishError('media does not exist'))).toBe(true);
    expect(isRetryableMetaError(new SocialPublishError('미디어를 찾을 수 없습니다'))).toBe(true);
  });

  it('SocialPublishError가 아니면 false', () => {
    expect(isRetryableMetaError(new Error('does not exist'))).toBe(false);
    expect(isRetryableMetaError('something')).toBe(false);
  });
});
