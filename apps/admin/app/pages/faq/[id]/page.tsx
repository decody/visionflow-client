'use client';

import { Button, Card, Descriptions, Divider, Flex, Space, Tag, Typography } from 'antd';
import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import styles from '../page.module.css';

const { Paragraph, Text, Title } = Typography;

const sampleFaq = {
  answer:
    '프로젝트 견적은 요구사항, 제작 범위, 일정, 투입 리소스를 기준으로 산정합니다. 상담 이후 기능 목록과 산출물 범위를 정리한 뒤 상세 견적서를 전달드립니다.',
  category: '기본',
  created_at: '2026-05-01',
  is_visible: true,
  question: '프로젝트 견적은 어떻게 산정되나요?',
  updated_at: '2026-05-06',
};

export default function FaqViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

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
          <Link href={ROUTES.ADMIN.FAQ.EDIT(id)}>
            <Button type="primary">수정</Button>
          </Link>
        </Space>
      </Flex>

      <Card className={styles.panel}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="번호">{id}</Descriptions.Item>
          <Descriptions.Item label="카테고리">
            <Tag color="blue">{sampleFaq.category}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="노출 상태">
            <Tag color={sampleFaq.is_visible ? 'green' : 'default'}>
              {sampleFaq.is_visible ? '노출' : '비노출'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="등록일">{sampleFaq.created_at}</Descriptions.Item>
          <Descriptions.Item label="수정일">{sampleFaq.updated_at}</Descriptions.Item>
        </Descriptions>

        <Divider />

        <div className={styles.article}>
          <Text className={styles.label}>질문</Text>
          <Title level={4}>{sampleFaq.question}</Title>

          <Text className={styles.label}>답변</Text>
          <Paragraph className={styles.answer}>{sampleFaq.answer}</Paragraph>
        </div>
      </Card>
    </section>
  );
}
