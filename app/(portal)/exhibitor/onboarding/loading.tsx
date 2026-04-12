import Spinner from '@/components/ui/Spinner';

export default function ExhibitorOnboardingLoading() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-screen items-center justify-center bg-canvas-soft"
    >
      <Spinner size="lg" variant="subtle" />
    </div>
  );
}
