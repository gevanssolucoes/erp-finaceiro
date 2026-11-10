-- Versão 2 · Onda 1: governança e auditoria.
--  1. Trilha de alterações: toda inclusão, alteração e exclusão nas tabelas de cadastro e de
--     movimento fica gravada com o antes, o depois, quem fez e quando. Ninguém apaga nem edita a trilha.
--  2. Fechamento do mês: mês fechado não aceita lançar, alterar nem apagar (competência) nem baixa
--     com data de pagamento nele. Só o administrador reabre, com motivo.
--  3. Segregação de funções (ligada por empresa): quem lançou não dá baixa no próprio lançamento
--     e quem pediu não aprova o próprio pedido, mesmo que a faixa de aprovação não exija outra pessoa.
-- Roda depois da 0014 (alçadas, nome_usuario) e da 0016.

-- ===================== 0) quem lançou
alter table public.lancamentos add column if not exists criado_por uuid default auth.uid();
alter table public.lancamentos add column if not exists criado_por_nome text;

create or replace function privado.sou_admin(p_empresa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select privado.sou_master() or exists (
    select 1 from public.usuarios_empresas ue join public.perfis p on p.usuario_id = ue.usuario_id and p.ativo
     where ue.usuario_id = (select auth.uid()) and ue.empresa_id = p_empresa and ue.papel = 'admin')
$$;
revoke execute on function privado.sou_admin(uuid) from public, anon;
grant execute on function privado.sou_admin(uuid) to authenticated;

create or replace function privado.lancamento_autor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.criado_por := coalesce(new.criado_por, (select auth.uid()));
  if new.criado_por_nome is null then new.criado_por_nome := privado.nome_usuario(); end if;
  return new;
end $$;
drop trigger if exists lancamentos_autor on public.lancamentos;
create trigger lancamentos_autor before insert on public.lancamentos for each row execute function privado.lancamento_autor();

-- ===================== 1) trilha de alterações
create table if not exists public.auditoria (
  id            bigint generated always as identity primary key,
  empresa_id    uuid,
  tabela        text not null,
  registro_id   uuid,
  acao          text not null check (acao in ('inclusao', 'alteracao', 'exclusao')),
  campos        text[],
  antes         jsonb,
  depois        jsonb,
  usuario_id    uuid,
  usuario_nome  text,
  em            timestamptz not null default now()
);
create index if not exists idx_auditoria_emp on public.auditoria (empresa_id, em desc);
create index if not exists idx_auditoria_reg on public.auditoria (tabela, registro_id, em desc);
alter table public.auditoria enable row level security;
-- lê: master, administrador e financeiro da empresa. Ninguém grava direto: só os gatilhos abaixo.
create policy auditoria_leitura on public.auditoria for select to authenticated
  using ((select privado.sou_master()) or exists (select 1 from public.usuarios_empresas ue
    where ue.usuario_id = (select auth.uid()) and ue.empresa_id = auditoria.empresa_id and ue.papel in ('admin', 'financeiro')));
revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;

create or replace function privado.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_antes jsonb; v_depois jsonb; v_campos text[]; v_reg jsonb; v_emp uuid; v_id uuid;
  v_fora constant text[] := array['logo', 'criado_em', 'atualizado_em', 'enviado_em'];
begin
  if tg_op in ('UPDATE', 'DELETE') then v_antes := to_jsonb(old) - v_fora; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_depois := to_jsonb(new) - v_fora; end if;
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_campos from jsonb_object_keys(v_depois) k where v_depois -> k is distinct from v_antes -> k;
    if v_campos is null then
      -- só mudou a logo (ou nada): registra a troca da logo sem guardar a imagem
      if to_jsonb(old) ->> 'logo' is distinct from to_jsonb(new) ->> 'logo' then v_campos := array['logo']; v_antes := '{}'; v_depois := '{"logo":"(imagem nova)"}';
      else return new; end if;
    else
      select jsonb_object_agg(k, v_antes -> k), jsonb_object_agg(k, v_depois -> k) into v_antes, v_depois from unnest(v_campos) k;
    end if;
  end if;
  v_reg := coalesce(to_jsonb(new), to_jsonb(old));
  v_emp := case when tg_table_name = 'empresas' then (v_reg ->> 'id')::uuid else (v_reg ->> 'empresa_id')::uuid end;
  v_id := case when v_reg ? 'id' then (v_reg ->> 'id')::uuid when v_reg ? 'usuario_id' then (v_reg ->> 'usuario_id')::uuid end;
  insert into public.auditoria (empresa_id, tabela, registro_id, acao, campos, antes, depois, usuario_id, usuario_nome)
  values (v_emp, tg_table_name, v_id,
          case tg_op when 'INSERT' then 'inclusao' when 'UPDATE' then 'alteracao' else 'exclusao' end,
          v_campos, v_antes, v_depois, (select auth.uid()), coalesce(privado.nome_usuario(), case when (select auth.uid()) is null then 'sistema' end));
  return coalesce(new, old);
