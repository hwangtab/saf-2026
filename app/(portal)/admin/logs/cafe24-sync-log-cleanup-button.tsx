'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cleanupCafe24SyncLogs } from '@/app/actions/admin-logs';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

const CLEANUP_COPY: Record<
  LocaleCode,
  {
    none: string;
    keptOnly: (kept: number) => string;
    cleaned: (deleted: number) => string;
    error: string;
    button: string;
    modalTitle: string;
    modalConfirm: string;
    modalDescription: string;
  }
> = {
  ko: {
    none: '정리할 Cafe24 시스템 로그가 없습니다.',
    keptOnly: (kept: number) => `중복 로그가 없어 유지 ${kept}건만 남았습니다.`,
    cleaned: (deleted: number) => `Cafe24 중복 로그 ${deleted}건을 정리했습니다.`,
    error: 'Cafe24 로그 정리 중 오류가 발생했습니다.',
    button: 'Cafe24 로그 정리',
    modalTitle: 'Cafe24 로그 정리',
    modalConfirm: '정리 실행',
    modalDescription:
      '중복된 Cafe24 판매 동기화 경고/실패 시스템 로그를 6시간 단위로 1건만 남기고 정리합니다.\n사람이 남긴 활동 로그는 삭제하지 않습니다.',
  },
  en: {
    none: 'No Cafe24 system logs to clean up.',
    keptOnly: (kept: number) => `No duplicates found. Kept ${kept} log(s).`,
    cleaned: (deleted: number) => `Cleaned up ${deleted} duplicate Cafe24 log(s).`,
    error: 'An error occurred while cleaning Cafe24 logs.',
    button: 'Clean Cafe24 logs',
    modalTitle: 'Clean Cafe24 logs',
    modalConfirm: 'Run cleanup',
    modalDescription:
      'Duplicate Cafe24 sales sync warning/failure system logs are deduplicated to one log per 6-hour window.\nHuman activity logs are not deleted.',
  },
};

export function Cafe24SyncLogCleanupButton() {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = CLEANUP_COPY[locale];
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async () => {
    setCleaning(true);

    try {
      const result = await cleanupCafe24SyncLogs();

      if (result.scanned === 0) {
        toast.info(copy.none);
      } else if (result.deleted === 0) {
        toast.info(copy.keptOnly(result.kept));
      } else {
        toast.success(copy.cleaned(result.deleted));
      }

      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        locale === 'en' ? copy.error : error instanceof Error ? error.message : copy.error;
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
        {copy.button}
      </Button>

      <AdminConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          if (cleaning) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleCleanup}
        title={copy.modalTitle}
        confirmText={copy.modalConfirm}
        variant="warning"
        isLoading={cleaning}
        description={copy.modalDescription}
      />
    </>
  );
}
