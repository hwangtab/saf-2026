export function formatCurrentDate(locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ko', {
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}
