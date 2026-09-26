-- GLC sync v2: backward-compatible preparation, account opt-in on first v2 read.
-- Existing content is snapshotted before installing the update trigger.
create schema if not exists glc_private;
revoke all on schema glc_private from public, anon;
grant usage on schema glc_private to authenticated;
alter table public.saves add column if not exists revision bigint not null default 1 check (revision > 0);
create table glc_private.sync_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled_at timestamptz not null default now()
);
create table glc_private.save_history (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 key text not null,
 revision bigint,
 data jsonb,
 saved_at timestamptz not null,
 archived_at timestamptz not null default clock_timestamp(),
 source text not null
);
create index save_history_owner_key_time on glc_private.save_history(user_id,key,archived_at desc);
alter table glc_private.sync_accounts enable row level security;
alter table glc_private.save_history enable row level security;
revoke all on glc_private.sync_accounts,glc_private.save_history from public,anon,authenticated;
insert into glc_private.save_history(user_id,key,revision,data,saved_at,source)
 select user_id,key,revision,data,updated_at,'initial-backup' from public.saves;

create function glc_private.sync_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from glc_private.sync_accounts where user_id=auth.uid());
$$;
revoke all on function glc_private.sync_enabled() from public,anon;
grant execute on function glc_private.sync_enabled() to authenticated;
-- Only v2 accounts are locked out of the old direct upsert path.
drop policy if exists saves_insert_own on public.saves;
drop policy if exists saves_update_own on public.saves;
drop policy if exists saves_delete_own on public.saves;
create policy saves_insert_own on public.saves for insert to authenticated
 with check ((select auth.uid())=user_id and not (select glc_private.sync_enabled()));
create policy saves_update_own on public.saves for update to authenticated
 using ((select auth.uid())=user_id and not (select glc_private.sync_enabled()))
 with check ((select auth.uid())=user_id and not (select glc_private.sync_enabled()));
create policy saves_delete_own on public.saves for delete to authenticated
 using ((select auth.uid())=user_id and not (select glc_private.sync_enabled()));
revoke all on public.saves from public,anon,authenticated;
grant select,delete on public.saves to authenticated;
grant insert(user_id,key,data),update(user_id,key,data) on public.saves to authenticated;

