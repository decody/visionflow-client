import { supabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

export const getList = async ({ pageParam = 0, queryKey }) => {
  const { searchTerm } = queryKey[1];
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .ilike('title', `%${searchTerm}%`)
    .range(pageParam * 10, (pageParam + 1) * 10 - 1);
  if (error) throw new Error(error.message);
  return { items: data, nextCursor: pageParam + 1 };
};

export const getById = async (id) => {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const create = async (notice) => {
  const { data, error } = await supabase
    .from('notices')
    .insert(notice);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/notice');
};

export const update = async (id, notice) => {
  const { data, error } = await supabase
    .from('notices')
    .update(notice)
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/notice/${id}`);
};

export const remove = async (id) => {
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/notice');
};