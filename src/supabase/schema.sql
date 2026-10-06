-- =====================================================
-- Escritos — esquema para Supabase
-- Copia todo este archivo y pégalo en: Supabase > SQL Editor > New query > Run
-- =====================================================

create table if not exists public.escritos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  titulo        text not null default '',
  subtitulo     text not null default '',
  contenido     text not null default '',          -- HTML con formato (títulos, citas, resaltado…)
  fuente        text not null default 'newsreader',
  etiquetas     text[] not null default '{}',
  estado        text not null default 'borrador' check (estado in ('borrador','publicado')),
  autor         text not null default '',
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now(),
  publicado_en  timestamptz
);

create index if not exists escritos_estado_idx on public.escritos (estado, actualizado desc);
create index if not exists escritos_user_idx on public.escritos (user_id);

-- Permisos de acceso a la API
grant select on public.escritos to anon;
grant select, insert, update, delete on public.escritos to authenticated;
grant all on public.escritos to service_role;

-- Seguridad por filas
alter table public.escritos enable row level security;

drop policy if exists "Cualquiera lee obras publicadas" on public.escritos;
create policy "Cualquiera lee obras publicadas"
  on public.escritos for select
  to anon, authenticated
  using (estado = 'publicado');

drop policy if exists "El autor lee sus escritos" on public.escritos;
create policy "El autor lee sus escritos"
  on public.escritos for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "El autor crea" on public.escritos;
create policy "El autor crea"
  on public.escritos for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "El autor edita" on public.escritos;
create policy "El autor edita"
  on public.escritos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "El autor borra" on public.escritos;
create policy "El autor borra"
  on public.escritos for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================
-- Perfiles de escritores (nombre de autor público)
-- =====================================================
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default '',
  creado      timestamptz not null default now()
);

grant select on public.perfiles to anon, authenticated;
grant update on public.perfiles to authenticated;
grant all on public.perfiles to service_role;

alter table public.perfiles enable row level security;

drop policy if exists "Perfiles visibles para todos" on public.perfiles;
create policy "Perfiles visibles para todos"
  on public.perfiles for select to anon, authenticated using (true);

drop policy if exists "Cada uno edita su perfil" on public.perfiles;
create policy "Cada uno edita su perfil"
  on public.perfiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Crea el perfil automáticamente al registrarse
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse after insert on auth.users
  for each row execute function public.crear_perfil();