end $$;

do $$ declare t text;
begin
  foreach t in array array['lancamentos', 'parcelas', 'plano_contas', 'contas_bancarias', 'centros_custo', 'parceiros',
                           'empresas', 'usuarios_empresas', 'alcadas', 'impostos_config', 'acordos_cartao', 'premissas_conta', 'extratos'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_trilha', t);
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function privado.auditar()', t || '_trilha', t);
    end if;
  end loop;
end $$;

-- ===================== 2) fechamento do mês
create table if not exists public.fechamentos (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas(id) on delete cascade,
  mes                 date not null check (extract(day from mes) = 1),
  situacao            text not null default 'fechado' check (situacao in ('fechado', 'reaberto')),
  checklist           jsonb,
  observacao          text,
  fechado_por         uuid default auth.uid(),
  fechado_por_nome    text,
  fechado_em          timestamptz not null default now(),
  reaberto_por        uuid,
  reaberto_por_nome   text,
  reaberto_em         timestamptz,
  motivo_reabertura   text,
  unique (empresa_id, mes),
  check (situacao = 'fechado' or length(trim(coalesce(motivo_reabertura, ''))) >= 5)
);
alter table public.fechamentos enable row level security;
create policy fechamentos_leitura on public.fechamentos for select to authenticated
  using (empresa_id in (select privado.minhas_empresas()));
create policy fechamentos_admin on public.fechamentos for all to authenticated
  using ((select privado.sou_admin(empresa_id))) with check ((select privado.sou_admin(empresa_id)));
grant select, insert, update on public.fechamentos to authenticated;
drop trigger if exists fechamentos_trilha on public.fechamentos;
create trigger fechamentos_trilha after insert or update or delete on public.fechamentos for each row execute function privado.auditar();

create or replace function privado.fechamento_nomes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.mes := date_trunc('month', new.mes)::date;
  if tg_op = 'INSERT' or (new.situacao = 'fechado' and old.situacao = 'reaberto') then
    new.fechado_por := (select auth.uid()); new.fechado_por_nome := privado.nome_usuario(); new.fechado_em := now();
  end if;
  if new.situacao = 'reaberto' and (tg_op = 'INSERT' or old.situacao = 'fechado') then
    new.reaberto_por := (select auth.uid()); new.reaberto_por_nome := privado.nome_usuario(); new.reaberto_em := now();
  end if;
  return new;
end $$;
drop trigger if exists fechamentos_nomes on public.fechamentos;
create trigger fechamentos_nomes before insert or update on public.fechamentos for each row execute function privado.fechamento_nomes();

create or replace function privado.mes_fechado(p_empresa uuid, p_data date) returns boolean
language sql stable security definer set search_path = public as $$
  select p_data is not null and exists (select 1 from public.fechamentos f
    where f.empresa_id = p_empresa and f.mes = date_trunc('month', p_data)::date and f.situacao = 'fechado')
$$;

create or replace function privado.trava_mes_lancamento() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_d date;
begin
  -- empresa sendo apagada: deixa o cascade passar
  if tg_op = 'DELETE' and not exists (select 1 from public.empresas where id = old.empresa_id) then return old; end if;
  if tg_op in ('UPDATE', 'DELETE') and privado.mes_fechado(old.empresa_id, old.competencia) then v_d := old.competencia;
  elsif tg_op in ('INSERT', 'UPDATE') and privado.mes_fechado(new.empresa_id, new.competencia) then v_d := new.competencia; end if;
  if v_d is not null then
    raise exception 'O mês %/% está fechado. Peça ao administrador para reabrir o mês antes de mudar lançamentos dele.',
      lpad(extract(month from v_d)::text, 2, '0'), extract(year from v_d) using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists lancamentos_mes_fechado on public.lancamentos;
create trigger lancamentos_mes_fechado before insert or update or delete on public.lancamentos for each row execute function privado.trava_mes_lancamento();

