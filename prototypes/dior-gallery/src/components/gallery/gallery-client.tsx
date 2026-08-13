'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { GalleryOverlay } from './gallery-overlay';
import { chapters } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';

const GalleryCanvas = dynamic(
  () => import('./gallery-canvas').then((module) => module.GalleryCanvas),
  { ssr: false, loading: () => <div className="loading">PREPARING THE EXHIBITION</div> },
);

export function GalleryClient() {
  const [supported, setSupported] = useState(true);
  const setProgress = useGalleryStore((state) => state.setProgress);
  const setChapter = useGalleryStore((state) => state.setChapter);
  const setPointerX = useGalleryStore((state) => state.setPointerX);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const supportFrame = window.requestAnimationFrame(() => {
      setSupported(Boolean(canvas.getContext('webgl2')));
    });

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setProgress(progress);
      const index = Math.min(chapters.length - 1, Math.round(progress * (chapters.length - 1)));
      setChapter(chapters[index]?.id ?? 'archive');
    };
    const pointer = (event: PointerEvent) => setPointerX((event.clientX / window.innerWidth - 0.5) * 2);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('pointermove', pointer, { passive: true });
    return () => {
      window.cancelAnimationFrame(supportFrame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('pointermove', pointer);
    };
  }, [setChapter, setPointerX, setProgress]);

  if (!supported) {
    return <main className="fallback"><p>이 브라우저에서는 WebGL 2를 사용할 수 없습니다.<br />최신 브라우저에서 전시를 열어주세요.</p></main>;
  }

  return <main className="gallery-shell"><div className="canvas-stage"><GalleryCanvas /></div><GalleryOverlay /></main>;
}
