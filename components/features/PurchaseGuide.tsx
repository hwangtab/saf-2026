import { cn } from '@/lib/utils';

interface PurchaseGuideProps {
  className?: string;
}

export default function PurchaseGuide({ className }: PurchaseGuideProps) {
  const guides = [
    {
      icon: '📦',
      label: '배송 안내',
      text: '전국 무료배송 (전시 종료 후 3-7일 소요)',
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
    <div className={cn('rounded-xl bg-gray-50 p-4 space-y-2', className)}>
      {guides.map((guide, index) => (
        <div key={index} className="flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5">{guide.icon}</span>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900 inline-block mr-1">{guide.label}:</h4>
            <span className="text-sm text-gray-600">{guide.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
