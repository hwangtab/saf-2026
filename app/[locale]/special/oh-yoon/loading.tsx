export default function OhYoonLoading() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#2a3032]"
    >
      {/* Brutalist stamp spinner */}
      <div className="relative flex items-center justify-center w-12 h-12 border-4 border-white animate-spin">
        <div className="w-2 h-2 bg-accent" />
      </div>
      {/* Label */}
      <span className="text-white/50 text-xs tracking-[0.3em] uppercase">오윤 특별전</span>
    </div>
  );
}
