'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ButtonProps {
    children: React.ReactNode;
    href?: string;
    onClick?: () => Promise<void> | void;
    variant?: 'primary' | 'secondary' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    external?: boolean;
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

export default function Button({
    children,
    href,
    onClick,
    variant = 'primary',
    size = 'md',
    external = false,
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
}: ButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        if (onClick && !isLoading && !disabled && !loading) {
            setIsLoading(true);
            try {
                await onClick();
            } finally {
                setIsLoading(false);
            }
        }
    };

    const baseStyles =
        'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200';

    const variantStyles = {
        primary: 'bg-primary hover:bg-primary-strong text-white',
        secondary: 'bg-gray-900 hover:bg-gray-800 text-white',
        accent: 'bg-accent hover:bg-accent-strong text-light',
    };

    const sizeStyles = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    const isDisabled = disabled || loading || isLoading;

    const styles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
        }`;

    const content = (
        <>
            {(loading || isLoading) && (
                <motion.div
                    className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
            )}
            {children}
        </>
    );

    if (href) {
        if (external) {
            return (
                <a
                    href={href}
                    className={styles}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={isDisabled}
                >
                    {content}
                </a>
            );
        }

        return (
            <Link href={href} className={styles} aria-disabled={isDisabled}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={isDisabled}
            className={styles}
        >
            {content}
        </button>
    );
}
