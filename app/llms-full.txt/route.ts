import { LLMS_FULL_TXT_BODY } from '@/lib/llms-content';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(LLMS_FULL_TXT_BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
