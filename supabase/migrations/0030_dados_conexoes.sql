-- Gevans Dados · obter e entregar dados (plano "Somente modelagem de dados").
-- 1) Bases enviadas pelo cliente (Excel, CSV, PDF, link de API ou banco SQL) ficam guardadas na empresa dele.
-- 2) Visões de BI (schema bi) juntam o que está no app (lançamentos, parcelas, orçamento) com essas bases.
-- 3) Saída por API com chave por empresa (função api_extrair, usada pela Edge Function dados-api)
--    e por acesso SQL só de leitura (um login por empresa), para Power BI, Excel e outros.
-- Isolamento: cada leitura passa pela lista de empresas permitidas; uma chave ou login enxerga só a própria empresa.
-- Quem cria e revoga chaves e logins é o admin da empresa, pelo app (regra do master: não faz manutenção).
-- Só acrescenta; nada é apagado. Rodar depois da 0029.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists bi;

-- ===================== 1) Bases enviadas
create table if not exists public.dados_bases (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 120),
  origem        text not null default 'excel' check (origem in ('excel','csv','pdf','web','sql','manual')),
  detalhe       text,                       -- nome do arquivo, link ou servidor (nunca senha)
  linhas        int not null default 0,
  criado_por    uuid default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

create table if not exists public.dados_linhas (
  id           bigint generated always as identity primary key,
  base_id      uuid not null references public.dados_bases(id) on delete cascade,
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  tipo         text not null check (tipo in ('orcado','realizado')),
  competencia  date not null check (extract(day from competencia) = 1),
  data_caixa   date,                        -- vazio: o caixa segue a competência (dia 15)
  conta_codigo text,
  conta_nome   text not null,
  grupo_dre    text,
  valor        numeric(14,2) not null,      -- receita positiva, despesa negativa
  unidade      text
);
create index if not exists dados_linhas_base_idx on public.dados_linhas (base_id);
create index if not exists dados_linhas_emp_idx on public.dados_linhas (empresa_id, competencia);

alter table public.dados_bases enable row level security;
alter table public.dados_linhas enable row level security;
do $$ declare t text; begin
  foreach t in array array['dados_bases','dados_linhas'] loop
    execute format('drop policy if exists %1$s_ve on public.%1$s', t);
    execute format('create policy %1$s_ve on public.%1$s for select to authenticated using (empresa_id in (select privado.minhas_empresas()))', t);
    execute format('drop policy if exists %1$s_grava on public.%1$s', t);
    execute format('create policy %1$s_grava on public.%1$s for insert to authenticated with check (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id))', t);
    execute format('drop policy if exists %1$s_altera on public.%1$s', t);
    execute format('create policy %1$s_altera on public.%1$s for update to authenticated using (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id)) with check (privado.pode_editar(empresa_id))', t);
    execute format('drop policy if exists %1$s_apaga on public.%1$s', t);
    execute format('create policy %1$s_apaga on public.%1$s for delete to authenticated using (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id))', t);
  end loop;
end $$;
grant select, insert, update, delete on public.dados_bases, public.dados_linhas to authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'dados_bases_trilha') then
    create trigger dados_bases_trilha after insert or update or delete on public.dados_bases for each row execute function privado.auditar();
  end if;
end $$;

-- ===================== 2) Chaves de API e logins SQL
create table if not exists public.acessos_dados (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  tipo        text not null check (tipo in ('api','sql')),
  nome        text not null check (length(trim(nome)) between 1 and 80),
  prefixo     text,                         -- começo da chave, para reconhecer (api)
  hash        text unique,                  -- sha-256 da chave; a chave em si nunca é guardada (api)
  papel       text unique,                  -- nome do login no banco (sql)
  criado_por  uuid default auth.uid(),
  criado_em   timestamptz not null default now(),
  ultimo_uso  timestamptz,
  usos        bigint not null default 0,
  revogado_em timestamptz
);
alter table public.acessos_dados enable row level security;
drop policy if exists acessos_dados_ve on public.acessos_dados;
create policy acessos_dados_ve on public.acessos_dados for select to authenticated using (empresa_id in (select privado.minhas_empresas()));
revoke all on public.acessos_dados from anon, authenticated;
grant select (id, empresa_id, tipo, nome, prefixo, papel, criado_por, criado_em, ultimo_uso, usos, revogado_em) on public.acessos_dados to authenticated;

