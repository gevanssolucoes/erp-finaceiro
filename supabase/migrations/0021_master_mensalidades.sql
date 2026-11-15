-- Portal master: assinatura (plano e mensalidade) de cada cliente, controle de pagamentos e suspensão de acesso.
-- Cliente = grupo de empresas (0018). Tudo aqui é só da conta master; o cliente nunca vê valores nem observações.
-- Também troca a conta master para um login próprio (evaldoalves561+master@gmail.com), separado do login pessoal.
-- Só acrescenta; nada é apagado. Rodar depois da 0020.

-- ===================== 1) Assinatura de cada cliente (grupo)
create table if not exists public.assinaturas (
  grupo_id        uuid primary key references public.grupos(id) on delete cascade,
  situacao        text not null default 'ativo' check (situacao in ('teste','ativo','suspenso','cancelado','interno')),
  plano           text,
  valor           numeric(12,2) not null default 0 check (valor >= 0),
  dia_vencimento  int not null default 10 check (dia_vencimento between 1 and 28),
  inicio_cobranca date,
  responsavel     text,
  email           text,
  telefone        text,
  documento       text,
  obs             text,
  suspenso_em     timestamptz,
  atualizado_em   timestamptz not null default now()
);

create table if not exists public.mensalidades (
  id            uuid primary key default gen_random_uuid(),
  grupo_id      uuid not null references public.grupos(id) on delete cascade,
  competencia   date not null check (extract(day from competencia) = 1),
  vencimento    date not null,
  valor         numeric(12,2) not null check (valor >= 0),
  situacao      text not null default 'aberta' check (situacao in ('aberta','paga','cancelada')),
  pago_em       date,
  valor_pago    numeric(12,2),
  forma         text,
  obs           text,
  registrado_por uuid default auth.uid(),
  criado_em     timestamptz not null default now(),
  unique (grupo_id, competencia)
);
create index if not exists mensalidades_comp_idx on public.mensalidades (competencia);

alter table public.assinaturas enable row level security;
alter table public.mensalidades enable row level security;
drop policy if exists assinaturas_master on public.assinaturas;
create policy assinaturas_master on public.assinaturas for all to authenticated
  using ((select privado.sou_master())) with check ((select privado.sou_master()));
drop policy if exists mensalidades_master on public.mensalidades;
create policy mensalidades_master on public.mensalidades for all to authenticated
  using ((select privado.sou_master())) with check ((select privado.sou_master()));
grant select, insert, update, delete on public.assinaturas, public.mensalidades to authenticated;

-- grupos que já existem são da própria Gevans/Evaldo: "interno", sem cobrança
insert into public.assinaturas (grupo_id, situacao) select id, 'interno' from public.grupos on conflict do nothing;

-- todo grupo novo já nasce com assinatura (em teste, sem valor)
create or replace function privado.nova_assinatura() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.assinaturas (grupo_id, situacao) values (new.id, 'teste') on conflict do nothing;
  return new;
end $$;
drop trigger if exists trg_nova_assinatura on public.grupos;
create trigger trg_nova_assinatura after insert on public.grupos
  for each row execute function privado.nova_assinatura();

create or replace function privado.assinatura_mudou() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_em := now();
  if new.situacao in ('suspenso','cancelado') and old.situacao is distinct from new.situacao then new.suspenso_em := now(); end if;
  if new.situacao not in ('suspenso','cancelado') then new.suspenso_em := null; end if;
  return new;
end $$;
drop trigger if exists trg_assinatura_mudou on public.assinaturas;
create trigger trg_assinatura_mudou before update on public.assinaturas
  for each row execute function privado.assinatura_mudou();

-- ===================== 2) Cliente suspenso ou cancelado não abre as empresas (o master continua vendo tudo)
create or replace function privado.minhas_empresas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.id from public.empresas e where privado.sou_master()
  union
  select ue.empresa_id from public.usuarios_empresas ue
    join public.perfis p on p.usuario_id = ue.usuario_id and p.ativo
    join public.empresas e on e.id = ue.empresa_id
   where ue.usuario_id = (select auth.uid())
     and (select count(distinct e2.grupo_id) from public.usuarios_empresas u2
            join public.empresas e2 on e2.id = u2.empresa_id where u2.usuario_id = ue.usuario_id) <= 1
     and not exists (select 1 from public.assinaturas a
                      where a.grupo_id = e.grupo_id and a.situacao in ('suspenso','cancelado'))
