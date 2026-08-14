'use client';

import { useEffect, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function ScrambleTitle({ text, durationMs = 1600 }: { text: string; durationMs?: number }) {
  const [rendered, setRendered] = useState(text);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let frame = 0;
    const frameDuration = 42;
    const totalFrames = Math.ceil(durationMs / frameDuration);
    const timer = window.setInterval(() => {
      const progress = Math.max(0, (frame / totalFrames - 0.18) / 0.82);
      const resolved = Math.floor(text.length * progress);
      setRendered(text.split('').map((letter, index) => {
        if (!/[a-z0-9]/i.test(letter) || index < resolved) return letter;
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join(''));
      frame += 1;
      if (frame > totalFrames) {
        window.clearInterval(timer);
        setRendered(text);
      }
    }, frameDuration);

    return () => window.clearInterval(timer);
  }, [durationMs, text]);

  return <span aria-label={text}><span aria-hidden="true">{rendered}</span></span>;
}
