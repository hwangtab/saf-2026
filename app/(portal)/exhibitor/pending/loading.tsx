export default function ExhibitorPendingLoading() {
  return (
    <div aria-hidden="true" className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
    </div>
  );
}
