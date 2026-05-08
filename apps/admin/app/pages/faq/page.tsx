'use client';

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Card, Flex, Input, Select, Space, Tag, Typography } from 'antd';
import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import { useMemo } from 'react';

import type { IFaq } from '@/types/faq';

import styles from './page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const { Text, Title } = Typography;

const sampleFaqs: IFaq[] = [
  {
    id: 1,
    category: '기본',
    question: '프로젝트 견적은 어떻게 산정하나요?',
    answer: '요구사항, 작업 범위, 일정, 투입 리소스를 기준으로 산정합니다.',
    is_visible: true,
    created_at: '2026-05-01',
  },
  {
    id: 2,
    category: '문의',
    question: '계약금과 잔금은 어떻게 결제하나요?',
    answer: '계약 시 50%, 최종 산출물 전달 시 50% 결제를 기본으로 안내합니다.',
    is_visible: true,
    created_at: '2026-05-03',
  },
  {
    id: 3,
    category: '기본',
    question: '작업 후 유지보수도 가능한가요?',
    answer: '월 단위 유지보수 플랜 또는 건별 요청 방식으로 지원합니다.',
    is_visible: false,
    created_at: '2026-05-06',
  },
];

export default function FaqPage() {
  const columnDefs = useMemo<ColDef<IFaq>[]>(
    () => [
      {
        field: 'id',
        headerName: '번호',
        maxWidth: 90,
        minWidth: 80,
      },
      {
        field: 'category',
        headerName: '카테고리',
        maxWidth: 150,
        minWidth: 130,
        cellRenderer: ({ value }: ICellRendererParams<IFaq, string>) => (
          <Tag color="blue">{value ?? '-'}</Tag>
        ),
      },
      {
        field: 'question',
        headerName: '질문',
        flex: 1,
        minWidth: 260,
        cellRenderer: ({ value }: ICellRendererParams<IFaq, string>) => (
          <Text strong>{value}</Text>
        ),
      },
      {
        field: 'is_visible',
        headerName: '노출',
        maxWidth: 120,
        minWidth: 110,
        cellRenderer: ({ value }: ICellRendererParams<IFaq, boolean>) =>
          value ? <Tag color="green">노출</Tag> : <Tag>비노출</Tag>,
      },
      {
        field: 'created_at',
        headerName: '등록일',
        maxWidth: 150,
        minWidth: 130,
      },
      {
        colId: 'action',
        headerName: '관리',
        maxWidth: 150,
        minWidth: 140,
        sortable: false,
        filter: false,
        cellRenderer: ({ data }: ICellRendererParams<IFaq>) => {
          if (!data) {
            return null;
          }

          return (
            <Space size="small">
              <Link href={ROUTES.ADMIN.FAQ.DETAIL(data.id)}>상세</Link>
              <Link href={ROUTES.ADMIN.FAQ.EDIT(data.id)}>수정</Link>
            </Space>
          );
        },
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<IFaq>>(
    () => ({
      filter: true,
      resizable: true,
      sortable: true,
    }),
    [],
  );

  return (
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            FAQ 관리
          </Title>
          <Text type="secondary">자주 묻는 질문을 등록하고 노출 상태를 관리합니다.</Text>
        </div>
        <Link href={ROUTES.ADMIN.FAQ.WRITE()}>
          <Button type="primary">FAQ 등록</Button>
        </Link>
      </Flex>

      <Card className={styles.panel}>
        <Flex gap={12} wrap>
          <Input.Search className={styles.search} placeholder="질문 또는 답변 검색" allowClear />
          <Select
            className={styles.select}
            defaultValue="all"
            options={[
              { label: '전체 카테고리', value: 'all' },
              { label: '기본', value: 'default' },
              { label: '문의', value: 'contact' },
            ]}
          />
          <Select
            className={styles.select}
            defaultValue="all"
            options={[
              { label: '전체 노출상태', value: 'all' },
              { label: '노출', value: 'visible' },
              { label: '비노출', value: 'hidden' },
            ]}
          />
        </Flex>
      </Card>

      <Card className={styles.panel} styles={{ body: { padding: 0 } }}>
        <div className={`ag-theme-quartz ${styles.grid}`}>
          <AgGridReact<IFaq>
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination
            paginationPageSize={10}
            rowData={sampleFaqs}
            rowHeight={48}
            theme="legacy"
          />
        </div>
      </Card>
    </section>
  );
}
