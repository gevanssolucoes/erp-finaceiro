-- Gevans Dados · de-para do fluxo (tela Caixa e auditoria › De-para).
-- Uma linha por chave Empresa-Obra-Produto-Serviço-Insumo com a classificação validada pelo cliente
-- (Fluxo_Tipo, Fluxo_Conta, Fluxo_SubConta, Fluxo_Descricao, Base Apresentação, Resumo - Serviço, Serviço - Resumo).
-- Ao abrir o painel, a classificação daqui vale sobre a pré-classificação; chave nova sem linha aqui gera alerta.
-- Isolamento igual ao de dados_paineis (0033). Só acrescenta; nada é apagado. Rodar depois da 0033.
create table if not exists public.dados_depara (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  chave            text not null,
  regional         text,
  empresa_origem   text,
  obra             text,
  produto          text,
  servico          text,
  insumo           text,
  fluxo_tipo       text,
  fluxo_conta      text,
  fluxo_subconta   text,
  fluxo_descricao  text not null,
  base_apresentacao text,
  resumo_servico   text,
  servico_resumo   text,
  validado_por     uuid default auth.uid(),
  atualizado_em    timestamptz not null default now(),
  unique (empresa_id, chave)
);
create index if not exists dados_depara_emp_idx on public.dados_depara (empresa_id);
alter table public.dados_depara enable row level security;
drop policy if exists dados_depara_ve on public.dados_depara;
create policy dados_depara_ve on public.dados_depara for select to authenticated using (empresa_id in (select privado.minhas_empresas()));
drop policy if exists dados_depara_grava on public.dados_depara;
create policy dados_depara_grava on public.dados_depara for insert to authenticated with check (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id));
drop policy if exists dados_depara_altera on public.dados_depara;
create policy dados_depara_altera on public.dados_depara for update to authenticated using (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id)) with check (privado.pode_editar(empresa_id));
drop policy if exists dados_depara_apaga on public.dados_depara;
create policy dados_depara_apaga on public.dados_depara for delete to authenticated using (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id));
grant select, insert, update, delete on public.dados_depara to authenticated;