create or replace function privado.trava_mes_parcela() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_d date;
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.lancamentos where id = old.lancamento_id) then return old; end if;
  if tg_op in ('UPDATE', 'DELETE') and privado.mes_fechado(old.empresa_id, old.data_pagamento) then v_d := old.data_pagamento;
  elsif tg_op in ('INSERT', 'UPDATE') and privado.mes_fechado(new.empresa_id, new.data_pagamento) then v_d := new.data_pagamento; end if;
  -- alterar uma parcela já paga num mês fechado só é bloqueado se mudar algo do pagamento
  if v_d is not null and tg_op = 'UPDATE' and old.data_pagamento is not distinct from new.data_pagamento
     and old.valor_pago is not distinct from new.valor_pago and old.status = new.status
     and old.conta_bancaria_id is not distinct from new.conta_bancaria_id and old.valor = new.valor then
    return new;
  end if;
  if v_d is not null then
    raise exception 'O caixa de %/% está fechado. Peça ao administrador para reabrir o mês antes de mudar pagamentos dele.',
      lpad(extract(month from v_d)::text, 2, '0'), extract(year from v_d) using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists parcelas_mes_fechado on public.parcelas;
create trigger parcelas_mes_fechado before insert or update or delete on public.parcelas for each row execute function privado.trava_mes_parcela();

-- ===================== 3) segregação de funções
alter table public.empresas add column if not exists segregar_funcoes boolean not null default false;

-- mesma regra da 0014 + segregação: com ela ligada, quem pediu nunca aprova
create or replace function privado.pode_aprovar(p_empresa uuid, p_processo text, p_valor numeric, p_solicitante uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare a record; v_papel text; v_segr boolean;
begin
  if privado.sou_master() then return null; end if;
  select segregar_funcoes into v_segr from public.empresas where id = p_empresa;
  if coalesce(v_segr, false) and p_solicitante is not null and p_solicitante = (select auth.uid()) then
    return 'Segregação de funções: quem pediu não aprova. Outra pessoa precisa aprovar';
  end if;
  select * into a from public.alcadas
   where empresa_id = p_empresa and processo = p_processo and ativo and valor_a_partir <= abs(coalesce(p_valor, 0))
   order by valor_a_partir desc limit 1;
  select papel::text into v_papel from public.usuarios_empresas
   where usuario_id = (select auth.uid()) and empresa_id = p_empresa;
  if a.id is null then
    if v_papel in ('admin', 'financeiro') then return null; end if;
    return 'Seu acesso não permite aprovar';
  end if;
  if a.outra_pessoa and p_solicitante is not null and p_solicitante = (select auth.uid()) then
    return 'Pela tabela de aprovações, outra pessoa precisa aprovar';
  end if;
  if a.aprovador = 'master' then return 'Pela tabela de aprovações, este valor só a conta master aprova'; end if;
  if a.aprovador = 'admin' and coalesce(v_papel, '') <> 'admin' then
    return 'Pela tabela de aprovações, este valor precisa do administrador da empresa';
  end if;
  if a.aprovador = 'financeiro' and coalesce(v_papel, '') not in ('admin', 'financeiro') then
    return 'Pela tabela de aprovações, este valor precisa do financeiro ou do administrador';
  end if;
  return null;
end $$;

-- baixa manual: com a segregação ligada, quem lançou não marca como paga
create or replace function privado.segrega_baixa() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_autor uuid;
begin
  if new.status = 'paga' and old.status <> 'paga' and not privado.sou_master()
     and exists (select 1 from public.empresas where id = new.empresa_id and segregar_funcoes) then
    select criado_por into v_autor from public.lancamentos where id = new.lancamento_id;
    if v_autor is not null and v_autor = (select auth.uid()) then
      raise exception 'Segregação de funções: quem lançou não dá baixa no próprio lançamento. Peça para outra pessoa do financeiro.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists parcelas_segrega_baixa on public.parcelas;
create trigger parcelas_segrega_baixa before update on public.parcelas for each row execute function privado.segrega_baixa();

-- só o administrador liga ou desliga a segregação (as demais colunas de empresas seguem as regras atuais)
create or replace function privado.segregacao_quem_muda() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.segregar_funcoes is distinct from old.segregar_funcoes and not privado.sou_admin(new.id) then
    raise exception 'Só o administrador da empresa liga ou desliga a segregação de funções.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists empresas_segregacao on public.empresas;
create trigger empresas_segregacao before update on public.empresas for each row execute function privado.segregacao_quem_muda();
