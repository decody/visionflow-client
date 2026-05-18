'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  AiProvider,
  Message,
  QnaRow,
  SearchResponse,
  Source,
} from '@visionflow/shared';
import { MessageCircle, Search, Send, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import styles from './page.module.css';

const INITIAL_MESSAGE: Message = {
  role: 'ai',
  text: '안녕하세요. VisionFlow의 FAQ, 작업 사례, 공지사항에서 필요한 내용을 찾아드릴게요.',
};

const PROVIDERS: Array<{ label: string; value: AiProvider }> = [
  { label: 'AI 자동 검색', value: 'gemini' },
  // { label: 'OpenAI', value: 'openai' },
];

function isAnsweredQna(qna: QnaRow) {
  return (
    Boolean(qna.answer?.trim()) ||
    qna.status === 'done' ||
    qna.status === 'resolved'
  );
}

function getQnaHref(qna: QnaRow) {
  if (!isAnsweredQna(qna)) {
    return `${ROUTES.CONTACT}/general#board`;
  }

  return qna.isSecret
    ? `${ROUTES.CONTACT}/general/detail/secret`
    : `${ROUTES.CONTACT}/general/detail`;
}

function getWorkHref(workId: number) {
  return workId === 0 ? `${ROUTES.WORK}/detail` : ROUTES.WORK;
}

function buildSources(data: SearchResponse): Source[] {
  return [
    ...data.sources.notices.map((notice) => ({
      label: `공지 · ${notice.title}`,
      href: ROUTES.NOTICES.DETAIL(notice.id),
      type: 'notice' as const,
    })),
    ...data.sources.faqs.map((faq) => ({
      label: `자주하는 질문 · ${faq.question}`,
      href: `${ROUTES.CONTACT}#faq`,
      type: 'faq' as const,
    })),
    ...data.sources.contacts.map((contact) => ({
      label: `Contact · ${contact.title}`,
      href: `${ROUTES.CONTACT}/general#quick-form`,
      type: 'contact' as const,
    })),
    ...data.sources.qnas.map((qna) => ({
      label: `${qna.isNotice ? 'Q&A 공지' : 'Q&A'} · ${
        qna.title || qna.question
      }`,
      href: getQnaHref(qna),
      type: 'qna' as const,
    })),
    ...data.sources.works.map((work) => ({
      label: `작업 사례 · ${work.title}`,
      href: work.link_url ?? getWorkHref(work.id),
      type: 'work' as const,
    })),
  ];
}

export default function ChatSearch() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    INITIAL_MESSAGE,
  ]);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(
      () => inputRef.current?.focus(),
      120,
    );
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const send = async () => {
    if (!query.trim() || loading) return;

    const q = query.trim();
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, provider }),
      });

      if (!res.ok) {
        throw new Error('Search request failed');
      }

      const data = (await res.json()) as SearchResponse;
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: data.answer,
          sources: buildSources(data),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const removeQuestion = (messageIndex: number) => {
    setMessages((prev) =>
      prev.filter((message, index) => {
        if (index === messageIndex) {
          return false;
        }

        return !(index === messageIndex + 1 && message.role === 'ai');
      }),
    );
  };

  return (
    <aside className={styles.floating} aria-label="채팅 검색">
      <section
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        aria-hidden={!open}
      >
        <header className={styles.header}>
          <div className={styles.headerIcon} aria-hidden="true">
            <Search size={18} />
          </div>
          <div className={styles.headerText}>
            <strong>VisionFlow 검색</strong>
            <span>
              FAQ, 작업 사례, 공지사항을 한 번에 찾아보세요.
            </span>
          </div>
          <button
            type="button"
            aria-label="검색 레이어 닫기"
            className={styles.iconButton}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </header>

        <div
          className={styles.providerTabs}
          aria-label="AI 모델 선택"
        >
          {PROVIDERS.map((item) => {
            const isActive = provider === item.value;
            return (
              <button
                key={item.value}
                type="button"
                className={`${styles.providerTab} ${isActive ? styles.providerTabActive : ''}`}
                aria-pressed={isActive}
                onClick={() => setProvider(item.value)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div ref={bodyRef} className={styles.messages}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`${styles.messageRow} ${
                message.role === 'user' ? styles.messageRowUser : ''
              }`}
            >
              <div className={styles.messageContent}>
                {message.role === 'user' &&
                messages[index + 1]?.role === 'ai' ? (
                  <button
                    type="button"
                    className={styles.deleteQuestionButton}
                    aria-label="질문 삭제"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
                <div
                  className={`${styles.bubble} ${
                    message.role === 'user'
                      ? styles.userBubble
                      : styles.aiBubble
                  }`}
                >
                  {message.text}
                </div>
              </div>

              {message.sources && message.sources.length > 0 ? (
                <div className={styles.sources}>
                  {message.sources.map((source, sourceIndex) => (
                    <Link
                      key={`${source.href}-${sourceIndex}`}
                      href={source.href}
                      className={styles.sourceLink}
                      onClick={() => setOpen(false)}
                    >
                      {source.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {loading ? (
            <div className={styles.loading} aria-label="검색 중">
              <span />
              <span />
              <span />
            </div>
          ) : null}
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="무엇을 찾아드릴까요?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="submit"
            aria-label="검색 보내기"
            disabled={loading || !query.trim()}
            className={styles.sendButton}
          >
            <Send size={18} />
          </button>
        </form>
      </section>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={styles.trigger}
        aria-label={open ? '검색 레이어 닫기' : '검색 레이어 열기'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
    </aside>
  );
}
