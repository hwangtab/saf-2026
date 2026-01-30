'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

interface PurchaseGuideProps {
  className?: string;
}

export default function PurchaseGuide({ className }: PurchaseGuideProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const guides = [
    {
      icon: '📦',
      label: '배송 안내',
      text: '조건부 무료배송',
      action: {
        label: '자세히 보기',
        onClick: () => setIsModalOpen(true),
      },
    },
    {
      icon: '🔒',
      label: '안전 결제',
      text: 'SSL 보안 결제 시스템',
    },
    {
      icon: '📜',
      label: '작품 보증서',
      text: '모든 작품 진품 보증서 발급',
    },
  ];

  return (
    <>
      <div className={cn('rounded-xl bg-gray-50 p-4 space-y-2', className)}>
        {guides.map((guide, index) => (
          <div key={index} className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">{guide.icon}</span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900 inline-block mr-1">{guide.label}:</h4>
              <span className="text-sm text-gray-600">
                {guide.text}
                {guide.action && (
                  <button
                    onClick={guide.action.onClick}
                    className="ml-1 text-blue-600 hover:underline font-medium"
                  >
                    {guide.action.label}
                  </button>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="배송 및 설치 안내"
        className="max-w-3xl"
      >
        <div className="space-y-8 text-sm md:text-base">
          {/* 기본 배송 안내 */}
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

          {/* 미술품 전문 운송 */}
          <section className="space-y-4">
            <h4 className="font-bold text-lg text-charcoal">🚛 미술품 전문 운송 안내</h4>
            <p className="text-gray-600">
              작품의 안전을 위해 아래 기준에 해당하는 경우, 일반 택배가 아닌{' '}
              <span className="font-semibold text-charcoal">미술품 전문 운송 차량</span>으로
              배송됩니다.
            </p>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <h5 className="font-semibold text-orange-800 mb-2">
                택배 불가 / 전문 운송 필수 품목
              </h5>
              <ul className="list-disc pl-5 space-y-1 text-orange-700">
                <li>
                  세 변의 합(가로+세로+두께)이 <span className="font-bold">180cm 이상</span>인 대형
                  작품
                </li>
                <li>
                  유리, 도자 등 <span className="font-bold">파손 위험</span>이 있는 품목 (유리 액자
                  포함)
                </li>
              </ul>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3 border border-gray-200">구분</th>
                    <th className="p-3 border border-gray-200 text-center">서울/경기/인천</th>
                    <th className="p-3 border border-gray-200 text-center">강원/충청/전라/경상</th>
                    <th className="p-3 border border-gray-200 text-center">부산</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr>
                    <td className="p-3 border border-gray-200 font-medium">일반 화물운송</td>
                    <td className="p-3 border border-gray-200 text-center">35,000원</td>
                    <td className="p-3 border border-gray-200 text-center">150,000원</td>
                    <td className="p-3 border border-gray-200 text-center">80,000원</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200 font-medium">미술품 전문차량</td>
                    <td className="p-3 border border-gray-200 text-center">100,000원</td>
                    <td className="p-3 border border-gray-200 text-center">250,000원</td>
                    <td className="p-3 border border-gray-200 text-center">150,000원</td>
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td className="p-3 border border-gray-200 font-medium text-blue-900">
                      미술품 전문차량+설치
                    </td>
                    <td className="p-3 border border-gray-200 text-center text-blue-900 font-semibold">
                      150,000원
                    </td>
                    <td className="p-3 border border-gray-200 text-center text-blue-900 font-semibold">
                      300,000원
                    </td>
                    <td className="p-3 border border-gray-200 text-center text-blue-900 font-semibold">
                      150,000원
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500 text-right">* 작품 1점 기준 비용입니다.</p>
            </div>
          </section>

          {/* 배송 기간 */}
          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h4 className="font-bold text-lg text-charcoal">📅 배송 기간</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>
                결제 확인 후 <span className="font-semibold">평균 3~4 영업일</span> 소요
                (주말/공휴일 제외)
              </li>
              <li>경상, 호남, 제주 등 도서산간 지역은 7일 이상 소요될 수 있습니다.</li>
              <li>품목에 따라 약 14일의 별도 제작 기간이 발생할 수 있습니다.</li>
            </ul>
          </section>
        </div>
      </Modal>
    </>
  );
}
