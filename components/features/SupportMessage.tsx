import { cn } from '@/lib/utils';

interface SupportMessageProps {
  className?: string;
}

export default function SupportMessage({ className }: SupportMessageProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-white border border-green-100 p-6 text-center transition-transform hover:scale-[1.01] duration-300',
        className
      )}
    >
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="text-3xl animate-pulse">💚</span>

        <div className="space-y-1">
          <h3 className="font-bold text-gray-800 text-lg break-keep">
            이 작품 구매로
            <br />
            예술인의 창작 활동을 응원합니다
          </h3>
          <p className="text-sm text-gray-500 font-medium break-keep opacity-80 mt-2">
            씨앗페 2026은 예술인의 고리대금
            <br />
            문제 해결을 위한 전시입니다
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-green-200 rounded-full blur-2xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-yellow-200 rounded-full blur-2xl opacity-20 pointer-events-none" />
    </div>
  );
}
