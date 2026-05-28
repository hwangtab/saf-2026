export type QueryResult<T = unknown> = { data: T[] | null; error: unknown };

/**
 * Proxy 기반 Supabase query builder mock.
 * .select/.eq/.not/.in/.gte/.lte/.order/.range 등 어떤 chain 메서드를 호출해도
 * 자기 자신을 반환하므로, 소스 chain이 진화해도 이 헬퍼를 수정할 필요 없음.
 * thenable이라 `await query` 시 result로 resolve.
 */
export function createSupabaseQueryMock<T = unknown>(result: QueryResult<T>) {
  const cache: Record<string, jest.Mock> = {};
  let proxy: unknown;
  proxy = new Proxy(
    {
      then: (resolve: (v: QueryResult<T>) => unknown, reject?: (err: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    } as Record<string | symbol, unknown>,
    {
      get(target, prop) {
        if (typeof prop === 'symbol' || prop in target) {
          return (target as Record<string | symbol, unknown>)[prop];
        }
        if (!cache[prop as string]) {
          cache[prop as string] = jest.fn(() => proxy);
        }
        return cache[prop as string];
      },
    }
  );
  return proxy as PromiseLike<QueryResult<T>>;
}
