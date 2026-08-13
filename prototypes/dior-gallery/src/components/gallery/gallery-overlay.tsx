'use client';

import { chapters } from '@/config/gallery';
import { useGalleryStore } from '@/store/gallery-store';

export function GalleryOverlay() {
  const chapterId = useGalleryStore((state) => state.chapter);
  const progress = useGalleryStore((state) => state.progress);
  const current = chapters.find((chapter) => chapter.id === chapterId) ?? chapters[0];

  const goTo = (index: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * (index / (chapters.length - 1)), behavior: 'smooth' });
  };

  return (
    <div className="overlay" aria-live="polite">
      <div className="chapter-wash" data-chapter={chapterId} aria-hidden="true" />
      <div className="brand">DIOR · WEB 3D STUDY</div>
      <div className="prototype">VISIONFLOW / PROTOTYPE 01</div>
      <section className="chapter-copy">
        <div className="chapter-index">{current.index} / 04</div>
        <h1>{current.name}</h1>
        <p>{current.subtitle}</p>
      </section>
      <div className="progress" aria-hidden="true"><span style={{ transform: `scaleY(${progress})` }} /></div>
      <nav className="chapter-nav" aria-label="전시 챕터">
        {chapters.map((chapter, index) => (
          <button key={chapter.id} data-active={chapter.id === chapterId} onClick={() => goTo(index)} type="button">{chapter.index}</button>
        ))}
      </nav>
      <div className="hint">SCROLL TO EXPLORE</div>
    </div>
  );
}
