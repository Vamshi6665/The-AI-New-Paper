'use client';

import { useRef } from 'react';
import { Hero } from '@/components/Hero';
import { Chat } from '@/components/Chat';

export default function Home() {
  const chatRef = useRef<HTMLDivElement>(null);
  const scrollToChat = () => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mk" aria-hidden="true">
            <span className="mk-bar" />
            <span className="mk-bar" />
            <span className="mk-bar" />
          </span>
          <span className="bname">THE DAILY EDITION</span>
        </div>
        <nav className="topnav">
          <span className="tn-dot" />
          <span>live engine</span>
        </nav>
      </header>

      <Hero onStart={scrollToChat} />

      <main className="chat-main" ref={chatRef}>
        <Chat />
      </main>
    </div>
  );
}
