export type ChapterId = 'archive' | 'atelier' | 'rouge' | 'reverie';

export interface Chapter {
  id: ChapterId;
  index: string;
  name: string;
  subtitle: string;
  description: string;
  z: number;
  color: string;
  images: string[];
}

const image = (chapter: ChapterId, file: string) => `/images/dior/${chapter}/${file}`;

export const chapters: readonly Chapter[] = [
  {
    id: 'archive', index: '01', name: 'ARCHIVE', subtitle: '기억과 기록', description: "A passage through Dior's memory, where original sketches, iconic silhouettes, and enduring house codes return as fragments of a living visual history.", z: 0, color: '#282522',
    images: ['IMG_6016.jpg','IMG_6019.jpg','IMG_6020.jpg','IMG_6021.jpg','IMG_6059.jpg'].map((file) => image('archive', file)),
  },
  {
    id: 'atelier', index: '02', name: 'ATELIER', subtitle: '형태가 만들어지는 공간', description: 'Inside the atelier, gesture, patience, and precision transform imagination into form. Every fold and surface preserves the quiet intelligence of the hand.', z: -18, color: '#aaa39a',
    images: ['IMG_6047.jpg','IMG_6049.jpg','IMG_6023.jpg','IMG_6032.jpg'].map((file) => image('atelier', file)),
  },
  {
    id: 'rouge', index: '03', name: 'ROUGE', subtitle: '색과 오브제의 밀도', description: 'Rouge becomes a chamber carved from geometric crystal. Faceted crimson planes fold light toward a recessed square, where a singular handbag holds the gaze at the heart of the space.', z: -35, color: '#130107',
    images: ['IMG_6079.jpg'].map((file) => image('rouge', file)),
  },
  {
    id: 'reverie', index: '04', name: 'REVERIE', subtitle: '꿈과 빛의 피날레', description: 'A final dream suspended between darkness and light. Golden and silver fragments gather around a singular dress, then dissolve into an endless field of memory.', z: -49, color: '#070808',
    images: ['IMG_6089.jpg'].map((file) => image('reverie', file)),
  },
] as const;
