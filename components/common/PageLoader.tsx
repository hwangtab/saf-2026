'use client';

export default function PageLoader() {
  return (
    <div
      className="flex items-center justify-center w-full animate-fade-in-up"
      style={{ minHeight: 'calc(100vh - 200px)' }}
    >
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full animate-spin [animation-duration:0.8s] border-t-transparent"></div>
      </div>
    </div>
  );
}
