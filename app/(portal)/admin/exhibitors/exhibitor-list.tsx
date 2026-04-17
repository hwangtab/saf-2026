'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Exhibitor, approveExhibitor, suspendExhibitor } from '@/app/actions/admin-exhibitors';
import Button from '@/components/ui/Button';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';

type ConfirmAction = { type: 'approve' | 'suspend'; id: string };

export function ExhibitorList({ initialExhibitors }: { initialExhibitors: Exhibitor[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const currentStatus = searchParams.get('status') as 'active' | 'pending' | 'suspended' | null;

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    setConfirmAction(null);
    setLoadingId(id);
    try {
      if (type === 'approve') {
        await approveExhibitor(id);
      } else {
        await suspendExhibitor(id);
      }
      router.refresh();
    } catch {
      toast.error(
        type === 'approve'
          ? '승인 처리 중 오류가 발생했습니다.'
          : '정지 처리 중 오류가 발생했습니다.'
      );
    } finally {
      setLoadingId(null);
    }
  }, [confirmAction, router, toast]);

  const handleStatusFilter = (status: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    router.push(`/admin/exhibitors?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button
          type="button"
          onClick={() => handleStatusFilter(null)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md ${
            !currentStatus
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => handleStatusFilter('pending')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md ${
            currentStatus === 'pending'
              ? 'bg-sun-soft text-sun-strong'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          대기중
        </button>
        <button
          type="button"
          onClick={() => handleStatusFilter('active')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md ${
            currentStatus === 'active'
              ? 'bg-success/20 text-success-a11y'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          승인됨
        </button>
        <button
          type="button"
          onClick={() => handleStatusFilter('suspended')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md ${
            currentStatus === 'suspended'
              ? 'bg-danger/20 text-danger-a11y'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          정지됨
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
              >
                신청자 / 이메일
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                상태
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                연락처
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                추천인
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                신청일
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {initialExhibitors.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                  출품자 신청 내역이 없습니다.
                </td>
              </tr>
            ) : (
              initialExhibitors.map((exhibitor) => (
                <tr key={exhibitor.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="font-medium text-gray-900">
                      {exhibitor.application?.representative_name || exhibitor.name || '-'}
                    </div>
                    <div className="text-gray-500">{exhibitor.email}</div>
                    {exhibitor.application?.bio && (
                      <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                        {exhibitor.application.bio}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        exhibitor.status === 'active'
                          ? 'bg-success/20 text-success-a11y'
                          : exhibitor.status === 'pending'
                            ? 'bg-sun-soft text-sun-strong'
                            : 'bg-danger/20 text-danger-a11y'
                      }`}
                    >
                      {exhibitor.status === 'active'
                        ? '승인됨'
                        : exhibitor.status === 'pending'
                          ? '대기중'
                          : exhibitor.status === 'suspended'
                            ? '정지됨'
                            : exhibitor.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {exhibitor.application?.contact || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {exhibitor.application?.referrer || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {exhibitor.application?.created_at
                      ? new Date(exhibitor.application.created_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    {exhibitor.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setConfirmAction({ type: 'approve', id: exhibitor.id })}
                        loading={loadingId === exhibitor.id}
                        disabled={loadingId !== null}
                      >
                        승인
                      </Button>
                    )}
                    {exhibitor.status === 'active' && (
                      <Button
                        variant="white"
                        size="sm"
                        className="text-danger-a11y hover:text-danger-a11y"
                        onClick={() => setConfirmAction({ type: 'suspend', id: exhibitor.id })}
                        loading={loadingId === exhibitor.id}
                        disabled={loadingId !== null}
                      >
                        정지
                      </Button>
                    )}
                    {exhibitor.status === 'suspended' && (
                      <Button
                        variant="white"
                        size="sm"
                        onClick={() => setConfirmAction({ type: 'approve', id: exhibitor.id })}
                        loading={loadingId === exhibitor.id}
                        disabled={loadingId !== null}
                      >
                        재승인
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.type === 'approve' ? '출품자 승인' : '출품자 정지'}
        description={
          confirmAction?.type === 'approve'
            ? '출품자를 승인하시겠습니까?'
            : '출품자를 정지하시겠습니까?'
        }
        variant={confirmAction?.type === 'suspend' ? 'danger' : 'info'}
        isLoading={loadingId !== null}
      />
    </div>
  );
}
