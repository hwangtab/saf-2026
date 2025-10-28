'use client';

import { useState, useEffect } from 'react';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

interface CounterItem {
  label: string;
  value: number;
  unit: string;
}

interface DynamicCounterProps {
  items: CounterItem[];
}

export default function DynamicCounter({ items }: DynamicCounterProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (inView && !hasStarted) {
      setHasStarted(true);
    }
  }, [inView, hasStarted]);

  return (
    <section ref={ref} className="py-12 bg-canvas-soft">
      <div className="container-max">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="font-watermelon text-sm font-medium text-charcoal-muted mb-2">
                {item.label}
              </h3>
              <div className="text-3xl font-bold text-primary">
                {hasStarted ? (
                  <>
                    <CountUp end={item.value} duration={2} separator="," />
                    <span className="text-lg">{item.unit}</span>
                  </>
                ) : (
                  <span>0{item.unit}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
