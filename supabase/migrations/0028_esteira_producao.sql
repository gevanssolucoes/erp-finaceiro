-- Versão 3 · Esteira de produção.
-- Cada pessoa registra o que está fazendo e o andamento (%) das atividades; o supervisor informa o que espera
-- e avalia: "atende" (conclui) ou "não atende" (devolve). Todo usuário da empresa vê e registra na esteira;
-- só o supervisor da atividade ou quem administra a empresa avalia e muda a expectativa.
-- Só acrescenta estruturas. Rodar depois da 0027.

create table if not exists public.atividades (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  departamento_id  uuid references public.departamentos(id) on delete set null,
  titulo           text not null check (length(trim(titulo)) between 1 and 200),
  descricao        text,
  responsavel_id   uuid references auth.users(id) on delete set null,
  responsavel_nome text not null,
  supervisor_id    uuid references auth.users(id) on delete set null,
  supervisor_nome  text,
  prazo            date,
  andamento        int not null default 0 check (andamento between 0 and 100),
  status           text not null default 'a_fazer' check (status in ('a_fazer', 'andamento', 'revisao', 'concluida')),
  expectativa      text,                           -- o que o supervisor espera da entrega
  avaliacao        text check (avaliacao in ('atende', 'nao_atende')),
  avaliacao_texto  text,
  avaliado_em      timestamptz,
  avaliado_por     text,
  criado_por       uuid default auth.uid(),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists idx_atividades_empresa on public.atividades (empresa_id, status);
create index if not exists idx_atividades_resp on public.atividades (responsavel_id);

create table if not exists public.atividades_registros (
  id            uuid primary key default gen_random_uuid(),
  atividade_id  uuid not null references public.atividades(id) on delete cascade,
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  tipo          text not null default 'andamento' check (tipo in ('andamento', 'avaliacao', 'expectativa', 'comentario')),
  andamento     int check (andamento between 0 and 100),
  texto         text,
  autor_id      uuid default auth.uid(),
  autor_nome    text,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_ativ_reg_ativ on public.atividades_registros (atividade_id, criado_em);

-- quem pode avaliar: o supervisor da atividade ou quem edita a empresa (admin/financeiro)
create or replace function privado.esteira_regras() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pode boolean;
begin
  v_pode := (select auth.uid()) is null or (select auth.uid()) = new.supervisor_id or privado.pode_editar(new.empresa_id);
  if tg_op = 'UPDATE' then
    -- limpar a avaliação (nova entrega depois de devolvida) qualquer um pode; dar a avaliação, só o supervisor
    if ((new.avaliacao is distinct from old.avaliacao and new.avaliacao is not null) or new.expectativa is distinct from old.expectativa
        or new.supervisor_id is distinct from old.supervisor_id) and not
       ((select auth.uid()) is null or (select auth.uid()) = old.supervisor_id or privado.pode_editar(old.empresa_id)) then
      raise exception 'Só o supervisor da atividade ou o administrador da empresa avalia e muda o que se espera dela.' using errcode = 'P0001';
    end if;
    if new.empresa_id <> old.empresa_id then raise exception 'A atividade não pode mudar de empresa.' using errcode = 'P0001'; end if;
    if new.avaliacao is distinct from old.avaliacao and new.avaliacao is not null then
      new.avaliado_em := now(); new.avaliado_por := coalesce(privado.nome_usuario(), 'sistema');
      if new.avaliacao = 'atende' then new.status := 'concluida'; new.andamento := 100;
      elsif new.avaliacao = 'nao_atende' then new.status := 'andamento'; new.andamento := least(new.andamento, 90); end if;
    end if;
  elsif new.avaliacao is not null and not v_pode then
    raise exception 'Só o supervisor avalia a atividade.' using errcode = 'P0001';
  end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists atividades_regras on public.atividades;
create trigger atividades_regras before insert or update on public.atividades
  for each row execute function privado.esteira_regras();

alter table public.atividades enable row level security;
alter table public.atividades_registros enable row level security;
create policy atividades_por_empresa on public.atividades for all to authenticated
  using (empresa_id in (select privado.minhas_empresas())) with check (empresa_id in (select privado.minhas_empresas()));
create policy atividades_apaga on public.atividades as restrictive for delete to authenticated
  using (criado_por = (select auth.uid()) or (select privado.pode_editar(empresa_id)));
create policy atividades_registros_por_empresa on public.atividades_registros for select to authenticated
  using (empresa_id in (select privado.minhas_empresas()));
create policy atividades_registros_grava on public.atividades_registros for insert to authenticated
  with check (empresa_id in (select privado.minhas_empresas()) and autor_id = (select auth.uid())
              and exists (select 1 from public.atividades a where a.id = atividade_id and a.empresa_id = atividades_registros.empresa_id));
grant select, insert, update, delete on public.atividades to authenticated;
grant select, insert on public.atividades_registros to authenticated;

-- pessoas da empresa que usam o app (para escolher responsável e supervisor), sem expor e-mail
create or replace function public.pessoas_da_empresa(p_empresa uuid)
returns table (usuario_id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select p.usuario_id, coalesce(nullif(trim(p.nome), ''), split_part(p.email, '@', 1))
    from public.usuarios_empresas ue join public.perfis p on p.usuario_id = ue.usuario_id and p.ativo
   where ue.empresa_id = p_empresa and p_empresa in (select privado.minhas_empresas()) and not coalesce(p.master, false)
   order by 2
$$;
revoke execute on function public.pessoas_da_empresa(uuid) from public, anon;
grant execute on function public.pessoas_da_empresa(uuid) to authenticated;

do $$ begin
  if to_regprocedure('privado.auditar()') is not null then
    drop trigger if exists atividades_trilha on public.atividades;
    create trigger atividades_trilha after insert or update or delete on public.atividades for each row execute function privado.auditar();
  end if;
end $$;
