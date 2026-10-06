-- =====================================================
-- Escritos — migración: perfil público completo
-- Pégalo en: Supabase > SQL Editor > New query > Run
-- Se puede ejecutar más de una vez (todo es "if not exists").
-- =====================================================

-- 1) Nuevos campos del perfil público (el correo NO está en esta tabla).
alter table public.perfiles
  add column if not exists biografia   text not null default '',
  add column if not exists ubicacion   text not null default '',
  add column if not exists enlace      text not null default '',
  add column if not exists avatar_url  text not null default '',
  add column if not exists actualizado timestamptz not null default now();

-- 2) Permisos: el dueño puede crear su perfil (el trigger de alta no cubre
--    a los usuarios creados antes de existir la tabla).
grant select on public.perfiles to anon, authenticated;
grant insert, update on public.perfiles to authenticated;
grant all on public.perfiles to service_role;

-- 3) RLS: cada quien crea/edita solo el suyo; todos pueden leer el público.
alter table public.perfiles enable row level security;

drop policy if exists "Perfiles visibles para todos" on public.perfiles;
create policy "Perfiles visibles para todos"
  on public.perfiles for select to anon, authenticated using (true);

drop policy if exists "Cada uno crea su perfil" on public.perfiles;
create policy "Cada uno crea su perfil"
  on public.perfiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Cada uno edita su perfil" on public.perfiles;
create policy "Cada uno edita su perfil"
  on public.perfiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- 4) OPCIONAL — deja de usar el prefijo del correo como nombre público.
--    Solo afecta a perfiles cuyo nombre es exactamente "algo@loquesea" sin @,
--    es decir, los creados automáticamente con el correo.
update public.perfiles p
set nombre = ''
from auth.users u
where u.id = p.id
  and u.email is not null
  and p.nombre = split_part(u.email, '@', 1);
