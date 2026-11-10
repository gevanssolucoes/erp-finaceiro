-- Grupos de empresas: cada empresa pertence a um grupo (o cliente da Gevans).
-- Regra de ouro: quem não é da equipe master nunca enxerga nem é ligado a empresas de outro grupo.
-- Mesmo banco, separação garantida pelo próprio banco (RLS + gatilhos), não pela tela.
-- Só acrescenta; nada é apagado. Rodar depois da 0017.

-- ===================== 1) Tabelas
create table if not exists public.grupos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (length(trim(nome)) between 1 and 120),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- administrador do grupo: entra como administrador em todas as empresas do grupo (atuais e futuras)
create table if not exists public.grupos_admins (
  grupo_id   uuid not null references public.grupos(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);
create index if not exists grupos_admins_usuario_idx on public.grupos_admins (usuario_id);

alter table public.empresas add column if not exists grupo_id uuid references public.grupos(id);
create index if not exists empresas_grupo_idx on public.empresas (grupo_id);

-- ===================== 2) Empresas que já existem: empresas que dividem usuários (fora o master) ficam no mesmo grupo
do $$
declare e record; v_grupo uuid;
begin
  for e in select id, coalesce(nullif(trim(nome_fantasia), ''), razao_social) as nome
             from public.empresas where grupo_id is null order by criado_em, id loop
    continue when (select grupo_id from public.empresas where id = e.id) is not null;
    insert into public.grupos (nome) values (e.nome) returning id into v_grupo;
    with recursive ligadas(id) as (
      select e.id
      union
      select ue2.empresa_id
        from ligadas l
        join public.usuarios_empresas ue1 on ue1.empresa_id = l.id
        join public.perfis p on p.usuario_id = ue1.usuario_id and not p.master
        join public.usuarios_empresas ue2 on ue2.usuario_id = ue1.usuario_id
    )
    update public.empresas set grupo_id = v_grupo where id in (select id from ligadas) and grupo_id is null;
  end loop;
end $$;

-- ===================== 3) Funções de apoio
create or replace function privado.grupo_da_empresa(p_empresa uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select grupo_id from public.empresas where id = p_empresa
$$;

create or replace function privado.eh_master(p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select master from public.perfis where usuario_id = p_usuario), false)
$$;

-- grupos que eu administro
create or replace function privado.meus_grupos_admin() returns setof uuid
language sql stable security definer set search_path = public as $$
  select ga.grupo_id from public.grupos_admins ga
    join public.perfis p on p.usuario_id = ga.usuario_id and p.ativo
   where ga.usuario_id = (select auth.uid())
$$;

create or replace function privado.sou_admin_grupo(p_grupo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select privado.sou_master() or p_grupo in (select privado.meus_grupos_admin())
$$;

-- grupos que eu enxergo (das minhas empresas ou que administro)
create or replace function privado.meus_grupos() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.grupo_id from public.empresas e where e.id in (select privado.minhas_empresas())
  union
  select privado.meus_grupos_admin()
$$;

-- Mesma regra de antes (master vê tudo; inativo não vê nada) e, por segurança, nunca devolve
-- empresa de um grupo diferente do grupo da pessoa, mesmo que um vínculo errado tenha sido gravado.
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
$$;

revoke execute on function privado.grupo_da_empresa(uuid) from public, anon;
revoke execute on function privado.eh_master(uuid) from public, anon, authenticated;
revoke execute on function privado.meus_grupos_admin() from public, anon;
revoke execute on function privado.sou_admin_grupo(uuid) from public, anon;
revoke execute on function privado.meus_grupos() from public, anon;
grant execute on function privado.grupo_da_empresa(uuid) to authenticated;
grant execute on function privado.meus_grupos_admin() to authenticated;
grant execute on function privado.sou_admin_grupo(uuid) to authenticated;
grant execute on function privado.meus_grupos() to authenticated;
grant execute on function privado.minhas_empresas() to authenticated;

-- ===================== 4) Travas: uma pessoa (fora o master) só pertence a um grupo
create or replace function privado.trava_grupo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_grupo uuid;
begin
  if privado.eh_master(new.usuario_id) then return new; end if;
  if tg_table_name = 'usuarios_empresas' then
    v_grupo := privado.grupo_da_empresa(new.empresa_id);
  else
    v_grupo := new.grupo_id;
  end if;
  if exists (select 1 from public.usuarios_empresas ue join public.empresas e on e.id = ue.empresa_id
              where ue.usuario_id = new.usuario_id and e.grupo_id is distinct from v_grupo)
     or exists (select 1 from public.grupos_admins ga
                 where ga.usuario_id = new.usuario_id and ga.grupo_id is distinct from v_grupo) then
    raise exception 'Esta pessoa já usa o app em outro grupo de empresas. Cada usuário só pode acessar empresas do mesmo grupo.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function privado.trava_grupo_usuario() from public, anon, authenticated;

