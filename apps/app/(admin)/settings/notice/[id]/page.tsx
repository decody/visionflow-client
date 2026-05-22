'use client';

import Loading from '@/components/loading/page';
import {
  useNoticeListQuery,
  useNoticeViewQuery,
} from '@/hooks/admin/notices/useNoticeQuery';
import { useCurrentUserRole } from '@/hooks/use-current-user-role';
import { canManageContent } from '@/lib/admin-permissions';
import { getNoticeDisplayNumberMap } from '@/utils/notices';
import { ROUTES } from '@visionflow/routes';
import { sanitizeContentHtml } from '@visionflow/shared';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Space,
  Tag,
  Typography,
} from 'antd';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import styles from '../page.module.css';

const { Paragraph, Text, Title } = Typography;

const categoryLabels: Record<string, string> = {
  Guide: '공지',
  Service: '서비스',
  Update: '업데이트',
  Event: '이벤트',
  announcement: '공지',
  event: '이벤트',
  maintenance: '점검',
  update: '업데이트',
};

const getCategoryLabel = (category?: string) =>
  category ? (categoryLabels[category] ?? category) : '-';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function NoticeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const { data: notice, isError, isLoading } = useNoticeViewQuery(id);
  const { data: notices = [], isLoading: isListLoading } =
    useNoticeListQuery();
  const role = useCurrentUserRole();
  const canManageNotice = canManageContent(role);
  const noticeNumberById = useMemo(() => {
    return getNoticeDisplayNumberMap(notices);
  }, [notices]);

  if (isLoading || isListLoading) {
    return <Loading />;
  }

  if (isError || !notice) {
    return (
      <section className={styles.page}>
        <Card className={styles.panel}>
          <Empty description="공지사항을 찾을 수 없습니다.">
            <Link href={ROUTES.ADMIN.NOTICE.ROOT}>
              <Button type="primary">목록으로</Button>
            </Link>
          </Empty>
        </Card>
      </section>
    );
  }

  const sanitizedContentHtml = sanitizeContentHtml(
    notice.contentHtml ?? '',
  );
  const hasContentHtml = Boolean(sanitizedContentHtml.trim());

  return (
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            공지사항 상세
          </Title>
          <Text type="secondary">
            등록된 공지사항의 공개 정보와 본문을 확인합니다.
          </Text>
        </div>
        <Space>
          <Link href={ROUTES.ADMIN.NOTICE.ROOT}>
            <Button>목록</Button>
          </Link>
          {canManageNotice ? (
            <Link href={ROUTES.ADMIN.NOTICE.EDIT(id)}>
              <Button type="primary">수정</Button>
            </Link>
          ) : null}
        </Space>
      </Flex>

      <Card className={styles.panel}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="번호">
            {noticeNumberById.get(notice.id) ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="카테고리">
            <Tag color="blue">
              {getCategoryLabel(notice.category)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="공개 상태">
            <Tag color={notice.isPublished ? 'green' : 'default'}>
              {notice.isPublished ? '공개' : '비공개'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="중요 여부">
            <Tag color={notice.isImportant ? 'red' : 'default'}>
              {notice.isImportant ? '중요' : '일반'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="게시일">
            {notice.date || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="작성자">
            {notice.createdBy ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="등록일">
            {formatDateTime(notice.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="수정일">
            {formatDateTime(notice.updatedAt)}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <article className={styles.article}>
          <Text className={styles.label}>제목</Text>
          <Title level={4}>{notice.title}</Title>

          <Text className={styles.label}>설명</Text>
          <Paragraph className={styles.answer}>
            {notice.description ?? '-'}
          </Paragraph>

          <Text className={styles.label}>내용</Text>
          {hasContentHtml ? (
            <div
              className={styles.contentPreview}
              dangerouslySetInnerHTML={{
                __html: sanitizedContentHtml,
              }}
            />
          ) : (
            <Paragraph className={styles.answer}>
              {notice.description ?? '등록된 상세 내용이 없습니다.'}
            </Paragraph>
          )}
        </article>
      </Card>
    </section>
  );
}
