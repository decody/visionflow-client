'use client';

import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setError('');

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/settings/login?mode=partner');
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
