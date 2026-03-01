'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cleanupCafe24SyncLogs } from '@/app/actions/admin-logs';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';

export function Cafe24SyncLogCleanupButton() {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async () => {
    setCleaning(true);

    try {
      const result = await cleanupCafe24SyncLogs();

      if (result.scanned === 0) {
        toast.info('정리할 Cafe24 시스템 로그가 없습니다.');
      } else if (result.deleted === 0) {
        toast.info(`중복 로그가 없어 유지 ${result.kept}건만 남았습니다.`);
      } else {
        toast.success(`Cafe24 중복 로그 ${result.deleted}건을 정리했습니다.`);
      }

      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Cafe24 로그 정리 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="white"
        className="w-full sm:w-auto"
        onClick={() => setConfirmOpen(true)}
      >
        Cafe24 로그 정리
      </Button>

      <AdminConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          if (cleaning) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleCleanup}
        title="Cafe24 로그 정리"
        confirmText="정리 실행"
        variant="warning"
        isLoading={cleaning}
        description={
          '중복된 Cafe24 판매 동기화 경고/실패 시스템 로그를 6시간 단위로 1건만 남기고 정리합니다.\n사람이 남긴 활동 로그는 삭제하지 않습니다.'
        }
      />
    </>
  );
}
