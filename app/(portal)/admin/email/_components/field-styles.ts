// 전역 focus-visible 규칙(styles/globals.css)은 a·button만 커버하므로,
// 이 디렉터리의 raw input/select/textarea에 일관된 키보드 포커스 링을 부여한다(WCAG 2.4.7).
export const FIELD_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/30 focus-visible:border-primary-a11y';