create or replace function privado.sou_admin_empresa(p_empresa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios_empresas ue join public.perfis p on p.usuario_id = ue.usuario_id and p.ativo
                  where ue.usuario_id = (select auth.uid()) and ue.empresa_id = p_empresa and ue.papel = 'admin')
$$;
revoke execute on function privado.sou_admin_empresa(uuid) from public, anon;
grant execute on function privado.sou_admin_empresa(uuid) to authenticated;

-- Empresas que a sessão pode ler nas visões bi: login SQL de BI → a empresa dele; usuário do app → as dele
create or replace function privado.bi_empresas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select a.empresa_id from public.acessos_dados a where a.tipo = 'sql' and a.papel = session_user and a.revogado_em is null
  union
  select privado.minhas_empresas() where (select auth.uid()) is not null
$$;

-- ===================== 3) Leituras (uma função por recurso, sempre com a lista de empresas)
create or replace function privado.bi_empresas_lista(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, empresa text, cnpj text)
language sql stable security definer set search_path = public as $$
  select e.id, coalesce(e.nome_fantasia, e.razao_social), e.cnpj from public.empresas e where e.id = any(p)
$$;

create or replace function privado.bi_contas(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, conta_id uuid, codigo text, nome text, tipo text, grupo_dre text, analitica boolean, ativa boolean)
language sql stable security definer set search_path = public as $$
  select c.empresa_id, c.id, c.codigo, c.nome, c.tipo::text, c.grupo_dre::text, c.analitica, c.ativa
    from public.plano_contas c where c.empresa_id = any(p)
$$;

create or replace function privado.bi_realizado_competencia(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, empresa text, competencia date, conta_codigo text, conta_nome text, grupo_dre text,
               parceiro text, descricao text, valor numeric, origem text, unidade text)
language sql stable security definer set search_path = public as $$
  select l.empresa_id, coalesce(e.nome_fantasia, e.razao_social), date_trunc('month', l.competencia)::date, c.codigo, c.nome, c.grupo_dre::text,
         pa.nome, l.descricao, l.valor, 'app', pr.nome
    from public.lancamentos l join public.empresas e on e.id = l.empresa_id join public.plano_contas c on c.id = l.conta_id
    left join public.parceiros pa on pa.id = l.parceiro_id left join public.predios pr on pr.id = l.predio_id
   where l.empresa_id = any(p) and (p_de is null or l.competencia >= p_de) and (p_ate is null or l.competencia <= p_ate)
  union all
  select d.empresa_id, coalesce(e.nome_fantasia, e.razao_social), d.competencia, d.conta_codigo, d.conta_nome, d.grupo_dre,
         null, null, d.valor, 'base: ' || b.nome, d.unidade
    from public.dados_linhas d join public.dados_bases b on b.id = d.base_id join public.empresas e on e.id = d.empresa_id
   where d.tipo = 'realizado' and d.empresa_id = any(p) and (p_de is null or d.competencia >= p_de) and (p_ate is null or d.competencia <= p_ate)
$$;

create or replace function privado.bi_realizado_caixa(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, empresa text, data date, conta_codigo text, conta_nome text, grupo_dre text,
               parceiro text, descricao text, valor numeric, origem text, unidade text)
language sql stable security definer set search_path = public as $$
  select pc.empresa_id, coalesce(e.nome_fantasia, e.razao_social), pc.data_pagamento, c.codigo, c.nome, c.grupo_dre::text,
         pa.nome, l.descricao, coalesce(pc.valor_pago, pc.valor), 'app', pr.nome
    from public.parcelas pc join public.lancamentos l on l.id = pc.lancamento_id join public.empresas e on e.id = pc.empresa_id
    join public.plano_contas c on c.id = l.conta_id left join public.parceiros pa on pa.id = l.parceiro_id left join public.predios pr on pr.id = l.predio_id
   where pc.status = 'paga' and pc.empresa_id = any(p) and (p_de is null or pc.data_pagamento >= p_de) and (p_ate is null or pc.data_pagamento <= p_ate)
  union all
  select d.empresa_id, coalesce(e.nome_fantasia, e.razao_social), coalesce(d.data_caixa, d.competencia + 14), d.conta_codigo, d.conta_nome, d.grupo_dre,
         null, null, d.valor, 'base: ' || b.nome, d.unidade
    from public.dados_linhas d join public.dados_bases b on b.id = d.base_id join public.empresas e on e.id = d.empresa_id
   where d.tipo = 'realizado' and d.empresa_id = any(p)
     and (p_de is null or coalesce(d.data_caixa, d.competencia + 14) >= p_de) and (p_ate is null or coalesce(d.data_caixa, d.competencia + 14) <= p_ate)
