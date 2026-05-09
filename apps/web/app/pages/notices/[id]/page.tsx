import { NoticeDetailPage } from '@/features/notices/notice-detail-page';

interface NoticeViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function NoticeViewPage({ params }: NoticeViewPageProps) {
  const { id } = await params;

  return <NoticeDetailPage noticeId={id} />;
}

export default NoticeViewPage;
