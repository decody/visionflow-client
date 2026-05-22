'use client';

import { ROUTES } from '@visionflow/routes';
import type { WorkRow } from '@visionflow/shared';
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { RoleGuard } from '@/components/auth/role-guard';
import {
  useCreateWorkMutation,
  type WorkMutationValues,
} from '@/hooks/works/useWorkMutation';
import styles from './work-portfolio-create-page.module.css';

const { Text, Title } = Typography;

type WorkFormValues = Omit<WorkMutationValues, 'roles'> & {
  rolesText: string;
};

const INITIAL_VALUES: WorkFormValues = {
  category: '',
  image: '',
  industry: '',
  linkLabel: '',
  linkUrl: '',
  rolesText: '',
  size: 'short',
  title: '',
};

export function WorkPortfolioCreatePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const createWorkMutation = useCreateWorkMutation();

  const handleFinish = async (values: WorkFormValues) => {
    try {
      const createdWork = await createWorkMutation.mutateAsync(
        toMutationValues(values),
      );

      messageApi.success('Work 포트폴리오를 등록했습니다.');
      router.push(
        createdWork?.id
          ? ROUTES.ADMIN.WORK_PORTFOLIO.DETAIL(createdWork.id)
          : ROUTES.ADMIN.WORK_PORTFOLIO.ROOT,
      );
    } catch (error) {
      messageApi.error(getErrorMessage(error, 'Work 등록 중 오류가 발생했습니다.'));
    }
  };

  return (
    <RoleGuard
      allowedRoles={['SuperAdmin', 'admin']}
      fallbackPath={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}
    >
    <section className={styles.page}>
      {contextHolder}
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Link className={styles.backLink} href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
            <ArrowLeft size={14} />
            목록으로
          </Link>
          <Title className={styles.title} level={2}>
            Work 작성
          </Title>
          <Text type="secondary">
            웹사이트 Work 섹션에 노출할 프로젝트 정보를 입력합니다.
          </Text>
        </div>
      </Flex>

      <Card className={styles.panel}>
        <Form
          initialValues={INITIAL_VALUES}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
        >
          <div className={styles.formGrid}>
            <Form.Item
              label="프로젝트 제목"
              name="title"
              rules={[{ message: '제목을 입력해주세요.', required: true }]}
            >
              <Input maxLength={120} placeholder="예: Brand Campaign Renewal" showCount />
            </Form.Item>

            <Form.Item
              label="카테고리"
              name="category"
              rules={[{ message: '카테고리를 입력해주세요.', required: true }]}
            >
              <Input placeholder="예: Web App, 3D, Dashboard" />
            </Form.Item>

            <Form.Item
              label="산업"
              name="industry"
              rules={[{ message: '산업을 입력해주세요.', required: true }]}
            >
              <Input placeholder="예: 커머스, 금융, 공공" />
            </Form.Item>

            <Form.Item label="노출 타입" name="size" rules={[{ required: true }]}>
              <Select<WorkRow['size']>
                options={[
                  { label: '일반 카드', value: 'short' },
                  { label: '강조 카드', value: 'tall' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            extra="쉼표로 구분해서 입력하세요. 예: Frontend, UI/UX, Publishing"
            label="역할"
            name="rolesText"
            rules={[{ message: '역할을 하나 이상 입력해주세요.', required: true }]}
          >
            <Input placeholder="Frontend, UI/UX" />
          </Form.Item>

          <Form.Item label="대표 이미지 URL" name="image">
            <Input placeholder="https://..." />
          </Form.Item>

          <div className={styles.formGrid}>
            <Form.Item label="외부 링크 URL" name="linkUrl">
              <Input placeholder="https://..." />
            </Form.Item>

            <Form.Item label="외부 링크 라벨" name="linkLabel">
              <Input placeholder="사이트 보기" />
            </Form.Item>
          </div>

          <Flex className={styles.actions} justify="flex-end" gap={8}>
            <Link href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
              <Button>취소</Button>
            </Link>
            <Space>
              <Button
                htmlType="submit"
                icon={<Save size={14} />}
                loading={createWorkMutation.isPending}
                type="primary"
              >
                등록
              </Button>
            </Space>
          </Flex>
        </Form>
      </Card>
    </section>
    </RoleGuard>
  );
}

function toMutationValues(values: WorkFormValues): WorkMutationValues {
  return {
    category: values.category.trim(),
    image: values.image?.trim() || null,
    industry: values.industry.trim(),
    linkLabel: values.linkLabel?.trim() || null,
    linkUrl: values.linkUrl?.trim() || null,
    roles: values.rolesText
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean),
    size: values.size,
    title: values.title.trim(),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
