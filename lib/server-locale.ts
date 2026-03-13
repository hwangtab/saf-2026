import { cookies } from 'next/headers';

export async function getServerLocale(): Promise<'ko' | 'en'> {
  const cookieStore = await cookies();
  return cookieStore.get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'ko';
}
