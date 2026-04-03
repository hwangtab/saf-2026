'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  recordArtworkSale,
  updateArtworkSale,
  voidArtworkSale,
} from '@/app/actions/admin-artworks';
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
  return normalizeSaleSource(source) === 'cafe24' ? '온라인' : '오프라인';
}

function formatPriceInput(val: string) {
  const numericValue = val.replace(/[^0-9]/g, '');
  if (!numericValue) return '';
  return Number(numericValue).toLocaleString('ko-KR');
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

  // Edit state
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editBuyerName, setEditBuyerName] = useState('');
  const [editBuyerPhone, setEditBuyerPhone] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Void state
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const totalSold = sales.reduce((sum, sale) => sum + (sale.quantity || 1), 0);
  const isSoldOut =
    (editionType === 'unique' && totalSold >= 1) ||
    (editionType === 'limited' && editionLimit !== null && totalSold >= editionLimit);
  const percent =
    editionType === 'limited' && editionLimit ? Math.min((totalSold / editionLimit) * 100, 100) : 0;

  const originalPrice = parsePriceString(artworkPrice);
  const formattedOriginalPrice = originalPrice > 0 ? originalPrice.toLocaleString('ko-KR') : '';

  const [salePrice, setSalePrice] = useState(formattedOriginalPrice);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [note, setNote] = useState('');
  const [soldAt, setSoldAt] = useState(new Date().toISOString().split('T')[0]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '');
    setSalePrice(formatPriceInput(val));
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
      formData.append('buyer_phone', buyerPhone);
      formData.append('note', note);
      formData.append('sold_at', soldAt);

      const result = await recordArtworkSale(formData);
      if (result.success) {
        if (result.cafe24.status === 'synced') {
          toast.success('판매 기록 저장 및 Cafe24 동기화 완료.');
        } else if (result.cafe24.status === 'pending_auth') {
          toast.warning('판매 기록 저장됨. Cafe24 인증이 필요합니다.');
        } else if (result.cafe24.status === 'failed') {
          toast.warning('판매 기록 저장됨. Cafe24 동기화 실패.');
        } else {
          toast.warning('판매 기록 저장됨. Cafe24 동기화 경고.');
        }
        setIsFormOpen(false);
        setSalePrice('');
        setQuantity(1);
        setBuyerName('');
        setBuyerPhone('');
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

  function startEdit(sale: ArtworkSale) {
    setEditingSaleId(sale.id);
    setEditPrice(sale.sale_price.toLocaleString('ko-KR'));
    setEditDate(sale.sold_at.slice(0, 10));
    setEditQuantity(sale.quantity);
    setEditBuyerName(sale.buyer_name || '');
    setEditBuyerPhone(sale.buyer_phone || '');
    setEditNote(sale.note || '');
    setVoidingSaleId(null);
  }

  function cancelEdit() {
    setEditingSaleId(null);
  }

  async function saveEdit(saleId: string) {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('sale_id', saleId);
      formData.append('artwork_id', artworkId);
      formData.append('sale_price', editPrice.replace(/,/g, ''));
      formData.append('quantity', editQuantity.toString());
      formData.append('buyer_name', editBuyerName);
      formData.append('buyer_phone', editBuyerPhone);
      formData.append('note', editNote);
      formData.append('sold_at', editDate);

      const result = await updateArtworkSale(formData);
      if (result.cafe24.status === 'synced') {
        toast.success('판매 기록 수정 및 Cafe24 동기화 완료.');
      } else if (result.cafe24.status === 'pending_auth') {
        toast.warning('판매 기록 수정됨. Cafe24 인증이 필요합니다.');
      } else if (result.cafe24.status === 'failed') {
        toast.warning('판매 기록 수정됨. Cafe24 동기화 실패.');
      } else {
        toast.success('판매 기록이 수정되었습니다.');
      }
      setEditingSaleId(null);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function startVoid(saleId: string) {
    setVoidingSaleId(saleId);
    setVoidReason('');
    setEditingSaleId(null);
  }

  async function confirmVoid(saleId: string) {
    if (isVoiding) return;
    if (!voidReason.trim()) {
      toast.error('취소 사유를 입력해주세요.');
      return;
    }
    setIsVoiding(true);
    try {
      const result = await voidArtworkSale(saleId, voidReason);
      if (result.cafe24.status === 'synced') {
        toast.success('판매 기록 취소 및 Cafe24 동기화 완료.');
      } else if (result.cafe24.status === 'pending_auth') {
        toast.warning('판매 기록 취소됨. Cafe24 인증이 필요합니다.');
      } else if (result.cafe24.status === 'failed') {
        toast.warning('판매 기록 취소됨. Cafe24 동기화 실패.');
      } else {
        toast.success('판매 기록이 취소되었습니다.');
      }
      setVoidingSaleId(null);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '취소 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsVoiding(false);
    }
  }

  const isManual = (source: ArtworkSale['source']) => normalizeSaleSource(source) !== 'cafe24';

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
              className="h-full bg-blue-500 transition-[width] duration-500"
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
                  className="flex-1 rounded border border-gray-300 p-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
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
                className="w-full rounded border border-gray-300 p-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
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
                  className="w-full rounded border border-gray-300 p-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">구매자 (선택)</label>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded border border-gray-300 p-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">연락처 (선택)</label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full rounded border border-gray-300 p-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">비고 (선택)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="메모..."
                className="w-full rounded border border-gray-300 p-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
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
                연락처
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
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  판매 기록이 없습니다.
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const isEditing = editingSaleId === sale.id;
                const isVoidTarget = voidingSaleId === sale.id;
                const canManage = isManual(sale.source);

                if (isEditing) {
                  return (
                    <tr key={sale.id} className="bg-blue-50/50">
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editBuyerName}
                          onChange={(e) => setEditBuyerName(e.target.value)}
                          placeholder="구매자"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="tel"
                          value={editBuyerPhone}
                          onChange={(e) => setEditBuyerPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                          오프라인
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {editionType === 'limited' ? (
                          <input
                            type="number"
                            min="1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
                          />
                        ) : (
                          <span className="block text-right text-sm text-gray-900">
                            {sale.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editPrice}
                          onChange={(e) => {
                            const val = e.target.value.replace(/,/g, '');
                            setEditPrice(formatPriceInput(val));
                          }}
                          className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/25"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-gray-500">-</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(sale.id)}
                            disabled={isSaving}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isSaving ? '...' : '저장'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                if (isVoidTarget) {
                  return (
                    <tr key={sale.id} className="bg-red-50/50">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="shrink-0 text-sm font-medium text-red-700">
                            취소 사유:
                          </span>
                          <input
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="예: 잘못 입력된 기록"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                confirmVoid(sale.id);
                              }
                              if (e.key === 'Escape') setVoidingSaleId(null);
                            }}
                            className="flex-1 rounded border border-red-300 px-2 py-1 text-sm focus-visible:outline-none focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500/25"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => confirmVoid(sale.id)}
                            disabled={isVoiding}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {isVoiding ? '...' : '확인'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setVoidingSaleId(null)}
                            className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={sale.id} className="hover:bg-gray-50/50">
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
                    <td className="px-4 py-3 text-sm text-gray-600">{sale.buyer_phone || '-'}</td>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => startEdit(sale)}
                            className="rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            수정
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startVoid(sale.id)}
                          className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
