import SafeImage from '@/components/common/SafeImage';

interface BrandLoaderProps {
  minHeight?: string;
}

export default function BrandLoader({ minHeight = '80vh' }: BrandLoaderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-charcoal"
      style={{ minHeight }}
      aria-label="로딩 중"
      role="status"
    >
      {/* 로고 */}
      <div className="animate-fade-in opacity-0">
        <SafeImage
          src="/images/logo/320pxX90px_white.webp"
          alt="씨앗페 온라인 – SAF Online"
          width={320}
          height={90}
          className="w-72 md:w-96 max-w-[85vw] h-auto"
          placeholder="empty"
          priority
        />
      </div>

      {/* 로딩 dot */}
      <div className="mt-6 flex items-center gap-2 animate-fade-in opacity-0 [animation-delay:0.2s]">
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="inline-block w-2.5 h-2.5 rounded-full bg-white/60 animate-bounce"
            style={{ animationDelay: `${delay}s`, animationDuration: '0.9s' }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
