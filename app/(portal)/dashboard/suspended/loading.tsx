export default function DashboardSuspendedLoading() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-screen items-center justify-center bg-canvas-soft"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-charcoal/20 border-t-primary" />
    </div>
  );
}