$$;

create or replace function privado.bi_contas_abertas(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, empresa text, vencimento date, conta_codigo text, conta_nome text, grupo_dre text,
               parceiro text, descricao text, parcela int, valor numeric, atrasada boolean, unidade text)
language sql stable security definer set search_path = public as $$
  select pc.empresa_id, coalesce(e.nome_fantasia, e.razao_social), pc.vencimento, c.codigo, c.nome, c.grupo_dre::text,
         pa.nome, l.descricao, pc.numero, pc.valor, pc.vencimento < current_date, pr.nome
    from public.parcelas pc join public.lancamentos l on l.id = pc.lancamento_id join public.empresas e on e.id = pc.empresa_id
    join public.plano_contas c on c.id = l.conta_id left join public.parceiros pa on pa.id = l.parceiro_id left join public.predios pr on pr.id = l.predio_id
   where pc.status = 'aberta' and pc.empresa_id = any(p) and (p_de is null or pc.vencimento >= p_de) and (p_ate is null or pc.vencimento <= p_ate)
$$;

create or replace function privado.bi_orcado_competencia(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, empresa text, versao text, tipo_versao text, ano int, travada boolean, competencia date,
               conta_codigo text, conta_nome text, grupo_dre text, valor numeric, origem text, unidade text)
language sql stable security definer set search_path = public as $$
  select o.empresa_id, coalesce(e.nome_fantasia, e.razao_social), v.nome, v.tipo, v.ano, v.congelada, o.competencia,
         c.codigo, c.nome, c.grupo_dre::text, o.valor, 'app', pr.nome
    from public.orcamento_linhas o join public.orcamento_versoes v on v.id = o.versao_id join public.empresas e on e.id = o.empresa_id
    join public.plano_contas c on c.id = o.conta_id left join public.predios pr on pr.id = o.predio_id
   where o.empresa_id = any(p) and (p_de is null or o.competencia >= p_de) and (p_ate is null or o.competencia <= p_ate)
  union all
  select d.empresa_id, coalesce(e.nome_fantasia, e.razao_social), b.nome, 'base', extract(year from d.competencia)::int, false, d.competencia,
         d.conta_codigo, d.conta_nome, d.grupo_dre, d.valor, 'base: ' || b.nome, d.unidade
    from public.dados_linhas d join public.dados_bases b on b.id = d.base_id join public.empresas e on e.id = d.empresa_id
   where d.tipo = 'orcado' and d.empresa_id = any(p) and (p_de is null or d.competencia >= p_de) and (p_ate is null or d.competencia <= p_ate)
$$;

create or replace function privado.bi_orcado_caixa(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, empresa text, versao text, tipo_versao text, ano int, data date,
               conta_codigo text, conta_nome text, grupo_dre text, valor numeric, origem text)
language sql stable security definer set search_path = public as $$
  select o.empresa_id, coalesce(e.nome_fantasia, e.razao_social), v.nome, v.tipo, v.ano, o.data_caixa,
         c.codigo, c.nome, c.grupo_dre::text, o.valor, 'app'
    from public.orcamento_caixa o join public.orcamento_versoes v on v.id = o.versao_id join public.empresas e on e.id = o.empresa_id
    join public.plano_contas c on c.id = o.conta_id
   where o.empresa_id = any(p) and (p_de is null or o.data_caixa >= p_de) and (p_ate is null or o.data_caixa <= p_ate)
  union all
  select d.empresa_id, coalesce(e.nome_fantasia, e.razao_social), b.nome, 'base', extract(year from d.competencia)::int, coalesce(d.data_caixa, d.competencia + 14),
         d.conta_codigo, d.conta_nome, d.grupo_dre, d.valor, 'base: ' || b.nome
    from public.dados_linhas d join public.dados_bases b on b.id = d.base_id join public.empresas e on e.id = d.empresa_id
   where d.tipo = 'orcado' and d.empresa_id = any(p)
     and (p_de is null or coalesce(d.data_caixa, d.competencia + 14) >= p_de) and (p_ate is null or coalesce(d.data_caixa, d.competencia + 14) <= p_ate)
