'use client';

import { ROUTES } from '@visionflow/routes';
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import Link from 'next/link';

import styles from '../page.module.css';

const { Text, Title } = Typography;

export default function NoticeWritePage() {
  return (
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            공지사항 등록
          </Title>
          <Text type="secondary">
            공지사항 등록 화면 UI입니다. 저장 기능은 아직 연결하지 않습니다.
          </Text>
        </div>
        <Link href={ROUTES.ADMIN.NOTICE.ROOT}>
          <Button>목록</Button>
        </Link>
      </Flex>

      <Card className={styles.panel}>
        <Form
          initialValues={{
            category: 'Guide',
            isImportant: false,
            isPublished: true,
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
              ]}
            />
          </Form.Item>

          <Form.Item label="제목" name="title">
            <Input placeholder="공지 제목을 입력하세요" showCount maxLength={120} />
          </Form.Item>

          <Form.Item label="설명" name="description">
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="목록과 상세 상단에 노출할 설명을 입력하세요"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item label="내용" name="contentHtml">
            <Input.TextArea
              autoSize={{ minRows: 10, maxRows: 18 }}
              placeholder="공지 내용을 입력하세요"
            />
          </Form.Item>

          <Flex gap={24} wrap>
            <Form.Item label="게시일" name="date">
              <DatePicker />
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
            <Link href={ROUTES.ADMIN.NOTICE.ROOT}>
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
