'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { syncMissingArtworkPurchaseLinks } from '@/app/actions/admin-artworks';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';

export function Cafe24MissingLinkSyncButton() {
  const router = useRouter();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    const confirmed = window.confirm(
      '구매 링크가 누락된 작품을 카페24와 일괄 동기화합니다.\n작품 수에 따라 최대 수십 초가 걸릴 수 있습니다.\n계속하시겠습니까?'
    );
    if (!confirmed) return;

    setSyncing(true);
    try {
      const result = await syncMissingArtworkPurchaseLinks();

      if (result.total === 0) {
        toast.info('구매 링크 누락 작품이 없습니다.');
        return;
      }

      if (result.failed === 0) {
        toast.success(`동기화 완료: ${result.succeeded}건`);
      } else if (result.succeeded === 0) {
        toast.error(`동기화 실패: ${result.failed}건`);
      } else {
        toast.warning(`일부 실패: 성공 ${result.succeeded}건 / 실패 ${result.failed}건`);
      }

      if (result.failed > 0) {
        console.error('[cafe24-batch-sync] failed items:', result.errors);
      }

      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '일괄 동기화 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="white"
      className="w-full sm:w-auto"
      loading={syncing}
      disabled={syncing}
      onClick={handleSync}
    >
      구매링크 누락 동기화
    </Button>
  );
}