$$;

-- Tudo em uma tabela mês a mês, pronta para gráfico: cenário (realizado/orçado) × regime (competência/caixa)
create or replace function privado.bi_fluxo_mensal(p uuid[], p_de date default null, p_ate date default null)
returns table (empresa_id uuid, empresa text, mes date, cenario text, versao text, regime text,
               conta_codigo text, conta_nome text, grupo_dre text, valor numeric)
language sql stable security definer set search_path = public as $$
  select empresa_id, empresa, competencia, 'realizado', null::text, 'competencia', conta_codigo, conta_nome, grupo_dre, sum(valor)
    from privado.bi_realizado_competencia(p, p_de, p_ate) group by 1,2,3,7,8,9
  union all
  select empresa_id, empresa, date_trunc('month', data)::date, 'realizado', null, 'caixa', conta_codigo, conta_nome, grupo_dre, sum(valor)
    from privado.bi_realizado_caixa(p, p_de, p_ate) group by 1,2,3,7,8,9
  union all
  select empresa_id, empresa, competencia, 'orcado', versao, 'competencia', conta_codigo, conta_nome, grupo_dre, sum(valor)
    from privado.bi_orcado_competencia(p, p_de, p_ate) group by 1,2,3,5,7,8,9
  union all
  select empresa_id, empresa, date_trunc('month', data)::date, 'orcado', versao, 'caixa', conta_codigo, conta_nome, grupo_dre, sum(valor)
    from privado.bi_orcado_caixa(p, p_de, p_ate) group by 1,2,3,5,7,8,9
$$;

do $$ declare f text; begin
  foreach f in array array['bi_empresas_lista','bi_contas','bi_realizado_competencia','bi_realizado_caixa','bi_contas_abertas',
                           'bi_orcado_competencia','bi_orcado_caixa','bi_fluxo_mensal'] loop
    execute format('revoke execute on function privado.%I(uuid[], date, date) from public, anon, authenticated', f);
  end loop;
end $$;

-- ===================== 4) Visões para conexão SQL (Power BI, Excel, Metabase...)
-- Cada visão chama uma função sem parâmetros que lê só as empresas da sessão (privado.bi_empresas).
-- As funções com lista de empresas continuam fechadas; só a API (com chave válida) e estas funções as usam.
do $$ declare f text; v text; r text; begin
  foreach f in array array['empresas_lista','contas','realizado_competencia','realizado_caixa','contas_abertas',
                           'orcado_competencia','orcado_caixa','fluxo_mensal'] loop
    select pg_get_function_result(('privado.bi_' || f || '(uuid[], date, date)')::regprocedure) into r;
    execute format('create or replace function privado.bi_v_%1$s() returns %2$s language sql stable security definer set search_path = public as %3$L',
                   f, r, format('select * from privado.bi_%s(array(select privado.bi_empresas()))', f));
    execute format('grant execute on function privado.bi_v_%s() to public', f);
    v := case f when 'empresas_lista' then 'empresas' else f end;
    execute format('create or replace view bi.%I as select * from privado.bi_v_%s()', v, f);
  end loop;
end $$;
grant execute on function privado.bi_empresas() to public;
comment on schema bi is 'Gevans Dados: visões só de leitura para Power BI e Excel. Cada login enxerga apenas a própria empresa.';
revoke all on schema bi from public;
revoke all on all tables in schema bi from public, anon, authenticated;

