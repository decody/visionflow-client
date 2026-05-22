import type { WorkRow } from './works';

export type SourceType =
  | 'faq'
  | 'work'
  | 'notice'
  | 'contact'
  | 'qna';

export type AiProvider = 'gemini' | 'openai';

export type Source = {
  label: string;
  href: string;
  type: SourceType;
};

export type Message = {
  role: 'user' | 'ai';
  text: string;
  sources?: Source[];
};

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
};

export type NoticeRow = {
  id: string;
  title: string;
  content: string;
};

export type ContactRow = {
  id: string;
  title: string;
  content: string;
  status?: string | null;
};

export type QnaRow = {
  id: string;
  question: string;
  answer?: string | null;
  category?: string | null;
  isNotice?: boolean | null;
  isSecret?: boolean | null;
  status?: string | null;
  title?: string | null;
};

export type SearchResponse = {
  answer: string;
  provider: AiProvider;
  sources: {
    contacts: ContactRow[];
    faqs: FaqRow[];
    qnas: QnaRow[];
    works: WorkRow[];
    notices: NoticeRow[];
  };
};

export type SearchRequest = {
  query: string;
  provider?: AiProvider;
};
