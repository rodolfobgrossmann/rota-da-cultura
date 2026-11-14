create or replace function public.artist_account_email(_artist_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select p.email from public.artists a
  join public.profiles p on p.id = a.user_id
  where a.id = _artist_id and a.organizer_id = auth.uid()
$$;
revoke execute on function public.artist_account_email(uuid) from public, anon;
grant execute on function public.artist_account_email(uuid) to authenticated;