-- ===================== 5) Criar e revogar acessos (só admin da empresa)
create or replace function public.criar_chave_api(p_empresa uuid, p_nome text)
returns table (id uuid, chave text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_chave text; v_id uuid;
begin
  if not privado.sou_admin_empresa(p_empresa) then raise exception 'Só o administrador da empresa cria chaves de API.' using errcode = '42501'; end if;
  if (select count(*) from public.acessos_dados a where a.empresa_id = p_empresa and a.tipo = 'api' and a.revogado_em is null) >= 10 then
    raise exception 'Limite de 10 chaves ativas. Revogue uma antes de criar outra.';
  end if;
  v_chave := 'gd_' || encode(gen_random_bytes(24), 'hex');
  insert into public.acessos_dados (empresa_id, tipo, nome, prefixo, hash)
  values (p_empresa, 'api', trim(coalesce(nullif(p_nome, ''), 'Chave de API')), left(v_chave, 9), encode(digest(v_chave, 'sha256'), 'hex'))
  returning acessos_dados.id into v_id;
  return query select v_id, v_chave;
end $$;

create or replace function public.criar_acesso_sql(p_empresa uuid, p_nome text)
returns table (id uuid, usuario text, senha text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_papel text; v_senha text; v_id uuid;
begin
  if not privado.sou_admin_empresa(p_empresa) then raise exception 'Só o administrador da empresa cria acesso SQL.' using errcode = '42501'; end if;
  if (select count(*) from public.acessos_dados a where a.empresa_id = p_empresa and a.tipo = 'sql' and a.revogado_em is null) >= 3 then
    raise exception 'Limite de 3 acessos SQL ativos. Revogue um antes de criar outro.';
  end if;
  v_papel := 'bi_' || encode(gen_random_bytes(6), 'hex');
  v_senha := encode(gen_random_bytes(18), 'hex');
  execute format('create role %I login password %L noinherit nocreatedb nocreaterole connection limit 5', v_papel, v_senha);
  execute format('alter role %I set default_transaction_read_only = on', v_papel);
  execute format('alter role %I set statement_timeout = %L', v_papel, '60s');
  execute format('alter role %I set search_path = bi', v_papel);
  execute format('grant usage on schema bi to %I', v_papel);
  execute format('grant select on all tables in schema bi to %I', v_papel);
  insert into public.acessos_dados (empresa_id, tipo, nome, papel)
  values (p_empresa, 'sql', trim(coalesce(nullif(p_nome, ''), 'Acesso SQL')), v_papel)
  returning acessos_dados.id into v_id;
  return query select v_id, v_papel, v_senha;
end $$;

create or replace function public.revogar_acesso_dados(p_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare a public.acessos_dados;
begin
  select * into a from public.acessos_dados where acessos_dados.id = p_id;
  if a.id is null or not privado.sou_admin_empresa(a.empresa_id) then raise exception 'Só o administrador da empresa revoga acessos.' using errcode = '42501'; end if;
  if a.revogado_em is not null then return; end if;
  update public.acessos_dados set revogado_em = now() where acessos_dados.id = p_id;
  if a.tipo = 'sql' and exists (select 1 from pg_roles where rolname = a.papel) then
    execute format('revoke all on all tables in schema bi from %I', a.papel);
    execute format('revoke usage on schema bi from %I', a.papel);
    execute format('drop role %I', a.papel);
  end if;
end $$;

revoke execute on function public.criar_chave_api(uuid, text) from public, anon;
revoke execute on function public.criar_acesso_sql(uuid, text) from public, anon;
revoke execute on function public.revogar_acesso_dados(uuid) from public, anon;
grant execute on function public.criar_chave_api(uuid, text) to authenticated;
grant execute on function public.criar_acesso_sql(uuid, text) to authenticated;
grant execute on function public.revogar_acesso_dados(uuid) to authenticated;

-- ===================== 6) Leitura por chave de API (chamada pela Edge Function dados-api)
create or replace function public.api_extrair(p_chave text, p_recurso text, p_de date default null, p_ate date default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare a public.acessos_dados; v jsonb;
begin
  select * into a from public.acessos_dados
   where tipo = 'api' and revogado_em is null and hash = encode(digest(coalesce(p_chave, ''), 'sha256'), 'hex');
  if a.id is null then raise exception 'Chave de API inválida ou revogada.' using errcode = '28000'; end if;
  if p_recurso not in ('empresas','contas','realizado_competencia','realizado_caixa','contas_abertas','orcado_competencia','orcado_caixa','fluxo_mensal') then
    raise exception 'Recurso desconhecido: %', p_recurso using errcode = '22023';
  end if;
  update public.acessos_dados set ultimo_uso = now(), usos = usos + 1 where id = a.id;
  execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (select * from privado.%I($1, $2, $3) limit 200000) t',
                 case p_recurso when 'empresas' then 'bi_empresas_lista' else 'bi_' || p_recurso end)
    into v using array[a.empresa_id], p_de, p_ate;
  return v;
end $$;
revoke execute on function public.api_extrair(text, text, date, date) from public;
grant execute on function public.api_extrair(text, text, date, date) to anon, authenticated;
