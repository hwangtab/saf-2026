/**
 * Supabase batch fetch helper — PostgREST `db-max-rows=1000` 서버 한도 우회용.
 *
 * 배경: supabase-js의 `.range(0, 49999)` 같은 단발 호출은 클라이언트 헤더로만 작동하고
 * 서버 측 db-max-rows가 더 작으면 그 값으로 잘려서 응답함. 4000행 데이터를 받으려고 해도
 * 1000개만 반환되어 in-memory aggregation 결과가 부분집계가 되는 버그가 발생함.
 * 이 헬퍼는 1000행씩 페이지네이션 fetch해서 hardLimit까지 확보.
 *
 * 사용 예:
 * ```ts
 * const { data, count } = await fetchAllInBatches((from, to) =>
 *   admin
 *     .from('petition_signatures')
 *     .select('id, full_name', { count: 'exact' })
 *     .order('created_at', { ascending: false })
 *     .range(from, to)
 * );
 * ```
 *
 * 가능하면 DB GROUP BY RPC가 더 효율적임 (admin 페이지의 region breakdown 참고).
 * 명단성 데이터(서명 명단·메시지 큐·구매자 명단 등)처럼 row 자체가 필요하면 이 헬퍼 사용.
 *
 * @param buildQuery (from, to)를 받아 그 range로 query를 실행하는 PromiseLike 반환 함수.
 *   supabase 쿼리 빌더는 PromiseLike(thenable)이지만 `Promise` 직접 반환 아님.
 * @param pageSize 한 batch 크기 (기본 1000 — PostgREST 기본 한도와 동일)
 * @param hardLimit 안전 상한 (기본 50,000 — 무한루프 방지)
 */
export async function fetchAllInBatches<T>(
  buildQuery: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: unknown; count?: number | null }>,
  pageSize = 1000,
  hardLimit = 50_000
): Promise<{ data: T[]; count: number | null }> {
  const all: T[] = [];
  let count: number | null = null;
  let from = 0;

  while (from < hardLimit) {
    const to = Math.min(from + pageSize - 1, hardLimit - 1);
    const result = await buildQuery(from, to);
    if (result.error) throw result.error;
    if (count == null && typeof result.count === 'number') count = result.count;
    if (!result.data || result.data.length === 0) break;
    all.push(...result.data);
    if (result.data.length < pageSize) break;
    from = to + 1;
  }

  return { data: all, count };
}
