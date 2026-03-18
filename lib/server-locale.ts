import { cookies } from 'next/headers';

export async function getServerLocale(): Promise<'ko' | 'en'> {
  const cookieStore = await cookies();
  return cookieStore.get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'ko';
}

/**
 * locale 문자열을 'ko' | 'en' 타입으로 변환합니다.
 * 'en'이 아닌 모든 값은 'ko'로 처리됩니다.
 */
export function resolveLocale(locale: string): 'ko' | 'en' {
  return locale === 'en' ? 'en' : 'ko';
}
