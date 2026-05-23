import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { noticeSchema } from '@/lib/types/notice';
import { Button, Input } from 'shadcn/ui';

const NoticeForm = ({ onSubmit, defaultValues }) => {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(noticeSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('title')} placeholder="제목" />
      <Input {...register('category')} placeholder="카테고리" />
      <textarea {...register('description')} placeholder="설명" />
      <Button type="submit">제출</Button>
    </form>
  );
};

export default NoticeForm;