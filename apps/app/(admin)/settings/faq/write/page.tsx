'use client';

import { ROUTES } from '@visionflow/routes';
import type { ICreateFaqRequest } from '@visionflow/shared';
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

import { RoleGuard } from '@/components/auth/role-guard';
import { useCreateFaqMutation } from '@/hooks/admin/faq/useCreateFaqMutation';
import { CONTENT_MANAGER_ROLES } from '@/lib/admin-permissions';
import styles from '../page.module.css';

const { Text, Title } = Typography;

type FaqFormValues = Pick<
  ICreateFaqRequest,
  'answer' | 'category' | 'is_visible' | 'question'
>;

export default function FaqWritePage() {
  const router = useRouter();
  const createFaqMutation = useCreateFaqMutation();

  const handleFinish = async (values: FaqFormValues) => {
    try {
      const result = await createFaqMutation.mutateAsync(values);

      message.success('폼이 전송되었습니다');

      if (result?.id) {
        router.push(ROUTES.ADMIN.FAQ.DETAIL(result.id));
      } else {
        router.push(ROUTES.ADMIN.FAQ.ROOT);
      }
    } catch {
      message.error(`FAQ 등록 중 오류가 발생했습니다.`);
    }
  };

  const handleFinishFailed = () => {
    message.error('폼 입력값을 확인하세요');
  };

  if (createFaqMutation.isPending) {
    return <div>Loading...</div>;
  }

  return (
    <RoleGuard
      allowedRoles={CONTENT_MANAGER_ROLES}
      fallbackPath={ROUTES.ADMIN.FAQ.ROOT}
    >
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            FAQ 등록
          </Title>
          <Text type="secondary">
            자주 묻는 질문과 답변을 작성합니다.
          </Text>
        </div>
        <Link href={ROUTES.ADMIN.FAQ.ROOT}>
          <Button>목록</Button>
        </Link>
      </Flex>

      <Card className={styles.panel}>
        <Form
          initialValues={{
            category: 'default',
            is_visible: true,
          }}
          layout="vertical"
          requiredMark={false}
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
        >
          <Form.Item
            label="카테고리"
            name="category"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: '기본', value: 'default' },
                { label: '문의', value: 'contact' },
              ]}
              placeholder="카테고리를 선택하세요"
            />
          </Form.Item>

          <Form.Item
            label="질문"
            name="question"
            rules={[
              { required: true, message: '질문을 입력해주세요' },
            ]}
          >
            <Input
              placeholder="질문을 입력하세요"
              showCount
              maxLength={120}
            />
          </Form.Item>

          <Form.Item
            label="답변"
            name="answer"
            rules={[
              { required: true, message: '답변을 입력해주세요' },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 8, maxRows: 14 }}
              placeholder="답변을 입력하세요"
              showCount
              maxLength={2000}
            />
          </Form.Item>

          <Form.Item
            label="노출 여부"
            name="is_visible"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="노출"
              unCheckedChildren="비노출"
            />
          </Form.Item>

          <Flex
            className={styles.formActions}
            justify="flex-end"
            gap={8}
          >
            <Link href={ROUTES.ADMIN.FAQ.ROOT}>
              <Button>취소</Button>
            </Link>
            <Space>
              <Button
                loading={createFaqMutation.isPending}
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
