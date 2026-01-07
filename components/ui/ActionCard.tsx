'use client';

import Link from 'next/link';

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
  const Component = external ? 'a' : Link;
  const externalProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <div className="group relative flex flex-col h-full p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:border-primary hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Icon with CSS animation (simplified from Framer Motion) */}
        <div className="text-4xl mb-4 group-hover:scale-105 transition-transform duration-300">
          {icon}
        </div>

        <h3 className="font-sans text-xl font-bold mb-3">{title}</h3>
        <p className="text-charcoal-muted mb-6 leading-relaxed flex-grow">{description}</p>

        {/* Button */}
        <Component
          href={href}
          {...externalProps}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-primary/50"
        >
          {linkText}
        </Component>
      </div>
    </div>
  );
}
