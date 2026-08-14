'use client';

import type { CSSProperties } from 'react';
import { chapters } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';
import { ScrambleTitle } from './scramble-title';

export function GalleryOverlay() {
  const entered = useGalleryStore((state) => state.entered);
  const chapterId = useGalleryStore((state) => state.chapter);
  const entryProgress = useGalleryStore((state) => state.entryProgress);
  const focusedArtworkId = useGalleryStore((state) => state.focusedArtworkId);
  const progress = useGalleryStore((state) => state.progress);
  const setEntered = useGalleryStore((state) => state.setEntered);
  const setFocusedArtworkId = useGalleryStore((state) => state.setFocusedArtworkId);
  const current = chapters.find((chapter) => chapter.id === chapterId) ?? chapters[0]!;
  const focusedIndex = focusedArtworkId ? Number(focusedArtworkId.split('-').at(-1)) : -1;
  const focusedUrl = focusedIndex >= 0 ? current.images[focusedIndex] : undefined;
  const archiveTextStart = 0.76;
  const showChapterCopy = entered && (current.id !== 'archive' || entryProgress >= archiveTextStart);
  const copyProgress = current.id === 'archive'
    ? Math.min(1, Math.max(0, (entryProgress - archiveTextStart) / (1 - archiveTextStart)))
    : 1;
  const hintTravel = Math.min(1, entryProgress / 0.55);
  const hintStyle = {
    top: `calc(${62 + hintTravel * 38}vh - ${hintTravel * 38}px)`,
  } as CSSProperties;
  const passageOpacity = entryProgress < 0.38
    ? 1
    : Math.max(0, 1 - (entryProgress - 0.38) / 0.34);
  const passageScale = 1 + Math.min(1, entryProgress / 0.72) * 0.03;

  const goTo = (index: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const entryDistance = window.innerHeight * 0.6;
    const journeyDistance = Math.max(1, max - entryDistance);
    window.scrollTo({ top: entryDistance + journeyDistance * (index / (chapters.length - 1)), behavior: 'smooth' });
  };
  const enterExhibition = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setEntered(true);
  };
  const moveArtwork = (direction: number) => {
    const next = (focusedIndex + direction + current.images.length) % current.images.length;
    setFocusedArtworkId(`${current.id}-${next}`);
  };

  return (
    <div className="overlay" aria-live="polite">
      <div className="chapter-wash" data-chapter={chapterId} aria-hidden="true" />
      {!entered ? (
        <section className="entrance">
          <span>VISIONFLOW / WEB3D ARTWORK 01</span>
          <h1>LA GALERIE<br />DES REVES</h1>
          <p className="intro-meaning">‘LA GALERIE DES RÊVES’는 ‘꿈의 갤러리’를 뜻합니다.</p>
          <p className="intro-description">디올의 기억과 형태, 색채와 빛을 따라 이동하는 디지털 전시입니다.</p>
          <button type="button" onClick={enterExhibition}>ENTER EXHIBITION</button>
          <small>SCROLL / MOVE / SELECT</small>
        </section>
      ) : null}
      <div className="brand">DIOR / WEB 3D STUDY</div>
      <div className="prototype">VISIONFLOW / PROTOTYPE 01</div>
      {entered && entryProgress < 0.72 ? (
        <div className="passage-copy" style={{ opacity: passageOpacity, transform: `translate(-50%,-50%) scale(${passageScale})` }}>
          <span>DRIFT INTO THE MARVELOUS</span>
          <small>FOLLOW THE LIGHT. DISCOVER THE MEMORY OF COUTURE.</small>
        </div>
      ) : null}
      {showChapterCopy ? (
        <section className="chapter-copy" style={{ '--entry-opacity': 0.08 + copyProgress * 0.92, '--entry-scale': 0.68 + copyProgress * 0.32 } as CSSProperties}>
          <div className="chapter-index">{current.index} / 04</div>
          <h1><ScrambleTitle key={current.id} text={current.name} /></h1>
          <p><ScrambleTitle durationMs={1900} key={`${current.id}-description`} text={current.description} /></p>
        </section>
      ) : null}
      <div className="progress" aria-hidden="true"><span style={{ transform: `scaleY(${progress})` }} /></div>
      <nav className="chapter-nav" aria-label="Exhibition chapters">
        {chapters.map((chapter, index) => (
          <button key={chapter.id} data-active={chapter.id === chapterId} onClick={() => goTo(index)} type="button">{chapter.index}</button>
        ))}
      </nav>
      {entered ? (
        <div className="hint" data-entry-complete={entryProgress >= 1} style={hintStyle}>
          <span className="mouse-cue" aria-hidden="true"><span /></span>
          <span>{entryProgress < 1 ? 'SCROLL TO ENTER' : 'SCROLL TO EXPLORE'}</span>
        </div>
      ) : null}
      {focusedUrl ? (
        <section className="artwork-detail" aria-modal="true" role="dialog" aria-label="Artwork detail">
          <button className="detail-close" type="button" onClick={() => setFocusedArtworkId(null)}>CLOSE X</button>
          <img src={focusedUrl} alt={`${current.name} artwork ${focusedIndex + 1}`} />
          <div className="detail-copy">
            <span>{current.index} / {String(focusedIndex + 1).padStart(2, '0')}</span>
            <h2>{current.name}</h2>
            <p>{current.subtitle}</p>
          </div>
          <div className="detail-nav">
            <button type="button" onClick={() => moveArtwork(-1)}>PREV</button>
            <button type="button" onClick={() => moveArtwork(1)}>NEXT</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
