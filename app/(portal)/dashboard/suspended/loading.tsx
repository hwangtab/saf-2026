import Spinner from '@/components/ui/Spinner';

export default function DashboardSuspendedLoading() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-screen items-center justify-center bg-canvas-soft"
    >
      <Spinner size="lg" />
    </div>
  );
}
