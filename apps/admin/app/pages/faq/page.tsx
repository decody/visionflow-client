'use client';

import { ROUTES } from '@visionflow/routes';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Card, Flex, Input, Select, Space, Tag, Typography } from 'antd';
import Link from 'next/link';
import { useMemo } from 'react';

import type { IFaq } from '@visionflow/shared';

import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';
import styles from './page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const { Text, Title } = Typography;

export default function FaqPage() {
  const { data: faqs = []} = useFaqListQuery();

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
        cellRenderer: ({ value }: ICellRendererParams<IFaq, string>) => {
          return <Tag color={value === 'contact' ? 'green' : 'blue'}>{value ?? '-'}</Tag>;
        },
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
        cellRenderer: (params: ICellRendererParams<IFaq, boolean>) => {
          const { value, colDef, column, data } = params;
          // colDef: 이 컬럼의 정의 객체
          // column: 이 셀에 대한 컬럼 객체 (ag-grid column API)
          // data: 이 셀이 속한 행 데이터(rowData)
          // value: 해당 행의 is_visible 값
          // 필요하다면 컬럼별 로직에 colDef나 column 사용 가능
          console.log(data)
          
          return value ? <Tag color="green">노출</Tag> : <Tag>비노출</Tag>;
        },
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
            rowData={faqs}
            rowHeight={48}
            theme="legacy"
          />
        </div>
      </Card>
    </section>
  );
}
