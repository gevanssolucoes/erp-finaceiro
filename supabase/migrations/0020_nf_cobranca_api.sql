-- Emissão de NF (NFS-e / NF-e) e cobrança por boleto e PIX via API, com baixa automática pelo webhook do banco.
-- Emissor recomendado: Focus NFe. Banco recomendado: Asaas. Enquanto não houver token, tudo roda em modo "simulado".
-- Tokens e segredos ficam no schema privado (fora da API). O certificado A1 vai direto para o emissor e não é guardado aqui.

-- ---------- credenciais por empresa (fora da API)
create table if not exists privado.integracoes (
  empresa_id        uuid not null references public.empresas(id) on delete cascade,
  servico           text not null check (servico in ('nf', 'banco')),
  provedor          text not null default 'simulado' check (provedor in ('simulado', 'focusnfe', 'asaas')),
  ambiente          text not null default 'simulado' check (ambiente in ('simulado', 'homologacao', 'producao')),
  token             text check (length(token) <= 500),
  webhook_token     text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  config            jsonb not null default '{}'::jsonb,   -- município, inscrição municipal, série, item de serviço, tarifas, conta bancária
  certificado_validade date,
  certificado_enviado_em timestamptz,
  atualizado_em     timestamptz not null default now(),
  atualizado_por    uuid,
  primary key (empresa_id, servico)
);
alter table privado.integracoes enable row level security;
revoke all on privado.integracoes from public, anon, authenticated;

