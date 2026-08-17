export type ChapterId = 'archive' | 'atelier' | 'rouge' | 'reverie';

export interface Chapter {
  id: ChapterId;
  index: string;
  name: string;
  subtitle: string;
  description: string;
  curation: string;
  z: number;
  color: string;
  images: string[];
}

const image = (chapter: ChapterId, file: string) => `/images/dior/${chapter}/${file}`;

export const chapters: readonly Chapter[] = [
  {
    id: 'archive', index: '01', name: 'ARCHIVE', subtitle: '기억과 기록', description: "A passage through Dior's memory, where original sketches, iconic silhouettes, and enduring house codes return as fragments of a living visual history.", curation: 'Photographed at La Galerie Dior, Paris — archival silhouettes and exhibition details.', z: 0, color: '#282522',
    images: ['IMG_6016.webp','IMG_6019.webp','IMG_6020.webp','IMG_6021.webp','IMG_6059.webp'].map((file) => image('archive', file)),
  },
  {
    id: 'atelier', index: '02', name: 'ATELIER', subtitle: '형태가 만들어지는 공간', description: 'Inside the atelier, gesture, patience, and precision transform imagination into form. Every fold and surface preserves the quiet intelligence of the hand.', curation: 'The making of form through toile, pattern, fitting, and the intelligence of handwork.', z: -18, color: '#aaa39a',
    images: ['IMG_6047.webp','IMG_6049.webp','IMG_6023.webp','IMG_6032.webp'].map((file) => image('atelier', file)),
  },
  {
    id: 'rouge', index: '03', name: 'ROUGE', subtitle: '색과 오브제의 밀도', description: 'Rouge becomes a chamber carved from geometric crystal. Faceted crimson planes fold light toward a recessed square, where a singular handbag holds the gaze at the heart of the space.', curation: 'A singular object held inside a faceted chamber of ruby light and mirrored geometry.', z: -35, color: '#130107',
    images: ['IMG_6079.webp'].map((file) => image('rouge', file)),
  },
  {
    id: 'reverie', index: '04', name: 'REVERIE', subtitle: '꿈과 빛의 피날레', description: 'A final dream suspended between darkness and light. Golden and silver fragments gather around a singular dress, then dissolve into an endless field of memory.', curation: 'Gold and silver fragments breathe around one final silhouette, suspended between memory and dream.', z: -49, color: '#070808',
    images: ['IMG_6089.webp'].map((file) => image('reverie', file)),
  },
] as const;
