import { Table } from 'shadcn/ui';
import { Notice } from '@/lib/types/notice';

const NoticeTable = ({ data, isLoading }) => {
  if (isLoading) return <div>로딩 중...</div>;

  return (
    <Table>
      <thead>
        <tr>
          <th>제목</th>
          <th>카테고리</th>
          <th>작성일</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        {data.pages.map((page) =>
          page.items.map((notice: Notice) => (
            <tr key={notice.id}>
              <td>{notice.title}</td>
              <td>{notice.category}</td>
              <td>{notice.date}</td>
              <td>{notice.is_published ? '발행' : '미발행'}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
};

export default NoticeTable;