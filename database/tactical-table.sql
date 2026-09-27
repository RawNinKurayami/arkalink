-- Local release script. Apply once, with the frontend release; existing tables/data are unchanged.
-- Public rooms contain only a sanitized active-scene projection. Private scenes stay in owner saves.
begin;
create schema if not exists glc_tactical_private;
revoke all on schema glc_tactical_private from public,anon,authenticated;
create table public.tactical_rooms (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 active boolean not null default false, revision bigint not null default 1,
 payload jsonb, updated_at timestamptz not null default now(), expires_at timestamptz not null default now()
);
alter table public.tactical_rooms enable row level security;
revoke all on public.tactical_rooms from public,anon,authenticated;
grant select,insert,update,delete on public.tactical_rooms to authenticated;
create index tactical_rooms_campaign on public.tactical_rooms(campaign_id);
create policy tactical_room_read on public.tactical_rooms for select to authenticated using (
 owner_id=(select auth.uid()) or (active and expires_at>now() and exists(select 1 from public.campaign_members m where m.campaign_id=tactical_rooms.campaign_id and m.user_id=(select auth.uid())))
);
create policy tactical_room_create on public.tactical_rooms for insert to authenticated with check (
 owner_id=(select auth.uid()) and exists(select 1 from public.campaigns c where c.id=campaign_id and c.gm=(select auth.uid()))
);
create policy tactical_room_update on public.tactical_rooms for update to authenticated using (
 owner_id=(select auth.uid()) and exists(select 1 from public.campaigns c where c.id=campaign_id and c.gm=(select auth.uid()))
) with check (owner_id=(select auth.uid()) and exists(select 1 from public.campaigns c where c.id=campaign_id and c.gm=(select auth.uid())));
create policy tactical_room_delete on public.tactical_rooms for delete to authenticated using (owner_id=(select auth.uid()));

create function glc_tactical_private.asset_ref(v text) returns text language sql immutable set search_path='' as $$
 select case when v ~ '^asset:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then v else '' end
$$;
create function glc_tactical_private.public_scene(p jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare t jsonb; pieces jsonb='[]'; cols integer; rows integer; sz integer; begin
 if p is null or jsonb_typeof(p)<>'object' or p->>'v'<>'1' or jsonb_typeof(p->'tokens')<>'array' then raise exception 'Invalid scene'; end if;
 cols=greatest(6,least(100,(p->>'cols')::integer)); rows=greatest(6,least(100,(p->>'rows')::integer));
 if cols is null or rows is null or jsonb_array_length(p->'tokens')>100 then raise exception 'Invalid scene dimensions'; end if;
 for t in select value from jsonb_array_elements(p->'tokens') loop
  -- Defense in depth: a caller cannot publish a hidden token or arbitrary private fields.
  if t->'visible'='false'::jsonb then continue; end if;
  sz=greatest(1,least(6,coalesce((t->>'size')::integer,1)));
  pieces=pieces||jsonb_build_array(jsonb_build_object('id',left(coalesce(t->>'id',''),100),'label',left(coalesce(t->>'label','Pedina'),60),
    'side',case when t->>'side' in ('pc','ally') then t->>'side' else 'enemy' end,
    'x',greatest(0,least(cols-sz,coalesce((t->>'x')::integer,0))),
    'y',greatest(0,least(rows-sz,coalesce((t->>'y')::integer,0))), 'size',sz,'image',glc_tactical_private.asset_ref(t->>'image')));
 end loop;
 return jsonb_build_object('v',1,'name',left(coalesce(p->>'name','Scena'),100),'cols',cols,'rows',rows,
 'background',glc_tactical_private.asset_ref(p->>'background'),'backgroundScale',greatest(.1,least(5,coalesce((p->>'backgroundScale')::numeric,1))),
 'backgroundX',greatest(-100,least(100,coalesce((p->>'backgroundX')::numeric,0))),
 'backgroundY',greatest(-100,least(100,coalesce((p->>'backgroundY')::numeric,0))),
 'gridOpacity',greatest(0,least(.7,coalesce((p->>'gridOpacity')::numeric,.25))),'tokens',pieces);
end $$;
create function glc_tactical_private.guard_room() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id<>auth.uid() then raise exception 'Not authorized'; end if;
 if tg_op='UPDATE' then
  if new.owner_id<>old.owner_id or new.id<>old.id or new.campaign_id<>old.campaign_id then raise exception 'Room identity is immutable'; end if;
  if new.revision<>old.revision+1 then raise exception 'Stale room revision'; end if;
 else new.revision=1; end if;
 new.payload=case when new.active then glc_tactical_private.public_scene(new.payload) else null end;
 new.updated_at=clock_timestamp();new.expires_at=case when new.active then clock_timestamp()+interval '45 seconds' else clock_timestamp() end;
 return new;
end $$;
revoke all on function glc_tactical_private.asset_ref(text),glc_tactical_private.public_scene(jsonb),glc_tactical_private.guard_room() from public,anon,authenticated;
create trigger guard_tactical_room before insert or update on public.tactical_rooms for each row execute function glc_tactical_private.guard_room();

create table public.tactical_assets (
 id uuid primary key, room_id uuid not null references public.tactical_rooms(id) on delete cascade,
 data_uri text not null check (length(data_uri)<=3500000 and data_uri ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')
);
create index tactical_assets_room on public.tactical_assets(room_id);
alter table public.tactical_assets enable row level security;
revoke all on public.tactical_assets from public,anon,authenticated;
grant select,insert,delete on public.tactical_assets to authenticated;
create policy tactical_asset_read on public.tactical_assets for select to authenticated using (
 exists(select 1 from public.tactical_rooms r where r.id=room_id and (
 r.owner_id=(select auth.uid()) or (r.active and r.expires_at>now() and
 (r.payload->>'background'='asset:'||tactical_assets.id::text or exists(select 1 from jsonb_array_elements(r.payload->'tokens') t where t->>'image'='asset:'||tactical_assets.id::text))))
 )
);
create policy tactical_asset_create on public.tactical_assets for insert to authenticated with check (
 exists(select 1 from public.tactical_rooms r join public.campaigns c on c.id=r.campaign_id where r.id=room_id and r.owner_id=(select auth.uid()) and c.gm=(select auth.uid()))
);
create policy tactical_asset_delete on public.tactical_assets for delete to authenticated using (
 exists(select 1 from public.tactical_rooms r where r.id=room_id and r.owner_id=(select auth.uid())
 and coalesce(r.payload->>'background','')<>'asset:'||tactical_assets.id::text
 and not exists(select 1 from jsonb_array_elements(coalesce(r.payload->'tokens','[]')) t where t->>'image'='asset:'||tactical_assets.id::text))
);
commit;
