import ExportedImage from 'next-image-export-optimizer';

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
      <div className="animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>
        <ExportedImage
          src="/images/logo/320pxX90px_white.webp"
          alt="씨앗페 온라인"
          width={320}
          height={90}
          className="w-40 md:w-56 h-auto drop-shadow-xl"
          priority
        />
      </div>

      {/* 로딩 dot */}
      <div
        className="mt-8 flex items-center gap-2 animate-fade-in opacity-0"
        style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
      >
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${delay}s`, animationDuration: '0.9s' }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
