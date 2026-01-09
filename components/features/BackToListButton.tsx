'use client';

import { useRouter } from 'next/navigation';

export default function BackToListButton() {
  const router = useRouter();

  const handleBack = () => {
    // 브라우저 히스토리가 있으면 뒤로가기, 없으면 /artworks로 이동
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/artworks');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors"
    >
      ← 목록으로 돌아가기
    </button>
  );
}
