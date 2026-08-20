-- Track Viewer — schema para Neon (Data API + Neon Auth)
-- Pré-requisitos no console do Neon (uma vez):
--   1. Habilitar o Data API no branch (aba "Data API") — isso instala pg_session_jwt
--      e cria os roles `authenticated` / `anonymous`.
--   2. Habilitar o Neon Auth (aba "Auth") e criar o usuário único (desabilitar sign-up).
-- Depois rode este arquivo inteiro no SQL Editor.

create table if not exists folders (
  id uuid primary key,
  user_id text not null default (auth.user_id()),
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  visible boolean not null default true,
  expanded boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracks (
  id uuid primary key,
  user_id text not null default (auth.user_id()),
  folder_id uuid references folders(id) on delete set null,
  name text not null,
  color text not null,
  visible boolean not null default true,
  distance_m double precision not null default 0,
  gain_m double precision not null default 0,
  bbox jsonb not null,
  profile jsonb not null default '[]',
  geometry jsonb not null,
  file_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tracks_user_hash on tracks (user_id, file_hash);

create table if not exists points (
  id uuid primary key,
  user_id text not null default (auth.user_id()),
  track_id uuid references tracks(id) on delete cascade,
  category text not null check (category in ('agua','cidade','park','pin')),
  pin_color text,
  name text not null,
  notes text not null default '',
  lat double precision not null,
  lng double precision not null,
  visible boolean not null default true,
  comments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GPX originais preservados (RF-17/RNF-08): gzip + base64 do arquivo
create table if not exists gpx_files (
  user_id text not null default (auth.user_id()),
  hash text not null,
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, hash)
);

-- updated_at automático
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists folders_updated on folders;
create trigger folders_updated before update on folders for each row execute function set_updated_at();
drop trigger if exists tracks_updated on tracks;
create trigger tracks_updated before update on tracks for each row execute function set_updated_at();
drop trigger if exists points_updated on points;
create trigger points_updated before update on points for each row execute function set_updated_at();

-- RLS: somente o dono lê/escreve (RF-33)
alter table folders enable row level security;
alter table tracks enable row level security;
alter table points enable row level security;
alter table gpx_files enable row level security;

drop policy if exists folders_own on folders;
create policy folders_own on folders for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
drop policy if exists tracks_own on tracks;
create policy tracks_own on tracks for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
drop policy if exists points_own on points;
create policy points_own on points for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
drop policy if exists gpx_files_own on gpx_files;
create policy gpx_files_own on gpx_files for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());

grant usage on schema public to authenticated;
grant select, insert, update, delete on folders, tracks, points, gpx_files to authenticated;
