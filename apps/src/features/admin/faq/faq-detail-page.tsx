'use client';

import { ROUTES } from '@visionflow/routes';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Flex,
  Space,
  Tag,
  Typography,
} from 'antd';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import Loading from '@/components/loading/page';
import { useFaqListQuery } from '@/hooks/admin/faq/useFaqQuery';
import { useCurrentUserRole } from '@/hooks/use-current-user-role';
import { canManageContent } from '@/lib/admin-permissions';
import styles from './faq-admin.module.css';

const { Paragraph, Text, Title } = Typography;

export function FaqDetailPage() {
  const { data: faqs = [], isLoading } = useFaqListQuery();
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const faq = faqs.find((faq) => String(faq.id) === id);
  const role = useCurrentUserRole();
  const canManageFaq = canManageContent(role);

  if (isLoading) {
    return <Loading />;
  }

  if (!faq) {
    return <div>FAQ를 찾을 수 없습니다.</div>;
  }

  return (
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            FAQ 상세
          </Title>
          <Text type="secondary">등록된 FAQ 내용을 확인합니다.</Text>
        </div>
        <Space>
          <Link href={ROUTES.ADMIN.FAQ.ROOT}>
            <Button>목록</Button>
          </Link>
          {canManageFaq ? (
            <Link href={ROUTES.ADMIN.FAQ.EDIT(id)}>
              <Button type="primary">수정</Button>
            </Link>
          ) : null}
        </Space>
      </Flex>

      <Card className={styles.panel}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="번호">{id}</Descriptions.Item>
          <Descriptions.Item label="카테고리">
            <Tag color="blue">
              {faq.category === 'contact' ? '문의' : '기본'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="노출 상태">
            <Tag color={faq.is_visible ? 'green' : 'default'}>
              {faq.is_visible ? '노출' : '비노출'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="등록일">
            {faq.created_at
              ? new Date(faq.created_at).toLocaleString()
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="수정일">
            {faq.updated_at
              ? new Date(faq.updated_at).toLocaleString()
              : '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <div className={styles.article}>
          <Text className={styles.label}>질문</Text>
          <Title level={4}>{faq.question}</Title>

          <Text className={styles.label}>답변</Text>
          <Paragraph className={styles.answer}>{faq.answer}</Paragraph>
        </div>
      </Card>
    </section>
  );
}
