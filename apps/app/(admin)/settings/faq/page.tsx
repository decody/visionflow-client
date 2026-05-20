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

import { useTopbar } from '@/components/layout/topbar-context';
import Loading from '@/components/loading/page';
import { useFaqListQuery } from '@/hooks/admin/faq/useFaqQuery';
import { useUserRoleStore } from '@/stores/user-role-store';
import styles from './page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const { Text, Title } = Typography;

type CategoryFilter = 'all' | 'contact' | 'default';
type VisibilityFilter = 'all' | 'hidden' | 'visible';

const getCreatedTime = (faq: IFaq) => {
  const value = faq.created_at ?? faq.createdAt;
  const time = value ? new Date(value).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
};

const sortByNewest = (faqs: IFaq[]) => {
  return [...faqs].sort((a, b) => {
    const createdDiff = getCreatedTime(b) - getCreatedTime(a);

    if (createdDiff !== 0) {
      return createdDiff;
    }

    return String(b.id ?? '').localeCompare(
      String(a.id ?? ''),
      undefined,
      {
        numeric: true,
      },
    );
  });
};

export default function FaqPage() {
  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '인박스' },
        { label: 'FAQ' },
      ],
    }),
    [],
  );

  const { data: faqs = [], isLoading } = useFaqListQuery();
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>('all');
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('all');

  const { role, fetchRole, setRole, clearRole } = useUserRoleStore();

  const filteredFaqs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return sortByNewest(
      faqs.filter((faq) => {
        if (
          normalizedKeyword &&
          !(
            faq.question.toLowerCase().includes(normalizedKeyword) ||
            faq.answer.toLowerCase().includes(normalizedKeyword)
          )
        ) {
          return false;
        }

        if (
          categoryFilter !== 'all' &&
          faq.category !== categoryFilter
        ) {
          return false;
        }

        if (
          visibilityFilter === 'visible' &&
          faq.is_visible !== true
        ) {
          return false;
        }

        if (
          visibilityFilter === 'hidden' &&
          faq.is_visible === true
        ) {
          return false;
        }

        return true;
      }),
    );
  }, [categoryFilter, faqs, keyword, visibilityFilter]);

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
          const selectCategory =
            value === 'contact' ? '문의' : '기본';

          return (
            <Tag color={value === 'contact' ? 'green' : 'blue'}>
              {selectCategory}
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
          data,
        }: ICellRendererParams<IFaq, string>) => {
          if (!data) {
            return null;
          }

          return (
            <Link
              href={ROUTES.ADMIN.FAQ.DETAIL(data.id)}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            >
              <Text strong>{value}</Text>
            </Link>
          );
        },
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
        maxWidth: 200,
        minWidth: 200,
        cellRenderer: ({
          value,
        }: ICellRendererParams<IFaq, string>) =>
          value ? new Date(value).toLocaleString() : '-',
      },
      {
        field: 'updated_at',
        headerName: '수정일',
        maxWidth: 200,
        minWidth: 200,
        cellRenderer: ({
          value,
        }: ICellRendererParams<IFaq, string>) =>
          value ? new Date(value).toLocaleString() : '-',
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
      filter: false,
      resizable: true,
      sortable: false,
      autoHeight: true,
    }),
    [],
  );

  if (isLoading) {
    return <Loading />;
  }

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

        {role === 'SuperAdmin' || role === 'Operator' ? (
          <Link href={ROUTES.ADMIN.FAQ.WRITE()}>
            <Button type="primary">FAQ 등록</Button>
          </Link>
        ) : null}
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
            paginationPageSizeSelector={[10, 20, 50, 100]}
            rowData={filteredFaqs}
            rowHeight={48}
            theme="legacy"
          />
        </div>
      </Card>
    </section>
  );
}
