'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chapters } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';
import { ScrambleTitle } from './scramble-title';

const easeInOutCubic = (value: number) => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

export function GalleryOverlay() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copyCompact, setCopyCompact] = useState(false);
  const [endCardVisible, setEndCardVisible] = useState(false);
  const [projectNotesOpen, setProjectNotesOpen] = useState(false);
  const entered = useGalleryStore((state) => state.entered);
  const chapterId = useGalleryStore((state) => state.chapter);
  const entryProgress = useGalleryStore((state) => state.entryProgress);
  const focusedArtworkId = useGalleryStore((state) => state.focusedArtworkId);
  const progress = useGalleryStore((state) => state.progress);
  const reducedMotion = useGalleryStore((state) => state.reducedMotion);
  const setEntered = useGalleryStore((state) => state.setEntered);
  const setFocusedArtworkId = useGalleryStore((state) => state.setFocusedArtworkId);
  const current = chapters.find((chapter) => chapter.id === chapterId) ?? chapters[0]!;
  const focusedIndex = focusedArtworkId ? Number(focusedArtworkId.split('-').at(-1)) : -1;
  const focusedUrl = focusedIndex >= 0 ? current.images[focusedIndex] : undefined;
  const archiveTextStart = 0.76;
  const showChapterCopy = entered && (current.id !== 'archive' || entryProgress >= archiveTextStart);
  const copyProgress = current.id === 'archive' ? Math.min(1, Math.max(0, (entryProgress - archiveTextStart) / (1 - archiveTextStart))) : 1;
  const hintTravel = Math.min(1, entryProgress / 0.55);
  const hintStyle = { top: `calc(${62 + hintTravel * 38}vh - ${hintTravel * 38}px)` } as CSSProperties;
  const passageOpacity = entryProgress < 0.38 ? 1 : Math.max(0, 1 - (entryProgress - 0.38) / 0.34);
  const passageScale = 1 + Math.min(1, entryProgress / 0.72) * 0.03;

  const animateScrollTo = useCallback((target: number, duration = 1050) => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    if (reducedMotion || duration === 0) {
      window.scrollTo({ top: target, behavior: 'auto' });
      return;
    }
    const from = window.scrollY;
    const distance = target - from;
    const startedAt = performance.now();
    const tick = (timestamp: number) => {
      const amount = Math.min(1, (timestamp - startedAt) / duration);
      window.scrollTo({ top: from + distance * easeInOutCubic(amount), behavior: 'auto' });
      if (amount < 1) scrollFrameRef.current = window.requestAnimationFrame(tick);
      else scrollFrameRef.current = null;
    };
    scrollFrameRef.current = window.requestAnimationFrame(tick);
  }, [reducedMotion]);

  const goTo = useCallback((index: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const entryDistance = window.innerHeight * 0.6;
    const journeyDistance = Math.max(1, max - entryDistance);
    animateScrollTo(entryDistance + journeyDistance * (index / (chapters.length - 1)), 1100);
  }, [animateScrollTo]);

  useEffect(() => {
    setCopyCompact(false);
    if (!showChapterCopy || reducedMotion) return;
    const timer = window.setTimeout(() => setCopyCompact(true), 2500);
    return () => window.clearTimeout(timer);
  }, [chapterId, reducedMotion, showChapterCopy]);

  useEffect(() => {
    setEndCardVisible(false);
    if (!entered || chapterId !== 'reverie' || progress < .96) return;
    const timer = window.setTimeout(() => setEndCardVisible(true), reducedMotion ? 0 : 3600);
    return () => window.clearTimeout(timer);
  }, [chapterId, entered, progress, reducedMotion]);

  useEffect(() => {
    if (!entered) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectNotesOpen(false);
        setFocusedArtworkId(null);
        return;
      }
      if (projectNotesOpen || focusedArtworkId) return;
      const currentIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        goTo(Math.min(chapters.length - 1, currentIndex + 1));
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        goTo(Math.max(0, currentIndex - 1));
      } else if (/^[1-4]$/.test(event.key)) {
        event.preventDefault();
        goTo(Number(event.key) - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chapterId, entered, focusedArtworkId, goTo, projectNotesOpen, setFocusedArtworkId]);

  const fadeAudio = (targetVolume: number, duration: number, onComplete?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeFrameRef.current !== null) window.cancelAnimationFrame(fadeFrameRef.current);
    const initialVolume = audio.volume;
    const startedAt = performance.now();
    const updateVolume = (timestamp: number) => {
      const amount = Math.min(1, (timestamp - startedAt) / duration);
      const eased = amount * amount * (3 - 2 * amount);
      audio.volume = initialVolume + (targetVolume - initialVolume) * eased;
      if (amount < 1) fadeFrameRef.current = window.requestAnimationFrame(updateVolume);
      else { fadeFrameRef.current = null; onComplete?.(); }
    };
    fadeFrameRef.current = window.requestAnimationFrame(updateVolume);
  };

  const playAmbient = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0;
    void audio.play().then(() => fadeAudio(.3, 2200)).catch(() => setSoundEnabled(false));
  };

  useEffect(() => () => {
    if (fadeFrameRef.current !== null) window.cancelAnimationFrame(fadeFrameRef.current);
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    audioRef.current?.pause();
  }, []);

  const enterExhibition = () => {
    if (soundEnabled) playAmbient();
    window.scrollTo({ top: 0, behavior: 'auto' });
    setEntered(true);
    window.requestAnimationFrame(() => animateScrollTo(window.innerHeight * .6, 820));
  };
  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (soundEnabled) {
      setSoundEnabled(false);
      fadeAudio(0, 450, () => audio.pause());
    } else {
      setSoundEnabled(true);
      playAmbient();
    }
  };
  const moveArtwork = (direction: number) => {
    const next = (focusedIndex + direction + current.images.length) % current.images.length;
    setFocusedArtworkId(`${current.id}-${next}`);
  };

  return (
    <div className="overlay">
      <audio ref={audioRef} loop playsInline preload="metadata" src="/audio/velvet.mp3" />
      <div className="chapter-wash" data-chapter={chapterId} aria-hidden="true" />
      {!entered ? (
        <section className="entrance">
          <span>VISIONFLOW / WEB3D ARTWORK 01</span>
          <h1>LA GALERIE<br />DES REVES</h1>
          <p className="intro-meaning">‘LA GALERIE DES RÊVES’는 ‘꿈의 갤러리’를 뜻합니다.</p>
          <p className="intro-description">디올의 기억과 형태, 색채와 빛을 따라 이동하는 독립 디지털 전시입니다.</p>
          <p className="intro-origin">2026년 봄, 2025년 서울 DDP에서 열린 &lt;Christian Dior: Designer of Dreams&gt;의 기억과 영감에서 시작되었습니다.</p>
          <button type="button" onClick={enterExhibition}>ENTER WITH SOUND</button>
          <small>INDEPENDENT CONCEPT STUDY — NOT COMMISSIONED BY DIOR</small>
        </section>
      ) : null}
      <div className="brand">DIOR / WEB 3D STUDY</div>
      <div className="prototype">VISIONFLOW / INDEPENDENT PROTOTYPE</div>
      {entered ? (
        <button aria-label={`Turn ambient sound ${soundEnabled ? 'off' : 'on'}`} aria-pressed={soundEnabled} className="sound-toggle" data-enabled={soundEnabled} onClick={toggleSound} type="button">
          <span className="sound-graph" aria-hidden="true">{[0, 1, 2, 3].map((bar) => <span key={bar} />)}</span><span>SOUND {soundEnabled ? 'ON' : 'OFF'}</span>
        </button>
      ) : null}
      {entered && entryProgress < 0.72 ? (
        <div className="passage-copy" style={{ opacity: passageOpacity, transform: `translate(-50%,-50%) scale(${passageScale})` }}><span>DRIFT INTO THE MARVELOUS</span><small>FOLLOW THE LIGHT. DISCOVER THE MEMORY OF COUTURE.</small></div>
      ) : null}
      {showChapterCopy ? (
        <section className="chapter-copy" data-compact={copyCompact} style={{ '--entry-opacity': 0.08 + copyProgress * 0.92, '--entry-scale': 0.68 + copyProgress * 0.32 } as CSSProperties}>
          <div className="chapter-index">{current.index} / 04</div>
          <h1><ScrambleTitle key={current.id} text={current.name} /></h1>
          <p className="chapter-description"><ScrambleTitle durationMs={1900} key={`${current.id}-description`} text={current.description} /></p>
          <p className="chapter-curation">{current.curation}</p>
        </section>
      ) : null}
      <div className="progress" aria-hidden="true"><span style={{ transform: `scaleY(${progress})` }} /></div>
      <nav className="chapter-nav" aria-label="Exhibition chapters">
        {chapters.map((chapter, index) => <button aria-label={`Go to ${chapter.name}`} aria-current={chapter.id === chapterId ? 'step' : undefined} key={chapter.id} data-active={chapter.id === chapterId} onClick={() => goTo(index)} type="button">{chapter.index}</button>)}
      </nav>
      {entered ? (
        <div className="hint" data-entry-complete={entryProgress >= 1} style={hintStyle}><span className="mouse-cue" aria-hidden="true"><span /></span><span>{entryProgress < 1 ? 'ENTERING THE ARCHIVE' : 'SCROLL TO EXPLORE'}</span></div>
      ) : null}
      {endCardVisible ? (
        <section className="end-card" aria-label="End of exhibition">
          <span>THE END / 04</span><h2>A VISIONFLOW<br />WEB3D STUDY</h2>
          <p className="end-origin"><b>SPRING 2026 / SEOUL</b>Inspired by <i>Christian Dior: Designer of Dreams</i>, presented at DDP Seoul from April 19 to July 13, 2025.</p>
          <p>Creative direction · Responsive 3D art direction<br />WebGL development · Interaction and sound design</p>
          <div className="end-actions"><button type="button" onClick={() => { setEndCardVisible(false); goTo(0); }}>REPLAY EXPERIENCE</button><button type="button" onClick={() => setProjectNotesOpen(true)}>PROJECT NOTES</button><a href="/">BACK TO VISIONFLOW</a></div>
          <div className="end-credit"><b>CREATIVE DIRECTION &amp; DEVELOPMENT</b><span>Gichul Roh / Visionflow</span><b className="sound-credit-label">AMBIENT SOUND</b><span>Created with Suno AI</span><div className="credit-links"><a href="https://www.linkedin.com/in/gichulroh/" rel="noreferrer" target="_blank">LINKEDIN</a><a href="https://www.visionflow.kr/" rel="noreferrer" target="_blank">VISIONFLOW</a><a href="https://www.routebase.info/" rel="noreferrer" target="_blank">ROUTEBASE</a></div></div>
          <small>Independent conceptual prototype. Not affiliated with or commissioned by Dior.<br />Photography and creative development by Visionflow, 2026.</small>
        </section>
      ) : null}
      {projectNotesOpen ? (
        <section aria-label="Project notes" aria-modal="true" className="project-notes" role="dialog">
          <button aria-label="Close project notes" className="notes-close" onClick={() => setProjectNotesOpen(false)} type="button">CLOSE</button>
          <span>PROJECT NOTES / VISIONFLOW</span><h2>Fashion memory,<br />reframed as space.</h2>
          <div className="notes-grid"><p><b>ORIGIN</b>2026년 봄에 제작했습니다. 2025년 4월 19일부터 7월 13일까지 서울 DDP에서 열린 <i>Christian Dior: Designer of Dreams</i> 전시에서 받은 영감으로 시작한 독립 Web3D 스터디입니다.</p><p><b>CONCEPT</b>Four chapters translate archive, craft, color, and dream into a continuous spatial narrative.</p><p><b>ROLE</b>Creative direction, interaction design, photography, WebGL development, and responsive 3D art direction.</p><p><b>TECHNOLOGY</b>Next.js, React, TypeScript, React Three Fiber, Three.js, and GLSL shaders.</p><p><b>SOUND</b>One continuous spatial ambient track, created with Suno AI and integrated as an optional exhibition layer.</p><p><b>MOBILE</b>Dedicated camera paths, scaled geometry, reduced texture resolution, and controlled device pixel ratio.</p></div>
          <div className="notes-credit"><span>GICHUL ROH / VISIONFLOW</span><a href="https://www.linkedin.com/in/gichulroh/" rel="noreferrer" target="_blank">LINKEDIN</a><a href="https://www.visionflow.kr/" rel="noreferrer" target="_blank">VISIONFLOW.KR</a><a href="https://www.routebase.info/" rel="noreferrer" target="_blank">ROUTEBASE.INFO</a></div>
        </section>
      ) : null}
      {focusedUrl ? (
        <section className="artwork-detail" aria-modal="true" role="dialog" aria-label="Artwork detail">
          <button className="detail-close" type="button" onClick={() => setFocusedArtworkId(null)}>CLOSE X</button><img src={focusedUrl} alt={`${current.name} artwork ${focusedIndex + 1}`} />
          <div className="detail-copy"><span>{current.index} / {String(focusedIndex + 1).padStart(2, '0')}</span><h2>{current.name}</h2><p>{current.subtitle}</p></div>
          <div className="detail-nav"><button type="button" onClick={() => moveArtwork(-1)}>PREV</button><button type="button" onClick={() => moveArtwork(1)}>NEXT</button></div>
        </section>
      ) : null}
    </div>
  );
}
