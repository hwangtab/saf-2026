'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface FadeInSectionProps {
    children: React.ReactNode;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
}

export default function FadeInSection({
    children,
    delay = 0,
    direction = 'up',
}: FadeInSectionProps) {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const directionOffset = {
        up: { y: 40 },
        down: { y: -40 },
        left: { x: 40 },
        right: { x: -40 },
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, ...directionOffset[direction] }}
            animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
            transition={{ duration: 0.6, delay, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}
