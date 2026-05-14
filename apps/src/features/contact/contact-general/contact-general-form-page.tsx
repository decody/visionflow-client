'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';

import { useCreateQuickMutation } from '@/hooks/admin/contact/quick/useCreateQuickMutation';
import styles from './contact-general-page.module.css';

const initialForm = {
  name: '',
  email: '',
  subject: '',
  content: '',
};

export function ContactGeneralFormPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const createQuickMutation = useCreateQuickMutation();

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const subject = form.subject.trim();
    const content = form.content.trim();

    if (!name || !email || !content) {
      setMessage('필수 항목을 입력해주세요.');
      return;
    }

    try {
      await createQuickMutation.mutateAsync({
        name,
        email,
        subject: subject || null,
        content,
      });

      setForm(initialForm);
      setMessage('문의가 접수되었습니다.');
    } catch {
      setMessage(
        '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  };

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="qf-name">
            이름 <span className={styles.formRequired}>*</span>
          </label>
          <input
            className={styles.formInput}
            id="qf-name"
            name="name"
            onChange={handleChange}
            placeholder="문의하시는 분의 이름"
            required
            type="text"
            value={form.name}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="qf-email">
            이메일 <span className={styles.formRequired}>*</span>
          </label>
          <input
            className={styles.formInput}
            id="qf-email"
            name="email"
            onChange={handleChange}
            placeholder="you@example.com"
            required
            type="email"
            value={form.email}
          />
        </div>
      </div>
      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="qf-title">
          제목 <span className={styles.formOptional}>(선택)</span>
        </label>
        <input
          className={styles.formInput}
          id="qf-title"
          name="subject"
          onChange={handleChange}
          placeholder="문의 제목을 입력해주세요"
          type="text"
          value={form.subject}
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="qf-message">
          내용 <span className={styles.formRequired}>*</span>
        </label>
        <textarea
          className={styles.formTextarea}
          id="qf-message"
          name="content"
          onChange={handleChange}
          placeholder={
            '궁금한 내용을 자유롭게 작성해주세요.\n견적, 기술, 진행 절차, NDA 등 무엇이든 문의할 수 있습니다.'
          }
          required
          rows={6}
          value={form.content}
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
      <div className={styles.formActions}>
        <p className={styles.formNote}>
          1~2영업일 내 이메일로 답변드립니다.
        </p>
        <button
          className={styles.formSubmit}
          disabled={createQuickMutation.isPending}
          type="submit"
        >
          {createQuickMutation.isPending
            ? '전송 중...'
            : '문의 보내기'}
        </button>
      </div>
    </form>
  );
}
