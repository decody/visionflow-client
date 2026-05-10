'use client';

import Loading from '@/components/loading/page';
import { useNoticeViewQuery } from '@/hooks/notices/useNoticeQuery';
import { ROUTES } from '@visionflow/routes';
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import styles from '../../page.module.css';

const { Text, Title } = Typography;

export default function NoticeEditPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const { data: notice, isLoading } = useNoticeViewQuery(id);

  if (isLoading) {
    return <Loading />;
  }

  if (!notice) {
    return (
      <section className={styles.page}>
        <Title level={3}>공지사항을 찾을 수 없습니다.</Title>
        <Link href={ROUTES.ADMIN.NOTICE.ROOT}>
          <Button>목록으로</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            공지사항 수정
          </Title>
          <Text type="secondary">
            공지사항 수정 화면 UI입니다. 저장 기능은 아직 연결하지 않습니다.
          </Text>
        </div>
        <Space>
          <Link href={ROUTES.ADMIN.NOTICE.DETAIL(id)}>
            <Button>상세</Button>
          </Link>
          <Link href={ROUTES.ADMIN.NOTICE.ROOT}>
            <Button>목록</Button>
          </Link>
        </Space>
      </Flex>

      <Card className={styles.panel}>
        <Form
          initialValues={{
            category: notice.category,
            contentHtml: notice.contentHtml,
            date: notice.date,
            description: notice.description,
            isImportant: notice.isImportant,
            isPublished: notice.isPublished,
            title: notice.title,
          }}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item label="카테고리" name="category">
            <Select
              options={[
                { label: '공지', value: 'Guide' },
                { label: '서비스', value: 'Service' },
                { label: '업데이트', value: 'Update' },
                { label: '이벤트', value: 'Event' },
                { label: '점검', value: 'maintenance' },
              ]}
            />
          </Form.Item>

          <Form.Item label="제목" name="title">
            <Input showCount maxLength={120} />
          </Form.Item>

          <Form.Item label="설명" name="description">
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item label="내용" name="contentHtml">
            <Input.TextArea autoSize={{ minRows: 10, maxRows: 18 }} />
          </Form.Item>

          <Flex gap={24} wrap>
            <Form.Item label="게시일" name="date">
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              label="공개 여부"
              name="isPublished"
              valuePropName="checked"
            >
              <Switch checkedChildren="공개" unCheckedChildren="비공개" />
            </Form.Item>
            <Form.Item
              label="중요 공지"
              name="isImportant"
              valuePropName="checked"
            >
              <Switch checkedChildren="중요" unCheckedChildren="일반" />
            </Form.Item>
          </Flex>

          <Flex
            className={styles.formActions}
            justify="flex-end"
            gap={8}
          >
            <Link href={ROUTES.ADMIN.NOTICE.DETAIL(id)}>
              <Button>취소</Button>
            </Link>
            <Space>
              <Button type="primary" disabled>
                저장
              </Button>
            </Space>
          </Flex>
        </Form>
      </Card>
    </section>
  );
}