drop trigger if exists usuarios_empresas_grupo on public.usuarios_empresas;
create trigger usuarios_empresas_grupo before insert or update of usuario_id, empresa_id on public.usuarios_empresas
  for each row execute function privado.trava_grupo_usuario();
drop trigger if exists grupos_admins_grupo on public.grupos_admins;
create trigger grupos_admins_grupo before insert or update on public.grupos_admins
  for each row execute function privado.trava_grupo_usuario();

-- novo administrador do grupo: vira administrador de todas as empresas do grupo
create or replace function privado.grupo_admin_liga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios_empresas (usuario_id, empresa_id, papel)
    select new.usuario_id, e.id, 'admin' from public.empresas e where e.grupo_id = new.grupo_id
  on conflict (usuario_id, empresa_id) do update set papel = 'admin';
  return new;
end $$;
revoke execute on function privado.grupo_admin_liga() from public, anon, authenticated;
drop trigger if exists grupos_admins_liga on public.grupos_admins;
create trigger grupos_admins_liga after insert on public.grupos_admins
  for each row execute function privado.grupo_admin_liga();

-- empresa nova sem grupo ganha um grupo com o próprio nome; os administradores do grupo entram nela
create or replace function privado.empresa_grupo_padrao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.grupo_id is null then
    insert into public.grupos (nome) values (coalesce(nullif(trim(new.nome_fantasia), ''), new.razao_social))
      returning id into new.grupo_id;
  end if;
  return new;
end $$;
create or replace function privado.empresa_grupo_liga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios_empresas (usuario_id, empresa_id, papel)
    select ga.usuario_id, new.id, 'admin' from public.grupos_admins ga where ga.grupo_id = new.grupo_id
  on conflict (usuario_id, empresa_id) do update set papel = 'admin';
  return new;
end $$;
revoke execute on function privado.empresa_grupo_padrao() from public, anon, authenticated;
revoke execute on function privado.empresa_grupo_liga() from public, anon, authenticated;
drop trigger if exists empresas_grupo_padrao on public.empresas;
create trigger empresas_grupo_padrao before insert on public.empresas
  for each row execute function privado.empresa_grupo_padrao();
drop trigger if exists empresas_grupo_liga on public.empresas;
create trigger empresas_grupo_liga after insert on public.empresas
  for each row execute function privado.empresa_grupo_liga();

-- trocar a empresa de grupo: só o master, e só se ninguém da empresa (fora o master) usa outra empresa do grupo antigo
create or replace function privado.empresa_troca_grupo() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.grupo_id is not distinct from old.grupo_id then return new; end if;
  if new.grupo_id is null then raise exception 'A empresa precisa de um grupo.'; end if;
  if not privado.sou_master() then raise exception 'Somente a conta master muda a empresa de grupo.'; end if;
  -- administradores do grupo antigo saem da empresa; os do grupo novo entram
  delete from public.usuarios_empresas ue using public.grupos_admins ga
   where ga.grupo_id = old.grupo_id and ga.usuario_id = ue.usuario_id and ue.empresa_id = new.id
     and not privado.eh_master(ue.usuario_id);
  select count(distinct ue.usuario_id) into n
    from public.usuarios_empresas ue
    join public.usuarios_empresas outra on outra.usuario_id = ue.usuario_id and outra.empresa_id <> new.id
    join public.empresas e on e.id = outra.empresa_id and e.grupo_id is distinct from new.grupo_id
   where ue.empresa_id = new.id and not privado.eh_master(ue.usuario_id);
  if n > 0 then
    raise exception '% usuário(s) desta empresa também usam outras empresas do grupo antigo. Tire esses acessos antes de mudar o grupo.', n;
  end if;
  return new;
