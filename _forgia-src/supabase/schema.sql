create table public.forge_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null check(revision>0),
 content jsonb not null check(jsonb_typeof(content->'boards')='array'),
 updated_at timestamptz not null default now()
);
alter table public.forge_workspaces enable row level security;
revoke all on public.forge_workspaces from anon, authenticated;
grant select,insert,update on public.forge_workspaces to authenticated;
create policy forge_read_own on public.forge_workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy forge_insert_own on public.forge_workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy forge_update_own on public.forge_workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create function public.save_forge_workspace(expected_revision bigint, payload jsonb) returns bigint
 language plpgsql security invoker set search_path='' as $$
declare result_revision bigint; owner uuid := auth.uid();
begin
 if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if expected_revision is null or expected_revision<0 or payload is null or jsonb_typeof(payload->'boards') is distinct from 'array' then
  raise exception 'Invalid workspace' using errcode='22023';
 end if;
 if octet_length(payload::text)>10000000 or jsonb_array_length(payload->'boards')>100 then
  raise exception 'Workspace too large' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(payload->'boards') b where jsonb_typeof(b->'id') is distinct from 'string' or jsonb_typeof(b->'name') is distinct from 'string' or jsonb_typeof(b->'nodes') is distinct from 'array' or jsonb_typeof(b->'edges') is distinct from 'array') then
  raise exception 'Invalid character' using errcode='22023';
 end if;
 if expected_revision=0 then
  insert into public.forge_workspaces(user_id,revision,content) values(owner,1,payload)
   on conflict(user_id) do nothing returning revision into result_revision;
 else
  update public.forge_workspaces set content=payload,revision=revision+1,updated_at=now()
   where user_id=owner and revision=expected_revision returning revision into result_revision;
 end if;
 if result_revision is null then raise exception 'Workspace changed on another device' using errcode='PT409'; end if;
 return result_revision;
end $$;
revoke all on function public.save_forge_workspace(bigint,jsonb) from public,anon;
grant execute on function public.save_forge_workspace(bigint,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('forge-private','forge-private',false,8388608,array['application/octet-stream','application/json','image/png','image/jpeg','image/webp','image/gif','model/gltf-binary','model/stl']);
create policy forge_files_read on storage.objects for select to authenticated
 using(bucket_id='forge-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy forge_files_insert on storage.objects for insert to authenticated
 with check(bucket_id='forge-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy forge_files_delete on storage.objects for delete to authenticated
 using(bucket_id='forge-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
