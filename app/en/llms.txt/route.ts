import { buildLlmsTxt } from '@/lib/llms-content';
import { getLiveStats } from '@/lib/live-stats';
import { LOAN_COUNT } from '@/lib/site-stats';

export const revalidate = 600;

// /en/llms.txt — 영문 LLM 봇이 locale prefix로 요청 시 404 회피용 mirror.
// 본문은 이미 영문이므로 /llms.txt와 동일 콘텐츠 서빙. 단일 출처: lib/llms-content.
export async function GET(): Promise<Response> {
  const { artistCount, artworkCount } = await getLiveStats();
  return new Response(buildLlmsTxt({ artistCount, artworkCount, loanCount: LOAN_COUNT }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
    },
  });
}
