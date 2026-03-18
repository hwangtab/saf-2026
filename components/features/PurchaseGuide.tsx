'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { CONTACT } from '@/lib/constants';

interface PurchaseGuideProps {
  className?: string;
}

export default function PurchaseGuide({ className }: PurchaseGuideProps) {
  const locale = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const copy =
    locale === 'en'
      ? {
          modalTitle: 'Purchase and service guide',
          details: 'Details',
          guides: [
            {
              icon: '📦',
              label: 'Shipping',
              text: 'Conditional free shipping',
              action: true,
            },
            {
              icon: '🔒',
              label: 'Secure payment',
              text: 'SSL secure payment system',
              action: true,
            },
            {
              icon: '📜',
              label: 'Certificate',
              text: 'Certificate of authenticity included',
              action: false,
            },
            {
              icon: '↩️',
              label: 'Cancel/Refund',
              text: 'Withdrawal possible within 7 days after delivery',
              action: true,
            },
          ],
        }
      : {
          modalTitle: '구매 및 이용 안내',
          details: '자세히 보기',
          guides: [
            {
              icon: '📦',
              label: '배송 안내',
              text: '조건부 무료배송',
              action: true,
            },
            {
              icon: '🔒',
              label: '안전 결제',
              text: 'SSL 보안 결제 시스템',
              action: true,
            },
            {
              icon: '📜',
              label: '작품 보증서',
              text: '모든 작품 진품 보증서 발급',
              action: false,
            },
            {
              icon: '↩️',
              label: '취소/환불',
              text: '수령 후 7일 이내 청약철회 가능',
              action: true,
            },
          ],
        };

  return (
    <>
      <div className={cn('rounded-xl bg-gray-50 p-4 space-y-2', className)}>
        {copy.guides.map((guide, index) => (
          <div key={index} className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">{guide.icon}</span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900 inline-block mr-1">{guide.label}:</h4>
              <span className="text-sm text-gray-600">
                {guide.text}
                {guide.action ? (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="ml-1 text-blue-600 hover:underline font-medium"
                  >
                    {copy.details}
                  </button>
                ) : null}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={copy.modalTitle}
        className="max-w-3xl"
      >
        {locale === 'en' ? (
          <div className="space-y-8 text-sm md:text-base text-gray-700">
            <section className="space-y-3">
              <h4 className="font-bold text-lg text-charcoal">🧾 Service overview</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p>
                  Each order covers one physical artwork based on the listed details. Processing
                  flow: payment confirmation, final condition check, then shipment.
                </p>
                <p className="text-gray-600">
                  Contact: {CONTACT.PHONE} / {CONTACT.EMAIL} (Weekdays 10:00-18:00 KST)
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-lg text-charcoal">💳 Payment</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p>Payments are handled securely via Cafe24 SSL checkout.</p>
                <p className="text-gray-600">
                  Order confirmation timing may vary depending on payment method approval.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-lg text-charcoal">📦 Shipping</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p>
                  <span className="font-semibold">Shipping fee:</span> Conditional free shipping
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>Order below KRW 200,000: KRW 4,000</li>
                  <li>Order KRW 200,000 or above: Free</li>
                  <li>Typical delivery: 3-4 business days after payment confirmation</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="font-bold text-lg text-charcoal">↩️ Cancellation and refund</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Withdrawal due to change of mind is available within 7 days after delivery.</li>
                <li>
                  Defects or wrong delivery are eligible for exchange/refund at seller expense.
                </li>
                <li>
                  Return shipping for change-of-mind cases is buyer-paid; refunds are processed to
                  the original payment method after return inspection.
                </li>
              </ul>
            </section>
          </div>
        ) : (
          <div className="space-y-8 text-sm md:text-base">
            <section className="space-y-3">
              <h4 className="font-bold text-lg text-charcoal">🧾 서비스 내용 및 이용 안내</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-gray-700">
                <p>
                  본 상품은 등록된 작품 상세정보 기준의 실물 작품 1점을 제공합니다. 구매 후{' '}
                  <span className="font-semibold">결제 확인 → 작품 상태 최종 검수 → 발송</span>{' '}
                  순으로 진행됩니다.
                </p>
                <p className="text-gray-600">
                  문의: {CONTACT.PHONE} / {CONTACT.EMAIL} (평일 10:00~18:00)
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-lg text-charcoal">💳 결제 안내</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-gray-700">
                <p>카페24 보안결제(SSL) 시스템을 통해 안전하게 결제가 처리됩니다.</p>
                <p className="text-gray-600">
                  결제수단별 승인 시점에 따라 주문 확정 시점이 달라질 수 있습니다.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-lg text-charcoal">📦 택배 배송 안내</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-gray-700">
                <p>
                  <span className="font-semibold">배송비:</span> 조건부 무료
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>
                    주문 금액{' '}
                    <span className="text-charcoal font-semibold">20만원 미만 시: 4,000원</span>
                  </li>
                  <li>
                    주문 금액{' '}
                    <span className="text-charcoal font-semibold">20만원 이상 시: 무료 배송</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="font-bold text-lg text-charcoal">↩️ 취소 · 교환 · 환불 정책</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  단순변심 청약철회는 <span className="font-semibold">수령 후 7일 이내</span>{' '}
                  가능합니다.
                </li>
                <li>작품 하자/오배송은 판매자 부담으로 교환 또는 환불 처리됩니다.</li>
                <li>
                  단순변심 반품 배송비는 구매자 부담이며, 반품 확인 후{' '}
                  <span className="font-semibold">3영업일 이내</span> 원결제수단으로 환불됩니다.
                </li>
              </ul>
            </section>
          </div>
        )}
      </Modal>
    </>
  );
}
