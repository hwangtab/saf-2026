/** @jest-environment node */
import { isFundingOrderId } from '@/lib/funding/order-id';

it('artwork webhook should ignore FND- orders (discriminator contract)', () => {
  // 작품 webhook 최상단 가드가 사용할 판별식 계약 고정
  expect(isFundingOrderId('FND-20260623-AAAA0000')).toBe(true);
  expect(isFundingOrderId('SAF-20260623-0001')).toBe(false);
});

it('isEventOrderId equivalent — EVT- orders are not funding orders', () => {
  expect(isFundingOrderId('EVT-abc123')).toBe(false);
});
