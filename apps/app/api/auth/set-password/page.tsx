'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/**
 * 초대 수락 후 비밀번호 설정 페이지.
 *
 * <p>초대 링크의 원문 토큰(?token=)을 읽어 새 비밀번호와 함께 BFF(/api/auth/complete-invite)로 보내면,
 * Spring 이 토큰을 검증하고 비번을 설정·계정을 활성화한다. 기존 Supabase updateUser 흐름을 대체.
 */
export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const handleSubmit = async () => {
    setError('');

    if (!token) {
      setError('유효하지 않은 초대 링크입니다.');
      return;
    }

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/complete-invite', {
        body: JSON.stringify({ password, token }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        setError(body?.message ?? '비밀번호 설정에 실패했습니다.');
        setLoading(false);
        return;
      }

      router.push('/settings/login?mode=partner');
    } catch {
      setError('비밀번호 설정에 실패했습니다.');
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>비밀번호 설정</h1>
      <input
        onChange={(event) => setPassword(event.target.value)}
        placeholder="새 비밀번호 (8자 이상)"
        type="password"
        value={password}
      />
      <input
        onChange={(event) => setConfirm(event.target.value)}
        placeholder="비밀번호 확인"
        type="password"
        value={confirm}
      />
      {error ? <p style={{ color: 'red' }}>{error}</p> : null}
      <button disabled={loading} onClick={handleSubmit} type="button">
        {loading ? '설정 중...' : '설정 완료'}
      </button>
    </main>
  );
}