end $$;
revoke execute on function privado.empresa_troca_grupo() from public, anon, authenticated;
drop trigger if exists empresas_troca_grupo on public.empresas;
create trigger empresas_troca_grupo before update of grupo_id on public.empresas
  for each row execute function privado.empresa_troca_grupo();
-- depois da troca, os administradores do grupo novo entram na empresa (mesma função da empresa nova)
drop trigger if exists empresas_grupo_liga_troca on public.empresas;
create trigger empresas_grupo_liga_troca after update of grupo_id on public.empresas
  for each row when (new.grupo_id is distinct from old.grupo_id) execute function privado.empresa_grupo_liga();

-- depois do preenchimento, toda empresa tem grupo
alter table public.empresas alter column grupo_id set not null;

-- ===================== 5) Quem vê e quem altera
alter table public.grupos enable row level security;
alter table public.grupos_admins enable row level security;

drop policy if exists grupos_leitura on public.grupos;
create policy grupos_leitura on public.grupos for select to authenticated
  using (id in (select privado.meus_grupos()));
drop policy if exists grupos_master on public.grupos;
create policy grupos_master on public.grupos for all to authenticated
  using ((select privado.sou_master())) with check ((select privado.sou_master()));
-- o administrador do grupo pode renomear o próprio grupo
drop policy if exists grupos_admin_renomeia on public.grupos;
create policy grupos_admin_renomeia on public.grupos for update to authenticated
  using (id in (select privado.meus_grupos_admin())) with check (id in (select privado.meus_grupos_admin()));

drop policy if exists grupos_admins_leitura on public.grupos_admins;
create policy grupos_admins_leitura on public.grupos_admins for select to authenticated
  using (usuario_id = (select auth.uid()) or (select privado.sou_admin_grupo(grupo_id)));
drop policy if exists grupos_admins_master on public.grupos_admins;
create policy grupos_admins_master on public.grupos_admins for all to authenticated
  using ((select privado.sou_master())) with check ((select privado.sou_master()));

grant select, insert, update, delete on public.grupos, public.grupos_admins to authenticated;

