-- Orçamento: guarda na versão as escolhas do preenchimento
--   parametros.base  = 'competencia' (padrão; o caixa sai pelas premissas de prazo) ou 'caixa' (cada valor cai no caixa no próprio mês)
--   parametros.pct   = { unidade: { conta: % da receita bruta } }  (despesas calculadas sobre a receita; impostos vêm da configuração)
--   parametros.pf    = { conta: 'liquido' | 'bruto' }               (pessoa física: salário bruto calcula INSS e IRRF)
-- Boletos: quem pode editar a empresa adiciona boletos pelo app (foto ou arquivo), além do script do Gmail.
alter table public.orcamento_versoes add column if not exists parametros jsonb not null default '{}'::jsonb;

drop policy if exists boletos_email_insere on public.boletos_email;
create policy boletos_email_insere on public.boletos_email for insert to authenticated
  with check ((select privado.pode_editar(empresa_id)));
grant insert on public.boletos_email to authenticated;
