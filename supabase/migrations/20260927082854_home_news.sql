-- Independent newspaper: no changes to saves, gameplay tables, or existing policies.
create schema if not exists glc_private;
create table glc_private.news_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table glc_private.news_editors enable row level security;
revoke all on glc_private.news_editors from public, anon, authenticated;
grant usage on schema glc_private to authenticated;
grant select on glc_private.news_editors to authenticated;
create policy news_editor_self on glc_private.news_editors for select to authenticated
  using (user_id = (select auth.uid()));

-- Reuse the existing catalog administrator, resolved server-side, without a fixed user UUID.
insert into glc_private.news_editors (user_id)
select id from auth.users where email = 'simone.dambrosio14@gmail.com';
do $$ begin
  if not exists (select 1 from glc_private.news_editors) then
    raise exception 'Catalog administrator not found; newspaper setup rolled back';
  end if;
end $$;

create function public.glc_news_can_edit() returns boolean
language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from glc_private.news_editors where user_id = (select auth.uid())
  );
$$;
revoke all on function public.glc_news_can_edit() from public, anon, authenticated;
grant execute on function public.glc_news_can_edit() to authenticated;

create table public.glc_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  category text not null default 'Aggiornamenti' check (category in ('Aggiornamenti','Regolamento','Community')),
  excerpt text not null check (length(btrim(excerpt)) between 1 and 320),
  body text not null check (length(btrim(body)) between 1 and 40000),
  cover text not null default '' check (length(cover) <= 3600000 and (cover = '' or cover ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')),
  thumbnail text not null default '' check (length(thumbnail) <= 400000 and (thumbnail = '' or thumbnail ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
alter table public.glc_news enable row level security;
revoke all on public.glc_news from public, anon, authenticated;
grant select on public.glc_news to anon, authenticated;
grant insert (id,title,category,excerpt,body,cover,thumbnail,featured,status) on public.glc_news to authenticated;
grant update (title,category,excerpt,body,cover,thumbnail,featured,status) on public.glc_news to authenticated;
create policy news_public_read on public.glc_news for select to anon
  using (status = 'published');
create policy news_member_read on public.glc_news for select to authenticated
  using (status = 'published' or (select public.glc_news_can_edit()));
create policy news_editor_insert on public.glc_news for insert to authenticated
  with check ((select public.glc_news_can_edit()));
create policy news_editor_update on public.glc_news for update to authenticated
  using ((select public.glc_news_can_edit())) with check ((select public.glc_news_can_edit()));

create function glc_private.news_stamp() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  if tg_op = 'INSERT' then
    new.created_at = new.updated_at;
    new.version = 1;
    new.published_at = case when new.status = 'published' then new.updated_at else null end;
  else
    new.id = old.id;
    new.created_at = old.created_at;
    new.version = old.version + 1;
    new.published_at = case when new.status = 'published' then coalesce(old.published_at,new.updated_at) else old.published_at end;
  end if;
  return new;
end;
$$;
revoke all on function glc_private.news_stamp() from public, anon, authenticated;
create trigger news_stamp before insert or update on public.glc_news
for each row execute function glc_private.news_stamp();
create index news_public_date on public.glc_news (published_at desc,id desc) where status='published';
create index news_public_featured on public.glc_news (featured desc,published_at desc,id desc) where status='published';
create index news_editor_date on public.glc_news (updated_at desc,id desc);
