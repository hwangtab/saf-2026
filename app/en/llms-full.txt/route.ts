import { LLMS_FULL_TXT_BODY } from '@/lib/llms-content';

export const dynamic = 'force-static';

// /en/llms-full.txt — 영문 LLM 봇 locale prefix mirror. 단일 출처: lib/llms-content.
export function GET(): Response {
  return new Response(LLMS_FULL_TXT_BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
