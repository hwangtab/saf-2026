'use client';

import Button from '@/components/ui/Button';

interface ActionCardProps {
  href: string;
  external?: boolean;
  icon: string;
  title: string;
  description: string;
  linkText: string;
}

export default function ActionCard({
  href,
  external = false,
  icon,
  title,
  description,
  linkText,
}: ActionCardProps) {
  return (
    <div className="group relative flex flex-col h-full p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:border-primary hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full items-center md:items-start text-center md:text-left">
        <div className="text-4xl mb-4 group-hover:scale-105 transition-transform duration-300">
          {icon}
        </div>

        <h3 className="font-sans text-xl font-bold mb-3">{title}</h3>
        <p className="text-charcoal-muted mb-6 leading-relaxed flex-grow">{description}</p>

        <div className="mt-auto w-full md:w-auto">
          <Button
            href={href}
            external={external}
            variant="primary"
            className="w-full md:w-auto inline-flex justify-center"
          >
            {linkText}
          </Button>
        </div>
      </div>
    </div>
  );
}
