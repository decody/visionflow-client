'use client';

import { ROUTES } from '@visionflow/routes';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  MoreHorizontal,
  Search,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

import styles from './general-inquiry-list-page.module.css';

type StatusKey = 'unanswered' | 'reviewed' | 'done';
type CategoryKey = 'proposal' | 'report' | 'general' | 'feedback';

const STATUS_TABS = [
  { count: 186, key: 'all' as const, label: '전체' },
  { count: 5, key: 'unanswered' as const, label: '미답변' },
  { count: 14, key: 'reviewed' as const, label: '확인' },
  { count: 167, key: 'done' as const, label: '답변 완료' },
];

const STATUS_LABEL: Record<StatusKey, string> = {
  done: '완료',
  reviewed: '확인',
  unanswered: '미답변',
};

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  feedback: '피드백',
  general: '일반',
  proposal: '제안',
  report: '신고',
};

type Row = {
  assignee: { initial: string; name: string } | null;
  author: { initial: string; name: string };
  category: CategoryKey;
  createdAbsolute: string;
  createdRelative: string;
  email: string;
  excerpt: string;
  id: string;
  reply: { absolute: string; lapse: string } | null;
  status: StatusKey;
  title: string;
};

const ROWS: ReadonlyArray<Row> = [
  {
    assignee: null,
    author: { initial: '서', name: '서지호' },
    category: 'proposal',
    createdAbsolute: '오늘 13:42',
    createdRelative: '4시간 전',
    email: 'jiho.seo@designstudio.kr',
    excerpt: 'VisionFlow의 Designbase 토큰을 학습 자료로 활용하고 싶습니다.',
    id: 'G-3245',
    reply: null,
    status: 'unanswered',
    title: '디자인 시스템 컴포넌트 라이브러리 공유 가능한가요?',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    author: { initial: '최', name: '최민서' },
    category: 'report',
    createdAbsolute: '오늘 10:15',
    createdRelative: '7시간 전',
    email: 'minseo.choi@gmail.com',
    excerpt: 'Safari 17.4 / iPhone 15 Pro에서 5번째 갤러리 이미지가 로드 안됨',
    id: 'G-3244',
    reply: null,
    status: 'unanswered',
    title: '광고 이미지 페이지에 깨지는 이미지가 있습니다',
  },
  {
    assignee: null,
    author: { initial: '이', name: '이도현' },
    category: 'general',
    createdAbsolute: '어제 17:32',
    createdRelative: '1일 전',
    email: 'dohyun.lee@enterprise.co.kr',
    excerpt: '내부 임원 보고용으로 PDF 자료가 필요합니다.',
    id: 'G-3243',
    reply: null,
    status: 'unanswered',
    title: '회사 소개 자료 (브로셔) 받아볼 수 있을까요?',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '박', name: '박지민' },
    category: 'feedback',
    createdAbsolute: '어제 09:18',
    createdRelative: '1일 전',
    email: 'jimin.park@startup.io',
    excerpt: '랜딩 페이지의 스크롤 인터랙션이 매우 인상적이었습니다.',
    id: 'G-3242',
    reply: null,
    status: 'reviewed',
    title: '메인 페이지 사용자 경험에 대한 의견',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    author: { initial: '김', name: '김도영' },
    category: 'report',
    createdAbsolute: '5/4 14:25',
    createdRelative: '2일 전',
    email: 'doyoung.kim@techco.kr',
    excerpt: '큰 첨부 파일 업로드 시 자주 발생합니다 (10MB+).',
    id: 'G-3241',
    reply: null,
    status: 'reviewed',
    title: '문의 폼 제출 시 에러 발생 (500)',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '이', name: '이서윤' },
    category: 'proposal',
    createdAbsolute: '5/3 11:08',
    createdRelative: '3일 전',
    email: 'seoyoun.lee@brand.kr',
    excerpt: '월간 사례 연구 발행하시면 구독자가 많을 것 같습니다.',
    id: 'G-3240',
    reply: { absolute: '5/3 16:24', lapse: '5h 응답' },
    status: 'done',
    title: '뉴스레터 구독 옵션 추가 제안',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    author: { initial: '한', name: '한유진' },
    category: 'general',
    createdAbsolute: '5/2 15:50',
    createdRelative: '4일 전',
    email: 'yujin.han@design.com',
    excerpt: '디자이너 포지션에 관심이 있습니다.',
    id: 'G-3239',
    reply: { absolute: '5/2 17:15', lapse: '1.5h 응답' },
    status: 'done',
    title: '채용 정보는 어디서 확인하나요?',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '정', name: '정현우' },
    category: 'feedback',
    createdAbsolute: '5/1 10:32',
    createdRelative: '5일 전',
    email: 'hyunwoo.jung@retail.co.kr',
    excerpt: '체험판이 따로 있는지 궁금합니다.',
    id: 'G-3238',
    reply: { absolute: '5/1 14:48', lapse: '4h 응답' },
    status: 'done',
    title: 'Web 3D 컨피규레이터 데모 좋았어요',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    author: { initial: '윤', name: '윤서영' },
    category: 'general',
    createdAbsolute: '4/30 14:20',
    createdRelative: '6일 전',
    email: 'seoyoung.yoon@mediahaus.kr',
    excerpt: 'AI 디지털 스튜디오 트렌드 기획 기사 인터뷰 가능 여부',
    id: 'G-3237',
    reply: { absolute: '5/1 10:15', lapse: '20h 응답' },
    status: 'done',
    title: '미디어 인터뷰 요청',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '신', name: '신예지' },
    category: 'proposal',
    createdAbsolute: '4/29 11:30',
    createdRelative: '7일 전',
    email: 'yeji.shin@univ.ac.kr',
    excerpt: 'AI 도구 활용 디자인 콘테스트 후원 가능하신지요?',
    id: 'G-3236',
    reply: { absolute: '4/30 09:45', lapse: '22h 응답' },
    status: 'done',
    title: '교육 기관 협업 제안 (학생 작품 콘테스트)',
  },
];

