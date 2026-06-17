const ACTIVE_ORDER_STATUSES = ['paid', 'preparing', 'awaiting_deposit', 'shipped'] as const;

type CountResult = {
  count: number | null;
  error: unknown;
};

type CountQuery = PromiseLike<CountResult>;

type SupabaseCountClient = {
  from: (table: string) => {
    select: (
      columns: string,
      options: { count: 'exact'; head: true }
    ) => {
      in: (
        column: string,
        values: readonly string[]
      ) => CountQuery & {
        in: (column: string, values: readonly string[]) => CountQuery;
      };
    };
  };
};

function throwIfQueryError(error: unknown): void {
  if (error) throw error;
}

export async function hasActiveOrdersForArtworks(
  // 실제 Supabase 클라이언트(`SupabaseClient<Database>`)를 구조적 타입 `SupabaseCountClient`에
  // 직접 대입하면 generated 타입의 방대한 `.from()` 오버로드를 string 인자로 인스턴스화하며
  // TS2589(excessively deep)가 터진다. 호출부는 `unknown`으로 받고 내부에서 1회 어서션해
  // 함수 내부 쿼리 체인의 타입 안전성·테스트 mock 호환은 그대로 유지한다.
  supabaseClient: unknown,
  artworkIds: string[]
): Promise<boolean> {
  if (artworkIds.length === 0) return false;

  const supabase = supabaseClient as SupabaseCountClient;

  const uniqueArtworkIds = Array.from(new Set(artworkIds));
  const orderItemsQuery = supabase
    .from('order_items')
    .select('order_id, orders!inner(status)', { count: 'exact', head: true })
    .in('artwork_id', uniqueArtworkIds)
    .in('orders.status', ACTIVE_ORDER_STATUSES);
  const orderItemsResult = await orderItemsQuery;
  throwIfQueryError(orderItemsResult.error);
  if ((orderItemsResult.count ?? 0) > 0) return true;

  const legacyOrdersResult = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('artwork_id', uniqueArtworkIds)
    .in('status', ACTIVE_ORDER_STATUSES);
  throwIfQueryError(legacyOrdersResult.error);
  return (legacyOrdersResult.count ?? 0) > 0;
}
