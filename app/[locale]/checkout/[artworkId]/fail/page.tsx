import { Link } from '@/i18n/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ artworkId: string; locale: string }>;
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}

export default async function FailPage({ params, searchParams }: Props) {
  const { artworkId, locale } = await params;
  const { code, message, orderId } = await searchParams;

  const isKo = locale !== 'en';

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-lg mx-auto px-4">
        <div className="rounded-2xl border border-red-100 bg-white p-10 shadow-sm text-center">
          <p className="text-4xl mb-4">✗</p>
          <h1 className="text-2xl font-bold text-charcoal mb-2">
            {isKo ? '결제에 실패했습니다' : 'Payment Failed'}
          </h1>

          {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}
          {code && (
            <p className="text-xs text-gray-400 mb-6">
              {isKo ? '오류 코드' : 'Error code'}: {code}
            </p>
          )}
          {orderId && (
            <p className="text-xs text-gray-400 mb-6">
              {isKo ? '주문 번호' : 'Order'}: {orderId}
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            <Link
              href={`/checkout/${artworkId}`}
              className="inline-block w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              {isKo ? '다시 시도하기' : 'Try Again'}
            </Link>
            <Link
              href={`/artworks/${artworkId}`}
              className="text-sm text-gray-500 underline hover:text-charcoal"
            >
              {isKo ? '작품 페이지로 돌아가기' : 'Back to artwork'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