-- ===================== 6) Nova empresa: o master escolhe o grupo; o administrador do grupo cria dentro do grupo dele
drop function if exists public.criar_empresa(text, text, text, text, text, text, text, uuid);
create or replace function public.criar_empresa(
  p_cnpj text, p_razao_social text, p_nome_fantasia text default null,
  p_tipo text default 'pj', p_regime text default null, p_atividade text default null,
  p_cor text default null, p_copiar_de uuid default null, p_grupo uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tipo text := coalesce(p_tipo, 'pj'); v_grupo uuid := p_grupo; v_master boolean := privado.sou_master();
begin
  if not v_master then
    if v_grupo is null and (select count(*) from privado.meus_grupos_admin()) = 1 then
      select g into v_grupo from privado.meus_grupos_admin() g;
    end if;
    if v_grupo is null or not privado.sou_admin_grupo(v_grupo) then
      raise exception 'Somente a conta master ou o administrador do grupo pode criar empresas';
    end if;
  end if;
  if v_grupo is not null and not exists (select 1 from public.grupos where id = v_grupo) then
    raise exception 'Grupo não encontrado';
  end if;
  if p_copiar_de is not null and not v_master and privado.grupo_da_empresa(p_copiar_de) is distinct from v_grupo then
    raise exception 'Só dá para copiar o plano de uma empresa do mesmo grupo';
  end if;
  if v_tipo = 'pj' and length(p_cnpj) <> 14 then raise exception 'O CNPJ precisa ter 14 dígitos'; end if;
  if v_tipo = 'pf' and length(p_cnpj) not in (11, 14) then raise exception 'O CPF precisa ter 11 dígitos'; end if;
  insert into empresas (cnpj, razao_social, nome_fantasia, tipo_pessoa, regime_tributario, atividade, cor, grupo_id)
    values (p_cnpj, p_razao_social, nullif(trim(p_nome_fantasia), ''), v_tipo,
            case when v_tipo = 'pj' then p_regime end, case when v_tipo = 'pj' then p_atividade end, p_cor, v_grupo)
    returning id into v_id;
  insert into usuarios_empresas (usuario_id, empresa_id, papel) values (auth.uid(), v_id, 'admin')
    on conflict (usuario_id, empresa_id) do update set papel = 'admin';
  if p_copiar_de is not null then
    perform privado.copiar_plano_de(v_id, p_copiar_de);
  else
    perform privado.copiar_plano_padrao(v_id, v_tipo);
  end if;
  return v_id;
end $$;
revoke execute on function public.criar_empresa(text, text, text, text, text, text, text, uuid, uuid) from public, anon;
grant execute on function public.criar_empresa(text, text, text, text, text, text, text, uuid, uuid) to authenticated;

-- ===================== 7) Verificação de isolamento (só o master): procura qualquer cruzamento entre grupos
create or replace function public.verificar_isolamento()
returns table (nivel text, tipo text, tabela text, quantidade bigint, detalhe text)
language plpgsql security definer set search_path = public as $$
declare r record; n_grupo bigint; n_emp bigint;
begin
  if not privado.sou_master() then raise exception 'Somente a conta master'; end if;

  -- pessoas ligadas a mais de um grupo
  return query
    select 'grave'::text, 'usuario_em_dois_grupos'::text, 'usuarios_empresas'::text, count(*)::bigint,
           string_agg(x.email, ', ')
      from (select p.email from public.usuarios_empresas ue
              join public.empresas e on e.id = ue.empresa_id
              join public.perfis p on p.usuario_id = ue.usuario_id and not p.master
             group by p.email having count(distinct e.grupo_id) > 1) x
    having count(*) > 0;

  -- registros que apontam para cadastro de outra empresa (ex.: lançamento usando conta bancária de outra empresa)
  for r in
    select c.conrelid::regclass as filha, a.attname as col, c.confrelid::regclass as mae, af.attname as pcol
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
     where c.contype = 'f' and array_length(c.conkey, 1) = 1
       and c.connamespace = 'public'::regnamespace
       and c.confrelid <> 'public.empresas'::regclass
       and exists (select 1 from pg_attribute x where x.attrelid = c.conrelid and x.attname = 'empresa_id' and not x.attisdropped)
       and exists (select 1 from pg_attribute x where x.attrelid = c.confrelid and x.attname = 'empresa_id' and not x.attisdropped)
  loop
    execute format(
      'select count(*) filter (where ep.grupo_id <> et.grupo_id), count(*) filter (where p.empresa_id <> t.empresa_id and ep.grupo_id = et.grupo_id)
         from %s t join %s p on p.%I = t.%I
         join public.empresas et on et.id = t.empresa_id join public.empresas ep on ep.id = p.empresa_id',
      r.filha, r.mae, r.pcol, r.col) into n_grupo, n_emp;
    if n_grupo > 0 then
      return query select 'grave'::text, 'referencia_outro_grupo'::text, r.filha::text, n_grupo, format('%s → %s', r.col, r.mae);
    end if;
    if n_emp > 0 then
      return query select 'aviso'::text, 'referencia_outra_empresa'::text, r.filha::text, n_emp, format('%s → %s', r.col, r.mae);
    end if;
  end loop;
end $$;
revoke execute on function public.verificar_isolamento() from public, anon;
grant execute on function public.verificar_isolamento() to authenticated;
