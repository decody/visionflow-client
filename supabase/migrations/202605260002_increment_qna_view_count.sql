create or replace function public.increment_qna_view_count(qna_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_view_count integer;
begin
  update public.qna
  set view_count = coalesce(view_count, 0) + 1
  where id::text = qna_id
  returning view_count into new_view_count;

  if new_view_count is null then
    raise exception 'Q&A not found: %', qna_id;
  end if;

  return new_view_count;
end;
$$;

revoke all on function public.increment_qna_view_count(text) from public;
grant execute on function public.increment_qna_view_count(text) to service_role;
