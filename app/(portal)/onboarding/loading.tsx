import Spinner from '@/components/ui/Spinner';

export default function OnboardingLoading() {
  return (
    <div aria-hidden="true" className="flex min-h-screen items-center justify-center bg-gray-50">
      <Spinner size="lg" variant="subtle" />
    </div>
  );
}
