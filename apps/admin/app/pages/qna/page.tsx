import type { Metadata } from 'next';

import { QnaListPage } from '../../../src/features/qna/qna-list-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Q&A 게시판 — 사용자 문의 관리',
  title: 'Q&A 게시판 — VisionFlow Admin',
};

export default function Qna() {
  return <QnaListPage />;
}
