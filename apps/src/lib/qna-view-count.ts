import { supabaseAdmin } from '@/lib/supabase-admin';

type QnaViewCountRpcResponse =
  | number
  | { increment_qna_view_count?: number | null; view_count?: number | null }
  | null;

const isMissingRpcError = (message: string) =>
  message.includes('could not find the function') ||
  message.includes('schema cache') ||
  message.includes('function') ||
  message.includes('does not exist');

const getRpcViewCount = (data: QnaViewCountRpcResponse) => {
  if (typeof data === 'number') {
    return data;
  }

  return data?.view_count ?? data?.increment_qna_view_count ?? null;
};

export async function incrementQnaViewCount(
  id: string,
  currentViewCount = 0,
) {
  const { data, error } = await supabaseAdmin.rpc(
    'increment_qna_view_count',
    { qna_id: id },
  );

  if (!error) {
    return getRpcViewCount(data as QnaViewCountRpcResponse) ??
      currentViewCount + 1;
  }

  if (!isMissingRpcError(error.message.toLowerCase())) {
    console.error('Failed to increment Q&A view count.', error.message);
  }

  const nextViewCount = currentViewCount + 1;
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('qna')
    .update({ view_count: nextViewCount })
    .eq('id', id)
    .select('view_count')
    .single();

  if (updateError) {
    console.error(
      'Failed to update Q&A view count fallback.',
      updateError.message,
    );

    return currentViewCount;
  }

  return Number(updated?.view_count ?? nextViewCount);
}
