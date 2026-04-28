import LinkButton from '@/components/ui/LinkButton';

interface NotFoundViewProps {
  icon: string;
  title: string;
  message: string;
  backLink: { href: string; label: string };
}

export default function NotFoundView({ icon, title, message, backLink }: NotFoundViewProps) {
  return (
    <div className="min-h-[100svh] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-6" aria-hidden="true">
          {icon}
        </div>
        <h1 className="text-2xl font-bold mb-4 text-charcoal">{title}</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed">{message}</p>
        <LinkButton href={backLink.href} variant="outline">
          ← {backLink.label}
        </LinkButton>
      </div>
    </div>
  );
}
