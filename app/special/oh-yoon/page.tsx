import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오윤 40주기 특별전: Oh Yoon 40th Anniversary Special Exhibition',
  description: '씨앗페 2026에서 진행하는 민중미술의 거장 오윤의 40주기 특별전입니다.',
};

export default function OhYoonPage() {
  return (
    <div className="w-full">
      <div className="max-w-[1440px] mx-auto px-4 py-20">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">오윤 40주기 특별전</h1>
          <p className="text-xl text-charcoal/80">Oh Yoon 40th Anniversary Special Exhibition</p>
        </header>

        <div className="min-h-[60vh] flex items-center justify-center bg-canvas-soft border border-dashed border-charcoal/20 rounded-lg">
          <p className="text-charcoal/60">특별전 콘텐츠가 곧 업데이트될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}
