/** 펀딩 후원 주문번호 판별. 작품(SAF-)·행사(EVT-) 결제와 webhook을 격리하는 데 사용. */
export function isFundingOrderId(orderId: string): boolean {
  return typeof orderId === 'string' && orderId.startsWith('FND-');
}
