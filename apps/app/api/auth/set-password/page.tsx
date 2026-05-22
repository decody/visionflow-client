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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/admin');
  };

  return (
    <div>
      <h1>비밀번호 설정</h1>
      <input
        type="password"
        placeholder="새 비밀번호 (8자 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="password"
        placeholder="비밀번호 확인"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? '설정 중...' : '설정 완료'}
      </button>
    </div>
  );
}