$$;

-- o app pergunta isto para mostrar "acesso suspenso" em vez de "nenhuma empresa"
create or replace function public.meu_acesso_suspenso() returns text
language sql stable security definer set search_path = public as $$
  select a.situacao from public.usuarios_empresas ue
    join public.empresas e on e.id = ue.empresa_id
    join public.assinaturas a on a.grupo_id = e.grupo_id
   where ue.usuario_id = (select auth.uid()) and a.situacao in ('suspenso','cancelado')
   limit 1
$$;
revoke execute on function public.meu_acesso_suspenso() from public, anon;
grant execute on function public.meu_acesso_suspenso() to authenticated;

-- ===================== 3) Gerar as mensalidades do mês para todos os clientes ativos
create or replace function public.gerar_mensalidades(p_competencia date) returns int
language plpgsql security definer set search_path = public as $$
declare v_comp date := date_trunc('month', p_competencia)::date; v_n int;
begin
  if not privado.sou_master() then raise exception 'Somente a conta master'; end if;
  insert into public.mensalidades (grupo_id, competencia, vencimento, valor)
  select a.grupo_id, v_comp, v_comp + (a.dia_vencimento - 1), a.valor
    from public.assinaturas a
   where a.situacao = 'ativo' and a.valor > 0
     and (a.inicio_cobranca is null or date_trunc('month', a.inicio_cobranca) <= v_comp)
  on conflict (grupo_id, competencia) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.gerar_mensalidades(date) from public, anon;
grant execute on function public.gerar_mensalidades(date) to authenticated;

-- ===================== 4) Painel do portal: um resumo por cliente (empresas, usuários, último acesso)
create or replace function public.painel_master() returns table (
  grupo_id uuid, empresas bigint, usuarios bigint, ultimo_acesso timestamptz, admins text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not privado.sou_master() then raise exception 'Somente a conta master'; end if;
  return query
  select g.id,
         (select count(*) from public.empresas e where e.grupo_id = g.id),
         (select count(distinct ue.usuario_id) from public.usuarios_empresas ue
            join public.empresas e on e.id = ue.empresa_id
            join public.perfis p on p.usuario_id = ue.usuario_id and not p.master
           where e.grupo_id = g.id),
         (select max(u.last_sign_in_at) from public.usuarios_empresas ue
            join public.empresas e on e.id = ue.empresa_id
            join public.perfis p on p.usuario_id = ue.usuario_id and not p.master
            join auth.users u on u.id = ue.usuario_id
           where e.grupo_id = g.id),
         (select string_agg(distinct p.email, ', ') from public.usuarios_empresas ue
            join public.empresas e on e.id = ue.empresa_id
            join public.perfis p on p.usuario_id = ue.usuario_id and not p.master
           where e.grupo_id = g.id and ue.papel = 'admin')
    from public.grupos g;
end $$;
revoke execute on function public.painel_master() from public, anon;
grant execute on function public.painel_master() to authenticated;

-- ===================== 5) Conta master com login próprio
-- O login pessoal (evaldoalves561@gmail.com) continua podendo entrar sem convite, mas deixa de nascer master.
create or replace function privado.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_master boolean := lower(new.email) = 'evaldoalves561+master@gmail.com';
  v_convidado boolean := new.invited_at is not null
    or lower(new.email) = 'evaldoalves561@gmail.com'
    or exists (select 1 from public.convites_pendentes c where c.email = lower(new.email));
begin
  if not v_master and not v_convidado then
    raise exception 'Cadastro somente por convite do administrador';
  end if;
  insert into public.perfis (usuario_id, email, nome, master)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), v_master)
  on conflict (usuario_id) do nothing;
  delete from public.convites_pendentes where email = lower(new.email);
  return new;
end $$;
