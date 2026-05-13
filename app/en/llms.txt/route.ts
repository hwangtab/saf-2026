import { LLMS_TXT_BODY } from '@/lib/llms-content';

export const dynamic = 'force-static';

// /en/llms.txt — 영문 LLM 봇이 locale prefix로 요청 시 404 회피용 mirror.
// 본문은 이미 영문이므로 /llms.txt와 동일 콘텐츠 서빙. 단일 출처: lib/llms-content.
export function GET(): Response {
  return new Response(LLMS_TXT_BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
