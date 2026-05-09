'use client';

import { ROUTES } from '@visionflow/routes';
import type { ICreateFaqRequest, IFaq } from '@visionflow/shared';
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  message,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';

import Loading from '@/components/common/loading/page';
import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';
import { useUpdateFaqMutation } from '@/hooks/faq/useUpdateFaqMutation';
import styles from '../../page.module.css';

const { Text, Title } = Typography;

type FaqFormValues = Pick<
  ICreateFaqRequest,
  'answer' | 'category' | 'is_visible' | 'question'
>;

const getFaqInitialValues = (faq?: IFaq): FaqFormValues => ({
  category: faq?.category ?? 'default',
  question: faq?.question ?? '',
  answer: faq?.answer ?? '',
  is_visible:
    typeof faq?.is_visible === 'boolean'
      ? faq.is_visible
      : (faq?.isVisible ?? true),
});

export default function FaqEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [form] = Form.useForm();
  const { data: faqData = [], isLoading } = useFaqListQuery();
  const updateFaqMutation = useUpdateFaqMutation();

  const faq = faqData.find((item) => String(item.id) === String(id));
  const initialValues = useMemo(
    () => getFaqInitialValues(faq),
    [faq],
  );

  if (!isLoading && !faq) {
    return (
      <section className={styles.page}>
        <Title level={3}>FAQ를 찾을 수 없습니다.</Title>
        <Link href={ROUTES.ADMIN.FAQ.ROOT}>
          <Button>목록으로</Button>
        </Link>
      </section>
    );
  }

  const handleFinish = async (values: FaqFormValues) => {
    try {
      await updateFaqMutation.mutateAsync({
        values,
        faqId: id,
      });
      message.success('FAQ가 성공적으로 수정되었습니다.');
      router.push(ROUTES.ADMIN.FAQ.DETAIL(id));
    } catch {
      message.error(`FAQ 수정 중 오류가 발생했습니다.`);
    }
  };

  const handleFinishFailed = () => {
    message.error('폼 입력값을 확인하세요');
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            FAQ 수정
          </Title>
          <Text type="secondary">
            등록된 FAQ 질문과 답변을 수정합니다.
          </Text>
        </div>
        <Space>
          <Link href={ROUTES.ADMIN.FAQ.DETAIL(id)}>
            <Button>상세</Button>
          </Link>
          <Link href={ROUTES.ADMIN.FAQ.ROOT}>
            <Button>목록</Button>
          </Link>
        </Space>
      </Flex>

      <Card className={styles.panel}>
        <Form
          form={form}
          initialValues={initialValues}
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
            <Link href={ROUTES.ADMIN.FAQ.DETAIL(id)}>
              <Button>취소</Button>
            </Link>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateFaqMutation.isPending}
              >
                저장
              </Button>
            </Space>
          </Flex>
        </Form>
      </Card>
    </section>
  );
}
