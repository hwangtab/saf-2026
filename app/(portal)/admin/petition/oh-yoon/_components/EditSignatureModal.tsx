'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import Modal from '@/components/ui/Modal';
import { REGIONS, getRegionByKey } from '@/lib/petition/regions';
import { updateSignature } from '@/app/actions/petition-admin';

import type { AdminSignatureRow } from './types';

interface EditSignatureModalProps {
  row: AdminSignatureRow;
  onClose: (result?: 'updated' | 'cancelled') => void;
}

const INPUT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-charcoal-deep focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100';

const LABEL_BASE = 'block text-xs font-semibold text-charcoal-deep mb-1';

export default function EditSignatureModal({ row, onClose }: EditSignatureModalProps) {
  const t = useTranslations('admin.petition');

  const [fullName, setFullName] = useState(row.full_name);
  const [phone, setPhone] = useState(row.phone ?? '');
  const [regionTop, setRegionTop] = useState(row.region_top);
  const [regionSub, setRegionSub] = useState(row.region_sub ?? '');
  const [message, setMessage] = useState(row.message ?? '');
  const [messagePublic, setMessagePublic] = useState(row.message_public);
  const [isCommittee, setIsCommittee] = useState(row.is_committee);
  const [isMasked, setIsMasked] = useState(row.is_masked);

  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const subOptions = getRegionByKey(regionTop)?.subs ?? [];

  function handleRegionTopChange(next: string) {
    setRegionTop(next);
    // 시·도가 바뀌면 시·군·구는 새 옵션의 첫 항목 또는 빈값.
    const newSubs = getRegionByKey(next)?.subs ?? [];
    setRegionSub(newSubs[0] ?? '');
  }

  function handleSave() {
    setErr(null);
    startTransition(async () => {
      const result = await updateSignature(row.id, {
        fullName,
        phone: phone.trim() === '' ? null : phone,
        regionTop,
        regionSub: regionSub.trim() === '' ? null : regionSub,
        message: message.trim() === '' ? null : message,
        messagePublic,
        isCommittee,
        isMasked,
      });
      if (result.ok) {
        onClose('updated');
      } else {
        setErr(result.message ?? t('errorUpdateFailed'));
      }
    });
  }

  return (
    <Modal
      isOpen
      onClose={() => !pending && onClose('cancelled')}
      title={t('editTitle')}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-charcoal-muted">
          {t('editEmailReadOnlyHint', { email: row.email })}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="edit-fullname" className={LABEL_BASE}>
              {t('editLabelName')}
            </label>
            <input
              id="edit-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className={INPUT_BASE}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="edit-phone" className={LABEL_BASE}>
              {t('editLabelPhone')}
            </label>
            <input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder="010-1234-5678"
              className={INPUT_BASE}
            />
          </div>

          <div>
            <label htmlFor="edit-region-top" className={LABEL_BASE}>
              {t('editLabelRegionTop')}
            </label>
            <select
              id="edit-region-top"
              value={regionTop}
              onChange={(e) => handleRegionTopChange(e.target.value)}
              className={INPUT_BASE}
            >
              {REGIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-region-sub" className={LABEL_BASE}>
              {t('editLabelRegionSub')}
            </label>
            {subOptions.length > 0 ? (
              <select
                id="edit-region-sub"
                value={regionSub}
                onChange={(e) => setRegionSub(e.target.value)}
                className={INPUT_BASE}
              >
                <option value="">—</option>
                {subOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="edit-region-sub"
                type="text"
                value={regionSub}
                onChange={(e) => setRegionSub(e.target.value)}
                disabled
                className={INPUT_BASE}
                placeholder={t('editRegionSubNotApplicable')}
              />
            )}
          </div>
        </div>

        <div>
          <label htmlFor="edit-message" className={LABEL_BASE}>
            {t('editLabelMessage')}
          </label>
          <textarea
            id="edit-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            className={INPUT_BASE}
          />
          <p className="mt-1 text-xs text-charcoal-muted text-right">{message.length}/500</p>
        </div>

        <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
          <legend className="px-2 text-xs font-semibold text-charcoal-deep">
            {t('editFlagsLegend')}
          </legend>
          <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={messagePublic}
              onChange={(e) => setMessagePublic(e.target.checked)}
              disabled={!message.trim()}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>{t('editFlagMessagePublic')}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={isCommittee}
              onChange={(e) => setIsCommittee(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>{t('editFlagCommittee')}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={isMasked}
              onChange={(e) => setIsMasked(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>{t('editFlagMasked')}</span>
          </label>
        </fieldset>

        {err && (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger-a11y"
          >
            {err}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onClose('cancelled')}
            disabled={pending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-gray-50 disabled:opacity-50"
          >
            {t('editCancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
          >
            {pending ? t('editSaving') : t('editSave')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
