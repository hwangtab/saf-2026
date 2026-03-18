export default function HomeLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero only — full screen dark matching BackgroundSlider + gradient overlay */}
      <div className="relative bg-charcoal min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <div className="h-10 w-64 mx-auto animate-pulse rounded bg-white/10" />
          <div className="h-6 w-80 mx-auto animate-pulse rounded bg-white/10" />
          <div className="flex gap-4 justify-center mt-8">
            <div className="h-12 w-36 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-36 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
