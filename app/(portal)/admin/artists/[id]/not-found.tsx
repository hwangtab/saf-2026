import Link from 'next/link';

export default function AdminArtistNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm px-6 text-center">
        <div className="mb-4 text-5xl">👤</div>
        <h1 className="mb-3 text-xl font-bold text-slate-800">작가를 찾을 수 없습니다</h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-500">
          요청하신 작가가 존재하지 않거나 삭제되었습니다.
        </p>
        <Link
          href="/admin/artists"
          className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          ← 작가 목록으로
        </Link>
      </div>
    </div>
  );
}
