-- Repertório Fácil - ajuste da tabela musicas
create table if not exists public.musicas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome text not null,
  artista text,
  tom text,
  tom_banda text,
  bpm integer,
  youtube_url text,
  spotify_url text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.musicas add column if not exists projeto_id uuid references public.projetos(id) on delete cascade;
alter table public.musicas add column if not exists nome text;
alter table public.musicas add column if not exists artista text;
alter table public.musicas add column if not exists tom text;
alter table public.musicas add column if not exists tom_banda text;
alter table public.musicas add column if not exists bpm integer;
alter table public.musicas add column if not exists youtube_url text;
alter table public.musicas add column if not exists spotify_url text;
alter table public.musicas add column if not exists observacoes text;
alter table public.musicas add column if not exists created_at timestamptz default now();
alter table public.musicas add column if not exists updated_at timestamptz default now();

alter table public.musicas enable row level security;

drop policy if exists "Usuário pode ver músicas dos seus projetos" on public.musicas;
create policy "Usuário pode ver músicas dos seus projetos"
on public.musicas
for select
using (
  exists (
    select 1 from public.projetos
    where projetos.id = musicas.projeto_id
    and projetos.usuario_id = auth.uid()
  )
);

drop policy if exists "Usuário pode inserir músicas nos seus projetos" on public.musicas;
create policy "Usuário pode inserir músicas nos seus projetos"
on public.musicas
for insert
with check (
  exists (
    select 1 from public.projetos
    where projetos.id = musicas.projeto_id
    and projetos.usuario_id = auth.uid()
  )
);

drop policy if exists "Usuário pode editar músicas dos seus projetos" on public.musicas;
create policy "Usuário pode editar músicas dos seus projetos"
on public.musicas
for update
using (
  exists (
    select 1 from public.projetos
    where projetos.id = musicas.projeto_id
    and projetos.usuario_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projetos
    where projetos.id = musicas.projeto_id
    and projetos.usuario_id = auth.uid()
  )
);

drop policy if exists "Usuário pode excluir músicas dos seus projetos" on public.musicas;
create policy "Usuário pode excluir músicas dos seus projetos"
on public.musicas
for delete
using (
  exists (
    select 1 from public.projetos
    where projetos.id = musicas.projeto_id
    and projetos.usuario_id = auth.uid()
  )
);
