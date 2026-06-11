/** 지연 헬퍼. 별도 모듈로 분리해 테스트에서 즉시 resolve 하도록 mock 가능. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
