/**
 * 스크롤 관련 유틸리티 함수
 */

/**
 * 특정 요소로 부드럽게 스크롤
 * sticky 헤더를 고려하여 오프셋을 자동 계산
 *
 * @param elementId - 스크롤할 대상 요소의 ID
 * @param additionalOffset - 추가 오프셋 (기본: 20px)
 */
export function scrollToElement(elementId: string, additionalOffset: number = 20): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const header = document.querySelector('header');
  const headerHeight = header?.getBoundingClientRect().height ?? 64;
  const offset = headerHeight + additionalOffset;

  const elementPosition = element.getBoundingClientRect().top + window.scrollY;

  window.scrollTo({
    top: elementPosition - offset,
    behavior: 'smooth',
  });
}

/**
 * 특정 요소가 뷰포트에 보이는지 확인
 *
 * @param elementId - 확인할 요소의 ID
 * @returns 요소가 뷰포트에 보이면 true
 */
export function isElementInViewport(elementId: string): boolean {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
