'use client';

import { ROUTES } from '@visionflow/routes';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  Button,
  Card,
  Flex,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { IFaq } from '@visionflow/shared';

import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';
import styles from './page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const { Text, Title } = Typography;

type CategoryFilter = 'all' | 'contact' | 'default';
type VisibilityFilter = 'all' | 'hidden' | 'visible';

export default function FaqPage() {
  const { data: faqs = [] } = useFaqListQuery();
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>('all');
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('all');

  // 필터링 조건을 보기 쉽게 분리해서 작성했습니다.
  const filteredFaqs = useMemo(() => {
    // 입력된 키워드를 소문자로 변환하여 앞뒤 공백 제거
    const normalizedKeyword = keyword.trim().toLowerCase();

    return faqs.filter((faq) => {
      // 키워드 관련 필터: 키워드가 없거나, 질문/답변에 포함되어 있으면 통과
      const isKeywordMatched =
        !normalizedKeyword ||
        faq.question.toLowerCase().includes(normalizedKeyword) ||
        faq.answer.toLowerCase().includes(normalizedKeyword);

      // 카테고리 관련 필터: "all" 이거나 카테고리가 해당 값과 일치하면 통과
      const isCategoryMatched =
        categoryFilter === 'all' || faq.category === categoryFilter;

      // 노출 여부 관련 필터: "all" 이거나, "visible"은 true, "hidden"은 false/undefined 체크
      let isVisibilityMatched = true;
      if (visibilityFilter === 'visible') {
        isVisibilityMatched = faq.is_visible === true;
      } else if (visibilityFilter === 'hidden') {
        isVisibilityMatched = faq.is_visible !== true;
      }

      // 모든 조건을 만족해야 해당 faq가 필터 통과
      return (
        isKeywordMatched && isCategoryMatched && isVisibilityMatched
      );
    });
  }, [faqs, keyword, categoryFilter, visibilityFilter]);

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
        cellRenderer: ({
          value,
        }: ICellRendererParams<IFaq, string>) => {
          return (
            <Tag color={value === 'contact' ? 'green' : 'blue'}>
              {value ?? '-'}
            </Tag>
          );
        },
      },
      {
        field: 'question',
        headerName: '질문',
        flex: 1,
        minWidth: 260,
        cellRenderer: ({
          value,
        }: ICellRendererParams<IFaq, string>) => (
          <Text strong>{value}</Text>
        ),
      },
      {
        field: 'is_visible',
        headerName: '노출',
        maxWidth: 120,
        minWidth: 110,
        cellRenderer: ({
          value,
        }: ICellRendererParams<IFaq, boolean>) => {
          return value ? (
            <Tag color="green">노출</Tag>
          ) : (
            <Tag>비노출</Tag>
          );
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
              <Link href={ROUTES.ADMIN.FAQ.DETAIL(data.id)}>
                상세
              </Link>
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
          <Text type="secondary">
            자주 묻는 질문을 등록하고 노출 상태를 관리합니다.
          </Text>
        </div>
        <Link href={ROUTES.ADMIN.FAQ.WRITE()}>
          <Button type="primary">FAQ 등록</Button>
        </Link>
      </Flex>

      <Card className={styles.panel}>
        <Flex gap={12} wrap>
          <Input.Search
            allowClear
            className={styles.search}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="질문 또는 답변 검색"
            value={keyword}
          />
          <Select<CategoryFilter>
            className={styles.select}
            onChange={setCategoryFilter}
            options={[
              { label: '전체 카테고리', value: 'all' },
              { label: '기본', value: 'default' },
              { label: '문의', value: 'contact' },
            ]}
            value={categoryFilter}
          />
          <Select<VisibilityFilter>
            className={styles.select}
            onChange={setVisibilityFilter}
            options={[
              { label: '전체 노출상태', value: 'all' },
              { label: '노출', value: 'visible' },
              { label: '비노출', value: 'hidden' },
            ]}
            value={visibilityFilter}
          />
        </Flex>
      </Card>

      <Card
        className={styles.panel}
        styles={{ body: { padding: 0 } }}
      >
        <div className={`ag-theme-quartz ${styles.grid}`}>
          <AgGridReact<IFaq>
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination
            paginationPageSize={10}
            rowData={filteredFaqs}
            rowHeight={48}
            theme="legacy"
          />
        </div>
      </Card>
    </section>
  );
}
