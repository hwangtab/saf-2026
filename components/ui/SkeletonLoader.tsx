'use client';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rectangular' | 'circular' | 'chart';
    style?: React.CSSProperties;
}

export function Skeleton({ className = '', variant = 'rectangular', style }: SkeletonProps) {
    const variantStyles = {
        text: 'h-4 w-full rounded',
        rectangular: 'w-full rounded-lg',
        circular: 'rounded-full',
        chart: 'h-96 w-full rounded-lg',
    };

    return (
        <div
            className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer bg-[length:200%_100%] ${variantStyles[variant]} ${className}`}
            style={style}
            role="status"
            aria-label="로딩 중"
        />
    );
}

export function ChartSkeleton() {
    return (
        <div className="h-96 w-full bg-white rounded-lg p-6 space-y-4">
            <Skeleton variant="text" className="w-1/3 h-6" />
            <Skeleton variant="text" className="w-2/3 h-4" />
            <div className="h-64 flex items-end justify-around space-x-2">
                {[60, 80, 40, 90, 70, 50, 85].map((height, i) => (
                    <Skeleton key={i} style={{ height: `${height}%` }} className="flex-1" />
                ))}
            </div>
        </div>
    );
}