const PAGINATION = ['1', '2', '3', '4', '5', '⋯', '10'];

export function GeneralInquiryListPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <p className={styles.breadcrumb}>
            <span>대시보드</span>
            <span aria-hidden="true">/</span>
            <span>인박스</span>
            <span aria-hidden="true">/</span>
            <span className={styles.breadcrumbCurrent}>일반 문의</span>
          </p>
          <h1 className={styles.pageTitle}>
            일반 문의<span className={styles.totalCount}>186건</span>
          </h1>
        </div>
        <button className={styles.secondaryButton} type="button">
          <Download aria-hidden="true" size={14} />
          CSV 내보내기
        </button>
      </header>

      <div className={styles.tabsBar} role="tablist" aria-label="상태 필터">
        {STATUS_TABS.map((tab, index) => (
          <button
            aria-selected={index === 0}
            className={`${styles.tab} ${index === 0 ? styles.tabActive : ''}`}
            key={tab.key}
            role="tab"
            type="button"
          >
            <span>{tab.label}</span>
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search aria-hidden="true" className={styles.searchIcon} size={14} />
          <input
            className={styles.searchInput}
            placeholder="제목, 작성자, 이메일로 검색"
            type="search"
          />
        </label>
        <button className={styles.filterButton} type="button">
          <Tag aria-hidden="true" size={14} />
          분류
          <ChevronDown aria-hidden="true" size={14} />
        </button>
        <button className={styles.filterButton} type="button">
          <CalendarDays aria-hidden="true" size={14} />
          최근 30일
          <ChevronDown aria-hidden="true" size={14} />
        </button>
      </div>

      <article className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input aria-label="전체 선택" type="checkbox" />
                </th>
                <th>상태</th>
                <th>분류</th>
                <th>제목</th>
                <th>작성자</th>
                <th>이메일</th>
                <th>
                  접수일 <ChevronDown aria-hidden="true" size={11} strokeWidth={2.5} />
                </th>
                <th>답변일</th>
                <th>담당</th>
                <th aria-label="action" />
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.id}>
                  <td className={styles.checkboxCell}>
                    <input aria-label={`${row.id} 선택`} type="checkbox" />
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[`status_${row.status}`]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.catBadge} ${styles[`cat_${row.category}`]}`}
                    >
                      {CATEGORY_LABEL[row.category]}
                    </span>
                  </td>
                  <td className={styles.titleCell}>
                    <Link
                      className={styles.titleLink}
                      href={ROUTES.ADMIN.GENERAL_INQUIRY.DETAIL(row.id)}
                    >
                      {row.title}
                    </Link>
                    <p className={styles.titleExcerpt}>{row.excerpt}</p>
                  </td>
                  <td>
                    <div className={styles.authorCell}>
                      <span aria-hidden="true" className={styles.avatar}>
                        {row.author.initial}
                      </span>
                      <strong>{row.author.name}</strong>
                    </div>
                  </td>
                  <td className={styles.emailCell}>{row.email}</td>
                  <td className={styles.dateCell}>
                    <span>{row.createdAbsolute}</span>
                    <span className={styles.dateRelative}>{row.createdRelative}</span>
                  </td>
                  <td className={styles.replyCell}>
                    {row.reply ? (
                      <>
                        <span className={styles.replyDone}>
                          <Check aria-hidden="true" size={11} strokeWidth={2.5} />
                          {row.reply.absolute}
                        </span>
                        <span className={styles.replyLapse}>{row.reply.lapse}</span>
                      </>
                    ) : (
                      <span className={styles.replyDash}>—</span>
                    )}
                  </td>
                  <td>
                    {row.assignee ? (
                      <div className={styles.assigneeCell}>
                        <span aria-hidden="true" className={styles.avatarSmall}>
                          {row.assignee.initial}
                        </span>
                        <span>{row.assignee.name}</span>
                      </div>
                    ) : (
                      <span className={styles.unassigned}>미할당</span>
                    )}
                  </td>
                  <td className={styles.actionCell}>
                    <button aria-label="더보기" className={styles.moreButton} type="button">
                      <MoreHorizontal aria-hidden="true" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.tableFooter}>
          <div className={styles.pageSize}>
            <span>페이지당</span>
            <button className={styles.pageSizeButton} type="button">
              20개
              <ChevronDown aria-hidden="true" size={12} />
            </button>
            <span>· 1–10 / 186건</span>
          </div>
          <nav aria-label="페이지" className={styles.pagination}>
            <button aria-label="이전" className={styles.pageNav} type="button">
              ‹
            </button>
            {PAGINATION.map((page, index) => (
              <button
                aria-current={page === '1' ? 'page' : undefined}
                className={`${styles.pageNum} ${page === '1' ? styles.pageNumActive : ''}`}
                disabled={page === '⋯'}
                key={`${page}-${index}`}
                type="button"
              >
                {page}
              </button>
            ))}
            <button aria-label="다음" className={styles.pageNav} type="button">
              ›
            </button>
          </nav>
        </footer>
      </article>
    </div>
  );
}
