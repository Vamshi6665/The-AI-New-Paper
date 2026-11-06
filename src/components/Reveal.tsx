'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Choreographed entrance. An element reveals once when it scrolls into view,
 * with momentum easing and an optional stagger delay. One consistent motion
 * language across the page — not scattered per-element fades.
 */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  as: Tag = 'div',
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  as?: 'div' | 'section' | 'span' | 'h1' | 'p' | 'header';
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 0.6s cubic-bezier(0.16,0.84,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,0.84,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Comp>
  );
}
