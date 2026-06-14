'use client';

import { Link } from '@/i18n/navigation';

export default function FailClient() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal-deep">
          결제가 취소되었습니다
        </h1>
        <p className="mt-3 text-charcoal">다시 시도하시려면 신청 페이지로 돌아가 주세요.</p>
        <Link
          href="/event/oh-yoon-memorial"
          className="mt-6 inline-block font-semibold text-primary-strong underline"
        >
          신청 페이지로
        </Link>
      </div>
    </main>
  );
}
