import { buildLlmsTxt } from '@/lib/llms-content';
import { getLiveStats } from '@/lib/live-stats';
import { LOAN_COUNT } from '@/lib/site-stats';

export const revalidate = 600;

export async function GET(): Promise<Response> {
  const { artistCount, artworkCount } = await getLiveStats();
  return new Response(buildLlmsTxt({ artistCount, artworkCount, loanCount: LOAN_COUNT }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
    },
  });
}
