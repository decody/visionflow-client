import { z } from 'zod';

export type Notice = {
  id: string;
  category: string;
  date: string;
  title: string;
  description?: string;
  content_html?: string;
  content_json?: any;
  is_important?: boolean;
  is_published?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export const noticeSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다.'),
  category: z.string().min(1, '카테고리는 필수입니다.'),
  description: z.string().optional(),
});

export type NoticeInsert = z.infer<typeof noticeSchema>;
export type NoticeUpdate = Partial<NoticeInsert>;