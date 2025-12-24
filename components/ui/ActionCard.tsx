'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

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
    const Component = external ? motion.a : motion(Link);
    const externalProps = external
        ? { target: '_blank' as const, rel: 'noopener noreferrer' }
        : {};

    return (
        <Component
            href={href}
            {...externalProps}
            className="group relative flex flex-col p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm transition-shadow duration-300 overflow-hidden focus:outline-none focus:ring-4 focus:ring-primary/50"
            whileHover={{ y: -8, borderColor: '#2176FF', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10">
                {/* Icon with scale animation */}
                <motion.div
                    className="text-4xl mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                    {icon}
                </motion.div>

                <h3 className="font-sans text-xl font-bold mb-3">{title}</h3>
                <p className="text-charcoal-muted mb-4 flex-grow leading-relaxed">{description}</p>

                {/* Link with arrow animation */}
                <span className="inline-flex items-center gap-2 text-primary font-semibold">
                    {linkText}
                    <motion.svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        initial={{ x: 0 }}
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </motion.svg>
                </span>
            </div>
        </Component>
    );
}
