'use client';

import { ROUTES } from '@visionflow/routes';
import type { WorkRow } from '@visionflow/shared';
import {
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  Image,
  Input,
  Result,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import Link from 'next/link';

import Loading from '@/components/loading/page';
import { useUpdateWorkMutation } from '@/hooks/works/useWorkMutation';
import { useWorkViewQuery } from '@/hooks/works/useWorkQuery';
import { useUserRoleStore } from '@/stores/user-role-store';
import styles from './work-portfolio-detail-page.module.css';

const { Text, Title } = Typography;

type WorkAdminRow = WorkRow & {
  createdAt?: string;
  linkLabel?: string | null;
  linkUrl?: string | null;
};

type WorkFormValues = {
  category: string;
  image?: string | null;
  industry: string;
  linkLabel?: string | null;
  linkUrl?: string | null;
  rolesText: string;
  size: WorkRow['size'];
  title: string;
};

export function WorkPortfolioDetailPage({ id }: { id: string }) {
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading } = useWorkViewQuery(id);
  const updateWorkMutation = useUpdateWorkMutation();
  const role = useUserRoleStore((state) => state.role);
  const canManageWork = role === 'SuperAdmin' || role === 'Operator';
  const work = data as WorkAdminRow | null | undefined;

  const handleFinish = async (values: WorkFormValues) => {
    if (!canManageWork) {
      messageApi.error('접근 권한이 없습니다.');
      return;
    }

    try {
      await updateWorkMutation.mutateAsync({
        values: {
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
        },
        workId: id,
      });

      messageApi.success('Work 정보를 저장했습니다.');
    } catch (error) {
      messageApi.error(
        error instanceof Error
          ? error.message
          : 'Work 저장 중 오류가 발생했습니다.',
      );
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!work) {
    return (
      <Result
        status="404"
        title="Work를 찾을 수 없습니다"
        extra={
          <Link href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
            <Button type="primary">목록으로</Button>
          </Link>
        }
      />
    );
  }

  const linkUrl = work.linkUrl ?? work.link_url;
  const createdAt = work.createdAt ?? work.created_at;
  const initialValues: WorkFormValues = {
    category: work.category,
    image: work.image ?? '',
    industry: work.industry,
    linkLabel: work.linkLabel ?? work.link_label ?? '',
    linkUrl: work.linkUrl ?? work.link_url ?? '',
    rolesText: work.roles.join(', '),
    size: work.size,
    title: work.title,
  };

  return (
    <section className={styles.page}>
      {contextHolder}
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Link className={styles.backLink} href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
            <ArrowLeft size={14} />
            목록으로
          </Link>
          <Title className={styles.title} level={2}>
            {work.title}
          </Title>
          <Text type="secondary">Work 상세 정보를 확인합니다.</Text>
        </div>
        {linkUrl ? (
          <a href={linkUrl} rel="noreferrer" target="_blank">
            <Button icon={<ExternalLink size={14} />}>외부 링크</Button>
          </a>
        ) : null}
      </Flex>

      <div className={styles.layout}>
        <Card className={styles.panel} title="상세 정보">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="ID">{work.id}</Descriptions.Item>
            <Descriptions.Item label="카테고리">
              <Tag color="blue">{work.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="산업">{work.industry}</Descriptions.Item>
            <Descriptions.Item label="노출 타입">
              <Tag color={work.size === 'tall' ? 'gold' : 'default'}>
                {work.size === 'tall' ? '강조 카드' : '일반 카드'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="등록일">{formatDate(createdAt)}</Descriptions.Item>
          </Descriptions>

          <div className={styles.roleList}>
            {work.roles.map((role) => (
              <Tag key={role}>{role}</Tag>
            ))}
          </div>

          {work.image ? (
            <Image
              alt={work.title}
              className={styles.previewImage}
              fallback=""
              src={work.image}
            />
          ) : (
            <div className={styles.imageEmpty}>대표 이미지 없음</div>
          )}
        </Card>

        {canManageWork ? (
          <Card className={styles.panel} title="정보 수정">
            <Form
              initialValues={initialValues}
              layout="vertical"
              onFinish={handleFinish}
              requiredMark={false}
            >
              <Form.Item
                label="프로젝트 제목"
                name="title"
                rules={[{ message: '제목을 입력해주세요.', required: true }]}
              >
                <Input maxLength={120} showCount />
              </Form.Item>

              <div className={styles.formGrid}>
                <Form.Item
                  label="카테고리"
                  name="category"
                  rules={[{ message: '카테고리를 입력해주세요.', required: true }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="산업"
                  name="industry"
                  rules={[{ message: '산업을 입력해주세요.', required: true }]}
                >
                  <Input />
                </Form.Item>
              </div>

              <div className={styles.formGrid}>
                <Form.Item label="노출 타입" name="size" rules={[{ required: true }]}>
                  <Select<WorkRow['size']>
                    options={[
                      { label: '일반 카드', value: 'short' },
                      { label: '강조 카드', value: 'tall' },
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  extra="쉼표로 구분해서 입력하세요."
                  label="역할"
                  name="rolesText"
                  rules={[{ message: '역할을 하나 이상 입력해주세요.', required: true }]}
                >
                  <Input />
                </Form.Item>
              </div>

              <Form.Item label="대표 이미지 URL" name="image">
                <Input />
              </Form.Item>

              <div className={styles.formGrid}>
                <Form.Item label="외부 링크 URL" name="linkUrl">
                  <Input />
                </Form.Item>

                <Form.Item label="외부 링크 라벨" name="linkLabel">
                  <Input />
                </Form.Item>
              </div>

              <Flex className={styles.actions} justify="flex-end" gap={8}>
                <Space>
                  <Button
                    htmlType="submit"
                    icon={<Save size={14} />}
                    loading={updateWorkMutation.isPending}
                    type="primary"
                  >
                    저장
                  </Button>
                </Space>
              </Flex>
            </Form>
          </Card>
        ) : null}
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
