'use client';

import Loading from '@/components/loading/page';
import { useNoticeListQuery } from '@/hooks/notices/useNoticeQuery';
import { getNoticeDisplayNumberMap } from '@/utils/notices';
import { ROUTES } from '@visionflow/routes';
import type { INotice } from '@visionflow/shared';
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from 'ag-grid-community';
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
import { useMemo } from 'react';

import styles from './page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const { Text, Title } = Typography;

const categoryLabels: Record<string, string> = {
  Guide: '공지',
  Service: '서비스',
  Update: '업데이트',
  Event: '이벤트',
  announcement: '공지',
  event: '이벤트',
  maintenance: '점검',
  update: '업데이트',
};

const getCategoryLabel = (category?: string) => {
  if (!category) {
    return '-';
  }

  return categoryLabels[category] ?? category;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export default function NoticePage() {
  const { data: notices = [], isLoading } = useNoticeListQuery();

  const noticeNumberById = useMemo(() => {
    return getNoticeDisplayNumberMap(notices);
  }, [notices]);

  const columnDefs = useMemo<ColDef<INotice>[]>(
    () => [
      {
        colId: 'displayNumber',
        headerName: '번호',
        maxWidth: 92,
        minWidth: 80,
        valueGetter: ({
          data,
        }: ValueGetterParams<INotice>) =>
          data ? (noticeNumberById.get(data.id) ?? '-') : '-',
      },
      {
        field: 'title',
        headerName: '공지 제목',
        flex: 1,
        minWidth: 320,
        cellRenderer: ({
          value,
          data,
        }: ICellRendererParams<INotice, string>) => {
          if (!data) {
            return null;
          }

          return (
            <Link
              href={ROUTES.ADMIN.NOTICE.DETAIL(data.id)}
              style={{
                display: 'block',
                height: '100%',
                width: '100%',
              }}
            >
              <Space size={8} wrap>
                {data.isImportant ? (
                  <Tag color="red">중요</Tag>
                ) : null}
                <Text strong>{value}</Text>
              </Space>
            </Link>
          );
        },
      },
      {
        field: 'category',
        headerName: '카테고리',
        maxWidth: 140,
        minWidth: 120,
        cellRenderer: ({
          value,
        }: ICellRendererParams<INotice, string>) =>
          value ? (
            <Tag color="blue">{getCategoryLabel(value)}</Tag>
          ) : (
            '-'
          ),
      },
      {
        field: 'isPublished',
        headerName: '공개 여부',
        maxWidth: 120,
        minWidth: 110,
        cellRenderer: ({
          value,
        }: ICellRendererParams<INotice, boolean>) =>
          value ? <Tag color="green">공개</Tag> : <Tag>비공개</Tag>,
      },
      {
        field: 'isImportant',
        headerName: '중요',
        maxWidth: 100,
        minWidth: 90,
        cellRenderer: ({
          value,
        }: ICellRendererParams<INotice, boolean>) =>
          value ? <Tag color="red">Y</Tag> : <Tag>N</Tag>,
      },
      {
        field: 'date',
        headerName: '게시일',
        maxWidth: 140,
        minWidth: 130,
      },
      // {
      //   field: 'createdBy',
      //   headerName: '작성자',
      //   maxWidth: 120,
      //   minWidth: 110,
      //   valueFormatter: ({ value }) => value ?? '-',
      // },
      {
        field: 'updatedAt',
        headerName: '수정일',
        maxWidth: 180,
        minWidth: 170,
        valueFormatter: ({ value }) => formatDateTime(value),
      },
      {
        colId: 'action',
        headerName: '관리',
        maxWidth: 150,
        minWidth: 140,
        cellRenderer: ({ data }: ICellRendererParams<INotice>) => {
          if (!data) {
            return null;
          }

          return (
            <Space size="small">
              <Link href={ROUTES.ADMIN.NOTICE.DETAIL(data.id)}>
                상세
              </Link>
              <Link href={ROUTES.ADMIN.NOTICE.EDIT(data.id)}>
                수정
              </Link>
            </Space>
          );
        },
      },
    ],
    [noticeNumberById],
  );

  const defaultColDef = useMemo<ColDef<INotice>>(
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
            공지사항 관리
          </Title>
          <Text type="secondary">
            등록된 공지사항의 공개 상태와 내용을 확인합니다.
          </Text>
        </div>
        <Link href={ROUTES.ADMIN.NOTICE.WRITE()}>
          <Button type="primary">공지 등록</Button>
        </Link>
      </Flex>

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <Text type="secondary">전체 공지</Text>
          <strong>{notices.length}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <Text type="secondary">게시중</Text>
          <strong>
            {notices.filter((notice) => notice.isPublished).length}
          </strong>
        </Card>
        <Card className={styles.summaryCard}>
          <Text type="secondary">비공개</Text>
          <strong>
            {notices.filter((notice) => !notice.isPublished).length}
          </strong>
        </Card>
        <Card className={styles.summaryCard}>
          <Text type="secondary">중요 공지</Text>
          <strong>
            {notices.filter((notice) => notice.isImportant).length}
          </strong>
        </Card>
      </div>

      <Card className={styles.panel}>
        <Flex gap={12} wrap>
          <Input.Search
            allowClear
            className={styles.search}
            placeholder="공지 제목 또는 내용을 검색"
          />
          <Select
            className={styles.select}
            defaultValue="all"
            options={[
              { label: '전체 카테고리', value: 'all' },
              { label: '공지', value: 'Guide' },
              { label: '서비스', value: 'Service' },
              { label: '업데이트', value: 'Update' },
              { label: '이벤트', value: 'Event' },
              { label: '점검', value: 'maintenance' },
            ]}
          />
          <Select
            className={styles.select}
            defaultValue="all"
            options={[
              { label: '전체 공개상태', value: 'all' },
              { label: '공개', value: 'published' },
              { label: '비공개', value: 'private' },
            ]}
          />
          <Select
            className={styles.select}
            defaultValue="all"
            options={[
              { label: '전체 중요상태', value: 'all' },
              { label: '중요', value: 'important' },
              { label: '일반', value: 'normal' },
            ]}
          />
        </Flex>
      </Card>

      <Card
        className={styles.panel}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.tableHeader}>
          <Text strong>공지 목록</Text>
          <Text type="secondary">총 {notices.length}건</Text>
        </div>
        <div className={`ag-theme-quartz ${styles.grid}`}>
          <AgGridReact<INotice>
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            rowData={notices}
            rowHeight={48}
            theme="legacy"
          />
        </div>
      </Card>
    </section>
  );
}
