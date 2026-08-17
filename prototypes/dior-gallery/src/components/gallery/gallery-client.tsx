'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { DefaultLoadingManager } from 'three';

import { GalleryOverlay } from './gallery-overlay';
import { chapters } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';

const GalleryCanvas = dynamic(
  () => import('./gallery-canvas').then((module) => module.GalleryCanvas),
  { ssr: false, loading: () => null },
);

export function GalleryClient() {
  const [supported, setSupported] = useState(true);
  const [managerReady, setManagerReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const initialLoadCompleteRef = useRef(false);
  const setProgress = useGalleryStore((state) => state.setProgress);
  const setEntryProgress = useGalleryStore((state) => state.setEntryProgress);
  const setChapter = useGalleryStore((state) => state.setChapter);
  const setPointerX = useGalleryStore((state) => state.setPointerX);
  const setReducedMotion = useGalleryStore((state) => state.setReducedMotion);

  useEffect(() => {
    const previousStart = DefaultLoadingManager.onStart;
    const previousProgress = DefaultLoadingManager.onProgress;
    const previousLoad = DefaultLoadingManager.onLoad;
    DefaultLoadingManager.onStart = () => {
      if (!initialLoadCompleteRef.current) setInitialLoading(true);
    };
    DefaultLoadingManager.onProgress = (_url, loaded, total) => {
      if (!initialLoadCompleteRef.current) setLoadingProgress(Math.round((loaded / Math.max(1, total)) * 100));
    };
    DefaultLoadingManager.onLoad = () => {
      if (initialLoadCompleteRef.current) return;
      initialLoadCompleteRef.current = true;
      setLoadingProgress(100);
      setInitialLoading(false);
    };
    setManagerReady(true);
    return () => {
      DefaultLoadingManager.onStart = previousStart;
      DefaultLoadingManager.onProgress = previousProgress;
      DefaultLoadingManager.onLoad = previousLoad;
    };
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(motionQuery.matches);
    updateMotionPreference();
    motionQuery.addEventListener('change', updateMotionPreference);
    const supportFrame = window.requestAnimationFrame(() => {
      setSupported(Boolean(canvas.getContext('webgl2')));
    });

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const entryDistance = window.innerHeight * 0.6;
      const entryProgress = Math.min(1, Math.max(0, window.scrollY / entryDistance));
      const journeyDistance = Math.max(1, max - entryDistance);
      const progress = Math.min(1, Math.max(0, (window.scrollY - entryDistance) / journeyDistance));
      setEntryProgress(entryProgress);
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
      motionQuery.removeEventListener('change', updateMotionPreference);
    };
  }, [setChapter, setEntryProgress, setPointerX, setProgress, setReducedMotion]);

  if (!supported) {
    return <main className="fallback"><p>이 브라우저에서는 WebGL 2를 사용할 수 없습니다.<br />최신 브라우저에서 전시를 열어주세요.</p></main>;
  }

  return (
    <main className="gallery-shell">
      <div className="canvas-stage">{managerReady ? <GalleryCanvas onContextLost={() => setSupported(false)} /> : null}</div>
      {initialLoading ? <div className="loading"><span>PREPARING THE EXHIBITION</span><b>{String(loadingProgress).padStart(2, '0')}%</b></div> : null}
      <GalleryOverlay />
    </main>
  );
}