-- ---------- notas emitidas
create table if not exists public.nf_emitidas (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas(id) on delete cascade,
  modelo            text not null default 'nfse' check (modelo in ('nfse', 'nfse_nacional', 'nfe')),
  provedor          text not null default 'simulado',
  ambiente          text not null default 'simulado' check (ambiente in ('simulado', 'homologacao', 'producao')),
  ref               text not null unique,
  status            text not null default 'processando' check (status in ('processando', 'autorizada', 'erro', 'cancelada')),
  numero            text,
  codigo_verificacao text,
  chave_acesso      text,
  data_emissao      date not null default current_date,
  parceiro_id       uuid references public.parceiros(id) on delete set null,
  tomador_nome      text check (length(tomador_nome) <= 200),
  tomador_documento text check (tomador_documento ~ '^[0-9]{11}([0-9]{3})?$'),
  tomador_email     text check (length(tomador_email) <= 200),
  discriminacao     text check (length(discriminacao) <= 2000),
  codigo_servico    text check (length(codigo_servico) <= 20),
  valor_servicos    numeric(14,2) not null check (valor_servicos > 0),
  aliquota_iss      numeric(7,4),
  iss_retido        boolean not null default false,
  valor_iss         numeric(14,2),
  valor_cbs         numeric(14,2),
  valor_ibs         numeric(14,2),
  url_pdf           text,
  url_xml           text,
  mensagem          text check (length(mensagem) <= 2000),
  lancamento_id     uuid references public.lancamentos(id) on delete set null,
  criado_por        uuid default auth.uid(),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists idx_nfe_emp on public.nf_emitidas (empresa_id, data_emissao desc);
create index if not exists idx_nfe_lanc on public.nf_emitidas (lancamento_id);
create index if not exists idx_nfe_parc on public.nf_emitidas (parceiro_id);

-- ---------- cobranças (boleto / PIX)
create table if not exists public.cobrancas (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas(id) on delete cascade,
  parcela_id        uuid references public.parcelas(id) on delete set null,
  nf_id             uuid references public.nf_emitidas(id) on delete set null,
  provedor          text not null default 'simulado',
  ambiente          text not null default 'simulado' check (ambiente in ('simulado', 'homologacao', 'producao')),
  tipo              text not null check (tipo in ('boleto', 'pix', 'boleto_pix')),
  valor             numeric(14,2) not null check (valor > 0),
  vencimento        date not null,
  status            text not null default 'pendente' check (status in ('pendente', 'paga', 'cancelada', 'erro')),
  externo_id        text,
  linha_digitavel   text,
  pix_copia_cola    text,
  url               text,
  mensagem          text check (length(mensagem) <= 2000),
  pago_em           date,
  valor_pago        numeric(14,2),
  valor_liquido     numeric(14,2),
  taxa              numeric(14,2),
  criado_por        uuid default auth.uid(),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (provedor, externo_id)
);
create index if not exists idx_cob_emp on public.cobrancas (empresa_id, vencimento desc);
create index if not exists idx_cob_parc on public.cobrancas (parcela_id);
create index if not exists idx_cob_nf on public.cobrancas (nf_id);

-- Leitura por empresa; gravação só pelas funções do servidor (emissor e banco respondem por elas)
alter table public.nf_emitidas enable row level security;
alter table public.cobrancas enable row level security;
create policy nf_emitidas_le on public.nf_emitidas for select to authenticated using (empresa_id in (select privado.minhas_empresas()));
create policy cobrancas_le on public.cobrancas for select to authenticated using (empresa_id in (select privado.minhas_empresas()));
revoke insert, update, delete on public.nf_emitidas, public.cobrancas from anon, authenticated;
grant select on public.nf_emitidas, public.cobrancas to authenticated;

-- ---------- situação das integrações para a tela (sem token)
create or replace function public.integracoes_status(p_emp uuid)
returns table (servico text, provedor text, ambiente text, tem_token boolean, token_final text, config jsonb,
               certificado_validade date, certificado_enviado_em timestamptz, atualizado_em timestamptz, webhook_token text)
language sql stable security definer set search_path = '' as $$
  select i.servico, i.provedor, i.ambiente, i.token is not null, right(i.token, 4), i.config,
         i.certificado_validade, i.certificado_enviado_em, i.atualizado_em,
         case when (select privado.pode_editar(p_emp)) then i.webhook_token end
  from privado.integracoes i
  where i.empresa_id = p_emp and p_emp in (select privado.minhas_empresas());
$$;
revoke execute on function public.integracoes_status(uuid) from public, anon;
grant execute on function public.integracoes_status(uuid) to authenticated;

-- ---------- funções usadas só pelas funções do servidor (service_role)
create or replace function public.integracao_ler(p_emp uuid, p_servico text)
returns privado.integracoes language sql stable security definer set search_path = '' as $$
  select * from privado.integracoes where empresa_id = p_emp and servico = p_servico;
$$;

create or replace function public.integracao_salvar(p_emp uuid, p_servico text, p_provedor text, p_ambiente text,
                                                    p_token text, p_config jsonb, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into privado.integracoes (empresa_id, servico, provedor, ambiente, token, config, atualizado_por)
  values (p_emp, p_servico, p_provedor, p_ambiente, nullif(p_token, ''), coalesce(p_config, '{}'::jsonb), p_usuario)
  on conflict (empresa_id, servico) do update set
    provedor = excluded.provedor, ambiente = excluded.ambiente,
    token = coalesce(nullif(p_token, ''), case when excluded.provedor = privado.integracoes.provedor then privado.integracoes.token end),
    config = privado.integracoes.config || excluded.config,
    atualizado_em = now(), atualizado_por = p_usuario;
  update privado.integracoes set token = null where empresa_id = p_emp and servico = p_servico and provedor = 'simulado';
end $$;

create or replace function public.integracao_certificado(p_emp uuid, p_validade date)
returns void language sql security definer set search_path = '' as $$
  update privado.integracoes set certificado_validade = p_validade, certificado_enviado_em = now(), atualizado_em = now()
  where empresa_id = p_emp and servico = 'nf';
$$;

-- Baixa da cobrança paga: quita a parcela a receber (entra no caixa) e lança a tarifa do banco como despesa financeira.
create or replace function public.cobranca_baixar(p_cobranca uuid, p_valor_pago numeric, p_liquido numeric, p_data date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.cobrancas; p public.parcelas; l public.lancamentos;
  v_taxa numeric(14,2); v_banco uuid; v_conta uuid; v_lt uuid := gen_random_uuid();
begin
  select * into c from public.cobrancas where id = p_cobranca for update;
  if c.id is null then raise exception 'cobrança não encontrada'; end if;
  if c.status = 'paga' then return jsonb_build_object('ok', true, 'repetido', true); end if;
  if c.status = 'cancelada' then return jsonb_build_object('ok', false, 'erro', 'cobrança cancelada'); end if;
  v_taxa := greatest(0, round(coalesce(p_valor_pago, c.valor) - coalesce(p_liquido, p_valor_pago, c.valor), 2));
  update public.cobrancas set status = 'paga', pago_em = coalesce(p_data, current_date),
    valor_pago = coalesce(p_valor_pago, c.valor), valor_liquido = coalesce(p_liquido, p_valor_pago, c.valor),
    taxa = v_taxa, atualizado_em = now() where id = c.id;
  if c.parcela_id is null then return jsonb_build_object('ok', true, 'parcela', false); end if;

  select * into p from public.parcelas where id = c.parcela_id for update;
  select * into l from public.lancamentos where id = p.lancamento_id;
  select nullif(i.config->>'conta_bancaria_id', '')::uuid into v_banco from privado.integracoes i
    where i.empresa_id = c.empresa_id and i.servico = 'banco';
  v_banco := coalesce(p.conta_bancaria_id, v_banco);
  if p.status <> 'paga' then
    update public.parcelas set status = 'paga', data_pagamento = coalesce(p_data, current_date),
      valor_pago = coalesce(p_valor_pago, c.valor), conta_bancaria_id = v_banco,
      forma_pagamento = coalesce(p.forma_pagamento, case c.tipo when 'pix' then 'PIX' else 'Boleto' end)
    where id = p.id;
  end if;

  if v_taxa > 0 then
    select id into v_conta from public.plano_contas where empresa_id = c.empresa_id and codigo = '6.01.004' limit 1;
    if v_conta is null then
      select id into v_conta from public.plano_contas where empresa_id = c.empresa_id and tipo = 'despesa' and analitica
        and grupo_dre = 'resultado_financeiro' order by codigo limit 1;
    end if;
    if v_conta is not null then
      insert into public.lancamentos (id, empresa_id, predio_id, conta_id, centro_custo_id, parceiro_id, competencia, descricao, valor, origem, vinculo_id)
      values (v_lt, c.empresa_id, l.predio_id, v_conta, l.centro_custo_id, null, coalesce(p_data, current_date),
              'Tarifa ' || initcap(c.provedor) || ' · ' || case c.tipo when 'pix' then 'PIX' else 'boleto' end || coalesce(' · NF ' || l.numero_nf, ''),
              -v_taxa, 'taxa_cartao', l.id);
      insert into public.parcelas (empresa_id, lancamento_id, numero, vencimento, valor, data_pagamento, valor_pago, forma_pagamento, status, conta_bancaria_id)
      values (c.empresa_id, v_lt, 1, coalesce(p_data, current_date), -v_taxa, coalesce(p_data, current_date), -v_taxa, 'Tarifa bancária', 'paga', v_banco);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'parcela', true, 'taxa', v_taxa);
end $$;

revoke execute on function public.integracao_ler(uuid, text) from public, anon, authenticated;
revoke execute on function public.integracao_salvar(uuid, text, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.integracao_certificado(uuid, date) from public, anon, authenticated;
revoke execute on function public.cobranca_baixar(uuid, numeric, numeric, date) from public, anon, authenticated;
grant execute on function public.integracao_ler(uuid, text) to service_role;
grant execute on function public.integracao_salvar(uuid, text, text, text, text, jsonb, uuid) to service_role;
grant execute on function public.integracao_certificado(uuid, date) to service_role;
grant execute on function public.cobranca_baixar(uuid, numeric, numeric, date) to service_role;
grant usage on schema privado to service_role;

-- A função do servidor pergunta, com o login do usuário, se ele pode mexer nesta empresa
create or replace function public.posso_editar_empresa(p_emp uuid) returns boolean
language sql stable security invoker set search_path = '' as $$ select coalesce(privado.pode_editar(p_emp), false) $$;
revoke execute on function public.posso_editar_empresa(uuid) from public, anon;
grant execute on function public.posso_editar_empresa(uuid) to authenticated;

-- E-mail do cliente (a NF e o boleto vão para ele)
alter table public.parceiros add column if not exists email text check (length(email) <= 200);
