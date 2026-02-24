'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { recordArtworkSale } from '@/app/actions/admin-artworks';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils';
import { ArtworkSale } from '@/types';

type SalesHistoryProps = {
  artworkId: string;
  editionType: string;
  editionLimit: number | null;
  sales: ArtworkSale[];
  artworkPrice: string | null;
};

// 가격 문자열을 숫자로 파싱
function parsePriceString(priceStr: string | null): number {
  if (!priceStr) return 0;
  const numericStr = priceStr.replace(/[^0-9]/g, '');
  return parseInt(numericStr, 10) || 0;
}

function normalizeSaleSource(source: ArtworkSale['source']): 'manual' | 'cafe24' {
  return source === 'cafe24' ? 'cafe24' : 'manual';
}

function getSaleSourceLabel(source: ArtworkSale['source']): string {
  return normalizeSaleSource(source) === 'cafe24' ? '온라인 (cafe24)' : '오프라인 (manual)';
}

export function SalesHistory({
  artworkId,
  editionType,
  editionLimit,
  sales,
  artworkPrice,
}: SalesHistoryProps) {
  const router = useRouter();
  const toast = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const totalSold = sales.reduce((sum, sale) => sum + (sale.quantity || 1), 0);
  const isSoldOut =
    (editionType === 'unique' && totalSold >= 1) ||
    (editionType === 'limited' && editionLimit !== null && totalSold >= editionLimit);
  const percent =
    editionType === 'limited' && editionLimit ? Math.min((totalSold / editionLimit) * 100, 100) : 0;

  // 정가를 포맷된 문자열로 변환
  const originalPrice = parsePriceString(artworkPrice);
  const formattedOriginalPrice = originalPrice > 0 ? originalPrice.toLocaleString('ko-KR') : '';

  const [salePrice, setSalePrice] = useState(formattedOriginalPrice);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [note, setNote] = useState('');
  const [soldAt, setSoldAt] = useState(new Date().toISOString().split('T')[0]);

  const formatPrice = (val: string) => {
    const numericValue = val.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString('ko-KR');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '');
    const formatted = formatPrice(val);
    setSalePrice(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salePrice) {
      toast.error('판매 금액을 입력해주세요.');
      return;
    }

    setIsRecording(true);
    try {
      const formData = new FormData();
      formData.append('artwork_id', artworkId);
      formData.append('sale_price', salePrice.replace(/,/g, ''));
      formData.append('quantity', quantity.toString());
      formData.append('buyer_name', buyerName);
      formData.append('note', note);
      formData.append('sold_at', soldAt);

      const result = await recordArtworkSale(formData);
      if (result.success) {
        if (result.cafe24.status === 'synced') {
          toast.success('판매가 기록되었고 카페24 동기화도 완료되었습니다.');
        } else if (result.cafe24.status === 'pending_auth') {
          toast.warning('판매 기록은 저장됐지만 카페24 인증이 필요합니다.');
        } else if (result.cafe24.status === 'failed') {
          toast.warning('판매 기록은 저장됐지만 카페24 동기화에 실패했습니다.');
        } else {
          toast.warning('판매 기록은 저장됐지만 카페24 동기화 경고가 있습니다.');
        }
        setIsFormOpen(false);
        setSalePrice('');
        setQuantity(1);
        setBuyerName('');
        setNote('');
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '판매 기록 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">판매 이력</h2>
        {!isSoldOut && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!isFormOpen) {
                // 폼 열 때 정가로 초기화
                setSalePrice(formattedOriginalPrice);
              }
              setIsFormOpen(!isFormOpen);
            }}
            disabled={isRecording}
          >
            {isFormOpen ? '취소' : '+ 판매 기록'}
          </Button>
        )}
      </div>

      {editionType === 'limited' && editionLimit && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>판매 현황</span>
            <span className="font-medium">
              {totalSold} / {editionLimit} ({Math.round(percent)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {editionType === 'unique' && (
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              isSoldOut ? 'bg-red-500' : 'bg-green-500'
            )}
          />
          <span className="text-gray-600">{isSoldOut ? '판매 완료 (Sold Out)' : '판매 중'}</span>
        </div>
      )}

      {/* Record Sale Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200"
        >
          <h3 className="mb-4 text-sm font-medium text-gray-900">새 판매 기록</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-500">
                  판매 금액 (KRW) <span className="text-red-500">*</span>
                </label>
                {originalPrice > 0 && (
                  <span className="text-xs text-gray-400">
                    정가: ₩{originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={salePrice}
                  onChange={handlePriceChange}
                  placeholder="1,000,000"
                  className="flex-1 rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {originalPrice > 0 && salePrice !== formattedOriginalPrice && (
                  <button
                    type="button"
                    onClick={() => setSalePrice(formattedOriginalPrice)}
                    className="whitespace-nowrap rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    정가로
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">판매 일자</label>
              <input
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {editionType === 'limited' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  수량 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={editionLimit ? editionLimit - totalSold : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">구매자 (선택)</label>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">비고 (선택)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="메모..."
                className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" loading={isRecording}>
              기록 저장
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                판매일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                구매자
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                채널
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                수량
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                판매가
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                합계
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  판매 기록이 없습니다.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(sale.sold_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sale.buyer_name || '-'}
                    {sale.note && (
                      <span className="block text-xs text-gray-400 truncate max-w-[150px]">
                        {sale.note}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        normalizeSaleSource(sale.source) === 'cafe24'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-emerald-100 text-emerald-700'
                      )}
                    >
                      {getSaleSourceLabel(sale.source)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {sale.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₩{sale.sale_price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    ₩{(sale.sale_price * sale.quantity).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
