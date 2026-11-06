'use client';

import { useEffect, useState } from 'react';

/**
 * The hero: a condensed, kinetic headline that resolves on load — each line
 * rises into place with momentum and a slight stagger — over a live telemetry
 * line. One orchestrated page-load sequence, then it's still.
 */
export function Hero({ onStart }: { onStart: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lines = ['YOUR DAY,', 'ENGINEERED', 'INTO A PAPER.'];

  return (
    <section className="hero">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-eyebrow" style={rise(mounted, 0)}>
          <span className="pulse" />
          The Daily Edition · built in seconds
        </div>

        <h1 className="hero-h1">
          {lines.map((ln, i) => (
            <span className="hl-line" key={i}>
              <span className="hl-text" style={rise(mounted, 120 + i * 90)}>
                {ln}
              </span>
            </span>
          ))}
        </h1>

        <p className="hero-sub" style={rise(mounted, 440)}>
          Tell it your day in plain words. A performance engine reads it, sets the headlines, and hands you a
          personal newspaper — ready to read with coffee and print.
        </p>

        <div className="hero-cta" style={rise(mounted, 540)}>
          <button className="btn-primary" onClick={onStart} type="button">
            Start your edition
            <span className="btn-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
          <div className="hero-stat">
            <span className="stat-n">6AM</span>
            <span className="stat-l">off the press</span>
          </div>
        </div>
      </div>

      <div className="telemetry" style={rise(mounted, 640)} aria-hidden="true">
        <div className="tel-track">
          <div className="tel-fill" />
        </div>
        <div className="tel-readout">
          <span>INPUT</span>
          <span>PARSE</span>
          <span>COMPOSE</span>
          <span>PRINT</span>
        </div>
      </div>
    </section>
  );
}

function rise(on: boolean, delay: number): React.CSSProperties {
  return {
    opacity: on ? 1 : 0,
    transform: on ? 'translateY(0)' : 'translateY(26px)',
    transition: `opacity 0.7s cubic-bezier(0.16,0.84,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,0.84,0.3,1) ${delay}ms`,
  };
}
