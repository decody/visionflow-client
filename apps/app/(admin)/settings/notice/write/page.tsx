'use client';

import { RoleGuard } from '@/components/auth/role-guard';
import { useCreateNoticeMutation } from '@/hooks/admin/notices/useCreateNoticeMutation';
import { CONTENT_MANAGER_ROLES } from '@/lib/admin-permissions';
import { ROUTES } from '@visionflow/routes';
import type { ICreateNoticeRequest } from '@visionflow/shared';
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
  message,
} from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from '../page.module.css';

const { Text, Title } = Typography;

type NoticeFormValues = Pick<
  ICreateNoticeRequest,
  | 'category'
  | 'contentHtml'
  | 'description'
  | 'isImportant'
  | 'isPublished'
  | 'title'
>;

export default function NoticeWritePage() {
  const router = useRouter();
  const createNoticeMutation = useCreateNoticeMutation();

  const handleFinish = async (values: NoticeFormValues) => {
    try {
      const payload: ICreateNoticeRequest = {
        category: values.category,
        contentHtml: values.contentHtml ?? null,
        description: values.description,
        isImportant: values.isImportant ?? false,
        isPublished: values.isPublished ?? true,
        title: values.title,
      };

      const result = await createNoticeMutation.mutateAsync(payload);

      message.success('공지사항이 등록되었습니다.');

      if (result?.id) {
        router.push(ROUTES.ADMIN.NOTICE.DETAIL(result.id));
      } else {
        router.push(ROUTES.ADMIN.NOTICE.ROOT);
      }
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : '공지사항 등록 중 오류가 발생했습니다.',
      );
    }
  };

  const handleFinishFailed = () => {
    message.error('입력값을 확인해주세요.');
  };

  return (
    <RoleGuard
      allowedRoles={CONTENT_MANAGER_ROLES}
      fallbackPath={ROUTES.ADMIN.NOTICE.ROOT}
    >
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            공지사항 등록
          </Title>
          <Text type="secondary">
            사용자에게 노출할 공지사항 내용을 작성합니다.
          </Text>
        </div>
        <Link href={ROUTES.ADMIN.NOTICE.ROOT}>
          <Button>목록</Button>
        </Link>
      </Flex>

      <Card className={styles.panel}>
        <Form
          initialValues={{
            category: 'Guide', // 카테고리 기본값을 'Guide'로 설정
            isImportant: false, // 중요 여부 기본값을 false(중요하지 않음)로 설정
            isPublished: true, // 공개 여부 기본값을 true(공개)로 설정
          }}
          layout="vertical"
          requiredMark={false}
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
        >
          <Form.Item
            label="카테고리"
            name="category"
            rules={[
              { required: true, message: '카테고리를 선택해주세요.' },
            ]}
          >
            <Select
              options={[
                { label: '공지', value: 'Guide' },
                { label: '서비스', value: 'Service' },
                { label: '업데이트', value: 'Update' },
                { label: '이벤트', value: 'Event' },
              ]}
              placeholder="카테고리를 선택해주세요."
            />
          </Form.Item>

          <Form.Item
            label="제목"
            name="title"
            rules={[
              { required: true, message: '제목을 입력해주세요.' },
            ]}
          >
            <Input
              placeholder="공지사항 제목을 입력해주세요."
              showCount
              maxLength={120}
            />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
            rules={[
              { required: true, message: '설명을 입력해주세요.' },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="목록과 상세 상단에 노출할 설명을 입력해주세요."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="내용"
            name="contentHtml"
            rules={[
              { required: true, message: '내용을 입력해주세요.' },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 10, maxRows: 18 }}
              placeholder="공지사항 내용을 입력해주세요."
            />
          </Form.Item>

          <Flex gap={24} wrap>
            <Form.Item
              label="공개 여부"
              name="isPublished"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="공개"
                unCheckedChildren="비공개"
              />
            </Form.Item>
            <Form.Item
              label="중요 공지"
              name="isImportant"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="중요"
                unCheckedChildren="일반"
              />
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
              <Button
                loading={createNoticeMutation.isPending}
                type="primary"
                htmlType="submit"
              >
                저장
              </Button>
            </Space>
          </Flex>
        </Form>
      </Card>
    </section>
    </RoleGuard>
  );
}
