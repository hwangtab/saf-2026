'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Truck,
  ShieldCheck,
  Award,
  RotateCcw,
  ClipboardList,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Modal from '@/components/ui/Modal';
import { CONTACT } from '@/lib/constants';

interface PurchaseGuideProps {
  className?: string;
}

const ICON_CLASS = 'w-[18px] h-[18px] text-primary shrink-0';

/**
 * 카드 + 모달 한 묶음으로 작품 detail 페이지 우측 단에 상시 노출되는 구매 안내.
 *
 * 카피·라벨은 messages/{ko,en}.json의 `purchaseGuide` namespace로 분리 — 인라인 ternary는
 * 검토·번역 흐름에서 두 분기 sync가 깨지기 쉬워 한 곳(JSON)에서 ko/en을 함께 관리.
 * 강조 표기(<strong>)는 t.rich로 처리.
 */
const CARD_ICONS: Record<string, ReactNode> = {
  shipping: <Truck className={ICON_CLASS} />,
  secure: <ShieldCheck className={ICON_CLASS} />,
  certificate: <Award className={ICON_CLASS} />,
  refund: <RotateCcw className={ICON_CLASS} />,
};

const CARD_KEYS = ['shipping', 'secure', 'certificate', 'refund'] as const;

const strongFormatter = (chunks: ReactNode) => <span className="font-semibold">{chunks}</span>;

export default function PurchaseGuide({ className }: PurchaseGuideProps) {
  const t = useTranslations('purchaseGuide');
  const tCards = useTranslations('purchaseGuide.cards');
  const tSections = useTranslations('purchaseGuide.sections');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className={cn('rounded-xl bg-gray-50 p-4 space-y-3', className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {CARD_KEYS.map((key) => (
            <div key={key} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-surface flex items-center justify-center shrink-0">
                {CARD_ICONS[key]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{tCards(`${key}Label`)}</p>
                <p className="text-xs text-charcoal-soft">{tCards(`${key}Text`)}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-1 text-sm text-primary-a11y hover:underline font-medium pt-2 border-t border-gray-200"
        >
          {t('viewAll')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('modalTitle')}
        className="max-w-3xl"
      >
        <div className="space-y-8 text-sm md:text-base text-charcoal">
          <section className="space-y-3">
            <h4 className="font-bold text-lg text-charcoal flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> {tSections('serviceTitle')}
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p>{tSections.rich('serviceDescription', { strong: strongFormatter })}</p>
              <p className="text-gray-600">
                {tSections('serviceContact', { phone: CONTACT.PHONE, email: CONTACT.EMAIL })}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="font-bold text-lg text-charcoal flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> {tSections('paymentTitle')}
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p>{tSections('paymentDescription')}</p>
              <p className="text-gray-600">{tSections('paymentNote')}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="font-bold text-lg text-charcoal flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" /> {tSections('shippingTitle')}
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p>
                <span className="font-semibold">{tSections('shippingFeeLabel')}</span>{' '}
                {tSections('shippingFeeValue')}
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>{tSections.rich('shippingTier1', { strong: strongFormatter })}</li>
                <li>{tSections.rich('shippingTier2', { strong: strongFormatter })}</li>
                <li>{tSections('shippingDeliveryTime')}</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h4 className="font-bold text-lg text-charcoal flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" /> {tSections('refundTitle')}
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>{tSections.rich('refundItem1', { strong: strongFormatter })}</li>
              <li>{tSections('refundItem2')}</li>
              <li>{tSections.rich('refundItem3', { strong: strongFormatter })}</li>
            </ul>
          </section>
        </div>
      </Modal>
    </>
  );
}
