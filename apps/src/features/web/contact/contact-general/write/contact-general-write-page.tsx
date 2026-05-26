'use client';

import { ROUTES } from '@visionflow/routes';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';

import { Container } from '@/components/common/container';
import { useCreateQnaMutation } from '@/hooks/qna/useCreateQnaMutation';
import styles from '../contact-general-page.module.css';

const categories = ['전체', '공지', '서비스 일반'];

const initialForm = {
  author: '',
  category: '전체',
  content: '',
  isSecret: false,
  password: '',
  title: '',
};

export function ContactGeneralWritePage() {
  const router = useRouter();
  const createQnaMutation = useCreateQnaMutation();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, type, value } = event.target;
    const nextValue =
      type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : value;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const author = form.author.trim();
    const title = form.title.trim();
    const content = form.content.trim();
    const password = form.password.trim();

    if (!author || !title || !content) {
      setMessage('작성자, 제목, 내용을 입력해 주세요.');
      return;
    }

    if (form.isSecret && !password) {
      setMessage('비밀글은 비밀번호를 입력해 주세요.');
      return;
    }

    try {
      await createQnaMutation.mutateAsync({
        author,
        category: form.category,
        content,
        isSecret: form.isSecret,
        password: form.isSecret ? password : undefined,
        title,
      });

      router.push(`${ROUTES.CONTACT.ROOT}/general#board`);
      router.refresh();
    } catch {
      setMessage(
        'Q&A 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
  };

  return (
    <main className={styles.writePage}>
      <section className={styles.writeHero}>
        <Container>
          <div className={styles.writeHeader}>
            <Link
              className={styles.writeBackLink}
              href={`${ROUTES.CONTACT.ROOT}/general#board`}
            >
              <ArrowLeft aria-hidden="true" size={16} />
              목록으로
            </Link>
            <div className={styles.sectionHead}>
              <span
                className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}
              >
                Q&amp;A Write
              </span>
              <h1 className={styles.heroTitle}>Q&amp;A 등록</h1>
              <p className={styles.heroSub}>
                궁금한 내용을 남겨주시면 VisionFlow 운영팀이 확인 후
                답변드립니다.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.writeSection}>
        <Container>
          <form className={styles.writeForm} onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label
                  className={styles.formLabel}
                  htmlFor="qna-author"
                >
                  작성자{' '}
                  <span className={styles.formRequired}>*</span>
                </label>
                <input
                  autoComplete="name"
                  className={styles.formInput}
                  id="qna-author"
                  maxLength={40}
                  name="author"
                  onChange={handleChange}
                  placeholder="작성자 이름"
                  required
                  type="text"
                  value={form.author}
                />
              </div>
              <div className={styles.formField}>
                <label
                  className={styles.formLabel}
                  htmlFor="qna-category"
                >
                  카테고리
                </label>
                <select
                  className={styles.formSelect}
                  id="qna-category"
                  name="category"
                  onChange={handleChange}
                  value={form.category}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="qna-title">
                제목 <span className={styles.formRequired}>*</span>
              </label>
              <input
                className={styles.formInput}
                id="qna-title"
                maxLength={120}
                name="title"
                onChange={handleChange}
                placeholder="문의 제목을 입력해 주세요"
                required
                type="text"
                value={form.title}
              />
            </div>

            <div className={styles.formField}>
              <label
                className={styles.formLabel}
                htmlFor="qna-content"
              >
                내용 <span className={styles.formRequired}>*</span>
              </label>
              <textarea
                className={styles.writeTextarea}
                id="qna-content"
                maxLength={3000}
                name="content"
                onChange={handleChange}
                placeholder={
                  '프로젝트 상황, 궁금한 점, 참고하면 좋은 조건을 자유롭게 적어주세요.\n민감한 정보가 포함되어 있다면 비밀글로 등록해 주세요.'
                }
                required
                rows={12}
                value={form.content}
              />
            </div>

            <div className={styles.secretBox}>
              <label
                className={styles.secretCheck}
                htmlFor="qna-secret"
              >
                <input
                  checked={form.isSecret}
                  id="qna-secret"
                  name="isSecret"
                  onChange={handleChange}
                  type="checkbox"
                />
                <span>비밀글로 등록</span>
              </label>
              <input
                className={styles.secretPassword}
                disabled={!form.isSecret}
                maxLength={24}
                name="password"
                onChange={handleChange}
                placeholder="비밀글 비밀번호"
                type="password"
                value={form.password}
              />
            </div>

            {message ? (
              <p
                aria-live="polite"
                className={`${styles.formNote} ${styles.formNoteMessage}`}
              >
                {message}
              </p>
            ) : null}

            <div className={styles.writeActions}>
              <Link
                className={styles.writeCancel}
                href={`${ROUTES.CONTACT.ROOT}/general#board`}
              >
                취소
              </Link>
              <button
                className={styles.writeSubmit}
                disabled={createQnaMutation.isPending}
                type="submit"
              >
                <Send aria-hidden="true" size={16} />
                {createQnaMutation.isPending ? '등록 중' : '등록하기'}
              </button>
            </div>
          </form>
        </Container>
      </section>
    </main>
  );
}
