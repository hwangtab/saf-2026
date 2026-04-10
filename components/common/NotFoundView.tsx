import Link from 'next/link';

interface NotFoundViewProps {
  icon: string;
  title: string;
  message: string;
  backLink: { href: string; label: string };
}

export default function NotFoundView({ icon, title, message, backLink }: NotFoundViewProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-6" aria-hidden="true">
          {icon}
        </div>
        <h1 className="text-2xl font-bold mb-4 text-charcoal">{title}</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed">{message}</p>
        <Link
          href={backLink.href}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary px-6 py-3 text-sm font-bold text-primary transition hover:bg-primary/5"
        >
          ← {backLink.label}
        </Link>
      </div>
    </div>
  );
}
