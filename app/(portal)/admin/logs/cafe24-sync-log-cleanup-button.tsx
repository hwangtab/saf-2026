'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { cleanupCafe24SyncLogs } from '@/app/actions/admin-logs';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';

export function Cafe24SyncLogCleanupButton() {
  const locale = useLocale();
  const t = useTranslations('admin.logs');
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async () => {
    setCleaning(true);

    try {
      const result = await cleanupCafe24SyncLogs();

      if (result.scanned === 0) {
        toast.info(t('cleanupNone'));
      } else if (result.deleted === 0) {
        toast.info(t('cleanupKeptOnly', { kept: result.kept }));
      } else {
        toast.success(t('cleanupCleaned', { deleted: result.deleted }));
      }

      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        locale === 'en'
          ? t('cleanupError')
          : error instanceof Error
            ? error.message
            : t('cleanupError');
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
        {t('cleanupButton')}
      </Button>

      <AdminConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          if (cleaning) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleCleanup}
        title={t('cleanupModalTitle')}
        confirmText={t('cleanupModalConfirm')}
        variant="warning"
        isLoading={cleaning}
        description={t('cleanupModalDescription')}
      />
    </>
  );
}
