'use client';

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Card, Flex, Input, Select, Space, Tag, Typography } from 'antd';
import { Megaphone, Search } from 'lucide-react';
import { useMemo } from 'react';

import styles from './page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const { Text, Title } = Typography;

type NoticeCategory =
  | 'announcement'
  | 'event'
  | 'maintenance'
  | 'update';

type NoticeStatus = 'published' | 'hidden';

interface Notice {
  category: NoticeCategory;
  createdAt: string;
  createdBy: string | null;
  date: string;
  description: string | null;
  id: string;
  isImportant: boolean;
  isPublished: boolean;
  title: string;
  updatedAt: string;
}

const categoryLabels: Record<NoticeCategory, string> = {
  announcement: '공지',
  event: '이벤트',
  maintenance: '점검',
  update: '업데이트',
};

const statusLabels: Record<NoticeStatus, string> = {
  hidden: '비공개',
  published: '공개',
};

const statusColors: Record<NoticeStatus, string> = {
  hidden: 'default',
  published: 'green',
};

const statusOptions = [
  { label: '전체 상태', value: 'all' },
  { label: '공개', value: 'published' },
  { label: '비공개', value: 'hidden' },
];

const categoryOptions = [
  { label: '전체 카테고리', value: 'all' },
  { label: '공지', value: 'announcement' },
  { label: '이벤트', value: 'event' },
  { label: '점검', value: 'maintenance' },
  { label: '업데이트', value: 'update' },
];

const notices: Notice[] = [
  {
    id: '1042',
    category: 'announcement',
    date: '2026-05-08',
    title: 'VisionFlow 관리자 콘솔 개편 안내',
    description:
      '공지사항 관리 화면에서 공개 여부와 중요 공지 상태를 확인할 수 있습니다.',
    isImportant: true,
    isPublished: true,
    createdBy: '운영팀',
    createdAt: '2026-05-08 10:30',
    updatedAt: '2026-05-08 10:30',
  },
  {
    id: '1041',
    category: 'update',
    date: '2026-05-06',
    title: '3D 제작 문의 접수 프로세스 변경',
    description: '문의 접수 플로우의 사전 확인 문항이 변경됩니다.',
    isImportant: true,
    isPublished: true,
    createdBy: '프로덕트팀',
    createdAt: '2026-05-06 14:00',
    updatedAt: '2026-05-06 14:00',
  },
  {
    id: '1040',
    category: 'maintenance',
    date: '2026-05-12',
    title: '5월 정기 시스템 점검 사전 안내',
    description:
      '점검 시간 동안 일부 화면 이용이 일시적으로 제한될 수 있습니다.',
    isImportant: false,
    isPublished: true,
    createdBy: '인프라팀',
    createdAt: '2026-05-05 09:00',
    updatedAt: '2026-05-05 09:00',
  },
  {
    id: '1039',
    category: 'event',
    date: '2026-05-02',
    title: '신규 포트폴리오 템플릿 공개',
    description: '프로젝트 사례 페이지에 새 템플릿이 추가됩니다.',
    isImportant: false,
    isPublished: true,
    createdBy: '마케팅팀',
    createdAt: '2026-05-02 09:15',
    updatedAt: '2026-05-02 09:15',
  },
  {
    id: '1038',
    category: 'update',
    date: '2026-05-01',
    title: '광고 비주얼 제작 패키지 업데이트 초안',
    description: '공개 전 검토 중인 공지사항 예시입니다.',
    isImportant: false,
    isPublished: false,
    createdBy: '운영팀',
    createdAt: '2026-05-01 11:20',
    updatedAt: '2026-05-01 11:20',
  },
];

export default function NoticePage() {
  const columnDefs = useMemo<ColDef<Notice>[]>(
    () => [
      {
        field: 'id',
        headerName: '번호',
        maxWidth: 92,
        minWidth: 80,
      },
      {
        field: 'title',
        headerName: '공지 제목',
        flex: 1,
        minWidth: 320,
        cellRenderer: ({
          value,
          data,
        }: ICellRendererParams<Notice, string>) => (
          <Space size={8} wrap>
            {data?.isImportant ? <Tag color="red">중요</Tag> : null}
            <Text strong>{value}</Text>
          </Space>
        ),
      },
      {
        field: 'category',
        headerName: '카테고리',
        maxWidth: 130,
        minWidth: 120,
        cellRenderer: ({
          value,
        }: ICellRendererParams<Notice, NoticeCategory>) =>
          value ? (
            <Tag color="blue">{categoryLabels[value]}</Tag>
          ) : null,
      },
      {
        field: 'isPublished',
        headerName: '공개 여부',
        maxWidth: 120,
        minWidth: 110,
        cellRenderer: ({
          value,
        }: ICellRendererParams<Notice, boolean>) => {
          const status: NoticeStatus = value ? 'published' : 'hidden';

          return (
            <Tag color={statusColors[status]}>
              {statusLabels[status]}
            </Tag>
          );
        },
      },
      {
        field: 'isImportant',
        headerName: '중요',
        maxWidth: 100,
        minWidth: 90,
        cellRenderer: ({
          value,
        }: ICellRendererParams<Notice, boolean>) =>
          value ? <Tag color="red">Y</Tag> : <Tag>N</Tag>,
      },
      {
        field: 'date',
        headerName: '노출일',
        maxWidth: 140,
        minWidth: 130,
      },
      {
        field: 'createdBy',
        headerName: '작성자',
        maxWidth: 120,
        minWidth: 110,
      },
      {
        field: 'updatedAt',
        headerName: '수정일',
        maxWidth: 180,
        minWidth: 170,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<Notice>>(
    () => ({
      filter: false,
      resizable: true,
      sortable: false,
      autoHeight: true,
    }),
    [],
  );

  return (
    <section className={styles.page}>
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Title className={styles.title} level={2}>
            공지사항 관리
          </Title>
          <Text type="secondary">
            검색, 필터, 등록 기능을 붙이기 전의 UI 예시입니다.
          </Text>
        </div>
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
          <Input
            allowClear
            className={styles.search}
            placeholder="공지 제목 검색"
            prefix={<Search size={16} />}
          />
          <Select
            className={styles.select}
            defaultValue="all"
            options={statusOptions}
          />
          <Select
            className={styles.select}
            defaultValue="all"
            options={categoryOptions}
          />
        </Flex>
      </Card>

      <Card
        className={styles.panel}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.tableHeader}>
          <Flex align="center" gap={10}>
            <span className={styles.tableIcon}>
              <Megaphone size={17} />
            </span>
            <Text strong>공지 목록</Text>
          </Flex>
          <Text type="secondary">총 {notices.length}건</Text>
        </div>
        <div className={`ag-theme-quartz ${styles.grid}`}>
          <AgGridReact<Notice>
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination
            paginationPageSize={10}
            rowData={notices}
            rowHeight={48}
            theme="legacy"
          />
        </div>
      </Card>
    </section>
  );
}