create function glc_private.trim_save_history(p_user uuid,p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 -- Five previous versions per key; preserve the initial migration backup.
 delete from glc_private.save_history where id in (
  select id from glc_private.save_history where user_id=p_user and key=p_key and source<>'initial-backup'
  order by archived_at desc,id desc offset 5
 );
 -- Bound rolling history to 32 MiB/account. Initial safety copies are excluded.
 while (select coalesce(sum(octet_length(data::text)),0) from glc_private.save_history
         where user_id=p_user and source<>'initial-backup') > 33554432 loop
  select id into v_id from glc_private.save_history where user_id=p_user and source<>'initial-backup'
   order by archived_at,id limit 1;
  exit when v_id is null;
  delete from glc_private.save_history where id=v_id;
 end loop;
end $$;
revoke all on function glc_private.trim_save_history(uuid,text) from public,anon,authenticated;

create function glc_private.track_save_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if TG_OP='INSERT' then
  NEW.revision:=1; NEW.updated_at:=clock_timestamp(); return NEW;
 end if;
 if TG_OP='DELETE' or NEW.data is distinct from OLD.data then
  insert into glc_private.save_history(user_id,key,revision,data,saved_at,source)
    values(OLD.user_id,OLD.key,OLD.revision,OLD.data,OLD.updated_at,'previous-version');
  perform glc_private.trim_save_history(OLD.user_id,OLD.key);
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 NEW.revision:=OLD.revision + case when NEW.data is distinct from OLD.data then 1 else 0 end;
 NEW.updated_at:=case when NEW.data is distinct from OLD.data then clock_timestamp() else OLD.updated_at end;
 return NEW;
end $$;
revoke all on function glc_private.track_save_version() from public,anon,authenticated;
create trigger saves_track_version before insert or update or delete on public.saves
 for each row execute function glc_private.track_save_version();

create function glc_private.sync_identity(p_key text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_key is null or p_key !~ '^glc_[a-z0-9_]{1,80}$' then raise exception 'Invalid save key'; end if;
 insert into glc_private.sync_accounts(user_id) values(u) on conflict do nothing;
 return u;
end $$;
revoke all on function glc_private.sync_identity(text) from public,anon,authenticated;

create function glc_private.sync_read(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid; r public.saves%rowtype;
begin
 u:=glc_private.sync_identity(p_key);
 select * into r from public.saves where user_id=u and key=p_key;
 return jsonb_build_object('revision',coalesce(r.revision,0),'data',r.data,'updated_at',r.updated_at);
end $$;
create function glc_private.sync_save(p_key text,p_expected bigint,p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid; r public.saves%rowtype; rev bigint;
begin
 u:=glc_private.sync_identity(p_key);
 if p_expected is null or p_expected<0 or p_data is null or jsonb_typeof(p_data) not in ('object','array') then raise exception 'Invalid save'; end if;
 if octet_length(p_data::text)>16777216 then raise exception 'Save exceeds 16 MiB'; end if;
 -- The account lock also serializes bounded-history maintenance across keys.
 perform pg_advisory_xact_lock(hashtextextended(u::text,7264));
 select * into r from public.saves where user_id=u and key=p_key for update;
 rev:=coalesce(r.revision,0);
 if rev<>p_expected and (rev=0 or r.data is distinct from p_data) then
  return jsonb_build_object('ok',false,'revision',rev,'data',r.data,'updated_at',r.updated_at);
 end if;
 if rev=0 then
  insert into public.saves(user_id,key,data) values(u,p_key,p_data) returning * into r;
 elsif r.data is distinct from p_data then
  update public.saves set data=p_data where user_id=u and key=p_key returning * into r;
 end if;
 return jsonb_build_object('ok',true,'revision',r.revision,'data',r.data,'updated_at',r.updated_at);
end $$;
create function glc_private.sync_archive(p_key text,p_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid; result uuid;
begin
 u:=glc_private.sync_identity(p_key);
 if p_data is null or octet_length(p_data::text)>16777216 then raise exception 'Invalid backup'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,7264));
 -- Retry-safe: identical recovery copies are not duplicated.
 select id into result from glc_private.save_history where user_id=u and key=p_key and data=p_data and source='device-copy' limit 1;
 if result is not null then return result; end if;
 insert into glc_private.save_history(user_id,key,data,saved_at,source)
  values(u,p_key,p_data,clock_timestamp(),'device-copy') returning id into result;
 perform glc_private.trim_save_history(u,p_key);
 return result;
end $$;
create function glc_private.sync_history() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (
   select id,key,revision,saved_at,archived_at,source from glc_private.save_history
   where user_id=auth.uid() order by archived_at desc,id desc limit 100
 ) r),'[]'::jsonb);
end $$;
create function glc_private.sync_version(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select to_jsonb(h) into result from glc_private.save_history h where user_id=auth.uid() and id=p_id;
 if result is null then raise exception 'Version not found' using errcode='42501'; end if;
 return result;
end $$;

create function public.glc_sync_read(p_key text) returns jsonb language sql security invoker set search_path='' as $$ select glc_private.sync_read(p_key); $$;
create function public.glc_sync_save(p_key text,p_expected bigint,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$ select glc_private.sync_save(p_key,p_expected,p_data); $$;
create function public.glc_sync_archive(p_key text,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$ select glc_private.sync_archive(p_key,p_data); $$;
create function public.glc_sync_history() returns jsonb language sql security invoker set search_path='' as $$ select glc_private.sync_history(); $$;
create function public.glc_sync_version(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select glc_private.sync_version(p_id); $$;
revoke all on function glc_private.sync_read(text),glc_private.sync_save(text,bigint,jsonb),glc_private.sync_archive(text,jsonb),glc_private.sync_history(),glc_private.sync_version(uuid) from public,anon;
grant execute on function glc_private.sync_read(text),glc_private.sync_save(text,bigint,jsonb),glc_private.sync_archive(text,jsonb),glc_private.sync_history(),glc_private.sync_version(uuid) to authenticated;
revoke all on function public.glc_sync_read(text),public.glc_sync_save(text,bigint,jsonb),public.glc_sync_archive(text,jsonb),public.glc_sync_history(),public.glc_sync_version(uuid) from public,anon;
grant execute on function public.glc_sync_read(text),public.glc_sync_save(text,bigint,jsonb),public.glc_sync_archive(text,jsonb),public.glc_sync_history(),public.glc_sync_version(uuid) to authenticated;

-- Lightweight polling: transfer full documents only when their revision changes.
create function glc_private.sync_heads() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return coalesce((select jsonb_object_agg(key,revision) from public.saves where user_id=auth.uid()),'{}'::jsonb);
end $$;
create function public.glc_sync_heads() returns jsonb language sql security invoker set search_path='' as $$ select glc_private.sync_heads(); $$;
revoke all on function glc_private.sync_heads(),public.glc_sync_heads() from public,anon;
grant execute on function glc_private.sync_heads(),public.glc_sync_heads() to authenticated;
