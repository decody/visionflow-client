export type ChapterId = 'archive' | 'atelier' | 'rouge' | 'reverie';

export interface Chapter {
  id: ChapterId;
  index: string;
  name: string;
  subtitle: string;
  z: number;
  color: string;
  images: string[];
}

const image = (chapter: ChapterId, file: string) => `/images/dior/${chapter}/${file}`;

export const chapters: readonly Chapter[] = [
  {
    id: 'archive', index: '01', name: 'ARCHIVE', subtitle: '기억과 기록', z: 0, color: '#282522',
    images: ['IMG_6016.jpg','IMG_6019.jpg','IMG_6020.jpg','IMG_6021.jpg','IMG_6059.jpg'].map((file) => image('archive', file)),
  },
  {
    id: 'atelier', index: '02', name: 'ATELIER', subtitle: '형태가 만들어지는 공간', z: -14, color: '#d7d0c8',
    images: ['IMG_6046.jpg','IMG_6047.jpg','IMG_6049.jpg','IMG_6023.jpg','IMG_6032.jpg'].map((file) => image('atelier', file)),
  },
  {
    id: 'rouge', index: '03', name: 'ROUGE', subtitle: '색과 오브제의 밀도', z: -28, color: '#6f0c25',
    images: ['IMG_6040.jpg','IMG_6039.jpg','IMG_6041.jpg','IMG_6073.jpg','IMG_6079.jpg'].map((file) => image('rouge', file)),
  },
  {
    id: 'reverie', index: '04', name: 'REVERIE', subtitle: '꿈과 빛의 피날레', z: -42, color: '#142130',
    images: ['IMG_6093.jpg','IMG_6090.jpg','IMG_6089.jpg','IMG_6095.jpg','IMG_6092.jpg'].map((file) => image('reverie', file)),
  },
] as const;
