-- Gevans Dados · painéis prontos por empresa (caixa do mês, auditoria por conta bancária, fluxo na estrutura do cliente).
-- Cada linha guarda um conjunto já montado (JSON) para a tela "Caixa e auditoria": resumo, movimentos e auditoria do extrato.
-- Isolamento igual ao das bases (0030): cada usuário só vê as empresas dele; grava quem pode editar a empresa.
-- Só acrescenta; nada é apagado. Rodar depois da 0032.
create table if not exists public.dados_paineis (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  periodo       text not null check (periodo ~ '^\d{4}-\d{2}$'),
  parte         text not null check (parte in ('resumo','movimentos','auditoria')),
  titulo        text,
  fonte         text,
  conteudo      jsonb not null,
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, periodo, parte)
);
create index if not exists dados_paineis_emp_idx on public.dados_paineis (empresa_id, periodo);
alter table public.dados_paineis enable row level security;
drop policy if exists dados_paineis_ve on public.dados_paineis;
create policy dados_paineis_ve on public.dados_paineis for select to authenticated using (empresa_id in (select privado.minhas_empresas()));
drop policy if exists dados_paineis_grava on public.dados_paineis;
create policy dados_paineis_grava on public.dados_paineis for insert to authenticated with check (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id));
drop policy if exists dados_paineis_altera on public.dados_paineis;
create policy dados_paineis_altera on public.dados_paineis for update to authenticated using (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id)) with check (privado.pode_editar(empresa_id));
drop policy if exists dados_paineis_apaga on public.dados_paineis;
create policy dados_paineis_apaga on public.dados_paineis for delete to authenticated using (empresa_id in (select privado.minhas_empresas()) and privado.pode_editar(empresa_id));
grant select, insert, update, delete on public.dados_paineis to authenticated;
-- sem trilha de auditoria linha a linha: o conteúdo é grande e é sempre recalculado a partir das planilhas.
