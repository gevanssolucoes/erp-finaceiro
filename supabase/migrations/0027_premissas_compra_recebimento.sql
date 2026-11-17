-- Versão 3 · Premissas de compra e pagamento.
-- 1) Pagamento com entrada: parte do valor sai na data da compra e o resto segue os prazos da conta.
-- 2) Premissas de recebimento: como a receita de uma conta se divide entre formas (cartão, PIX, boleto...)
--    e em quantos dias cada parte entra no caixa.
-- Só acrescenta estruturas; não apaga nem altera dados. Rodar depois da 0026.

alter table public.premissas_conta
  add column if not exists entrada_pct numeric(5,2) not null default 0 check (entrada_pct between 0 and 100);

create table if not exists public.premissas_recebimento (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  conta_id        uuid not null references public.plano_contas(id) on delete cascade,
  forma           text not null check (forma in ('cartao_credito', 'cartao_debito', 'pix', 'dinheiro', 'boleto', 'transferencia', 'outro')),
  percentual      numeric(5,2) not null check (percentual > 0 and percentual <= 100),
  prazos_dias     int[] not null default '{0}',   -- {30} = em 30 dias; {30,60,90} = três partes iguais
  vigencia_inicio date not null default '2000-01-01',
  vigencia_fim    date,
  criado_em       timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);
create index if not exists idx_prem_receb_conta on public.premissas_recebimento (empresa_id, conta_id);

alter table public.premissas_recebimento enable row level security;
create policy premissas_recebimento_por_empresa on public.premissas_recebimento for all to authenticated
  using (empresa_id in (select privado.minhas_empresas())) with check (empresa_id in (select privado.minhas_empresas()));
create policy premissas_recebimento_grava on public.premissas_recebimento as restrictive for insert to authenticated
  with check ((select privado.pode_editar(empresa_id)));
create policy premissas_recebimento_altera on public.premissas_recebimento as restrictive for update to authenticated
  using ((select privado.pode_editar(empresa_id)));
create policy premissas_recebimento_apaga on public.premissas_recebimento as restrictive for delete to authenticated
  using ((select privado.pode_editar(empresa_id)));
grant select, insert, update, delete on public.premissas_recebimento to authenticated;

-- trilha de alterações (mesma função da 0017)
do $$ begin
  if to_regprocedure('privado.auditar()') is not null then
    drop trigger if exists premissas_recebimento_trilha on public.premissas_recebimento;
    create trigger premissas_recebimento_trilha after insert or update or delete on public.premissas_recebimento
      for each row execute function privado.auditar();
  end if;
end $$;
