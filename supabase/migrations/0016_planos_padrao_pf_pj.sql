-- Planos de contas padrão: um para pessoa física (pf) e outro para empresa (pj),
-- conforme a planilha aprovada pelo Evaldo em 10/11/2026 (planos-de-contas-padrao.xlsx).
-- Estrutura em 3 níveis: 1 Receitas, 2 Pagamentos, 3 Saldos e movimentações (fora da DRE).
-- Pode rodar antes ou depois da 0014: as colunas são criadas só se faltarem.

alter table public.empresas
  add column if not exists tipo_pessoa text not null default 'pj' check (tipo_pessoa in ('pj', 'pf'));

alter table public.plano_contas_modelo add column if not exists modelo text not null default 'pj'
  check (modelo in ('pj', 'pf'));
alter table public.plano_contas_modelo drop constraint if exists plano_contas_modelo_pkey;
alter table public.plano_contas_modelo add primary key (modelo, codigo);

-- troca o modelo antigo pelos dois novos
delete from public.plano_contas_modelo;
insert into public.plano_contas_modelo (modelo, codigo, nome, pai, tipo, grupo_dre, analitica) values
 ('pf','1','Receitas',null,'receita',null,false),
 ('pf','1.01','Rendimentos do trabalho','1','receita',null,false),
 ('pf','1.01.001','Salário líquido','1.01','receita','receita_bruta',true),
 ('pf','1.01.002','13º salário e férias','1.01','receita','receita_bruta',true),
 ('pf','1.01.003','Vale alimentação e benefícios','1.01','receita','receita_bruta',true),
 ('pf','1.01.004','Pró-labore e retiradas','1.01','receita','receita_bruta',true),
 ('pf','1.01.005','Serviços, extras e comissões','1.01','receita','receita_bruta',true),
 ('pf','1.02','Outras receitas','1','receita',null,false),
 ('pf','1.02.001','Aluguéis recebidos','1.02','receita','receita_bruta',true),
 ('pf','1.02.002','Reembolsos e outras entradas','1.02','receita','receita_bruta',true),
 ('pf','1.03','Receitas financeiras','1','receita',null,false),
 ('pf','1.03.001','Rendimentos de aplicações','1.03','receita','resultado_financeiro',true),
 ('pf','2','Pagamentos',null,'despesa',null,false),
 ('pf','2.01','Descontos na fonte (se lançar o bruto)','2','despesa',null,false),
 ('pf','2.01.001','INSS','2.01','despesa','deducoes',true),
 ('pf','2.01.002','IRRF','2.01','despesa','deducoes',true),
 ('pf','2.02','Moradia','2','despesa',null,false),
 ('pf','2.02.001','Aluguel','2.02','despesa','despesas_operacionais',true),
 ('pf','2.02.002','Condomínio e IPTU','2.02','despesa','despesas_operacionais',true),
 ('pf','2.02.003','Energia, água e gás','2.02','despesa','despesas_operacionais',true),
 ('pf','2.02.004','Internet, TV e telefone','2.02','despesa','despesas_operacionais',true),
 ('pf','2.02.005','Manutenção da casa','2.02','despesa','despesas_operacionais',true),
 ('pf','2.03','Alimentação','2','despesa',null,false),
 ('pf','2.03.001','Mercado','2.03','despesa','despesas_operacionais',true),
 ('pf','2.03.002','Restaurantes e delivery','2.03','despesa','despesas_operacionais',true),
 ('pf','2.04','Transporte','2','despesa',null,false),
 ('pf','2.04.001','Combustível e transporte','2.04','despesa','despesas_operacionais',true),
 ('pf','2.04.002','Seguro do carro','2.04','despesa','despesas_operacionais',true),
 ('pf','2.04.003','IPVA, licenciamento e manutenção','2.04','despesa','despesas_operacionais',true),
 ('pf','2.04.004','Manutenção Corretiva','2.04','despesa','despesas_operacionais',true),
 ('pf','2.05','Saúde','2','despesa',null,false),
 ('pf','2.05.001','Plano de saúde','2.05','despesa','despesas_operacionais',true),
 ('pf','2.05.002','Consultas e terapias','2.05','despesa','despesas_operacionais',true),
 ('pf','2.05.003','Farmácia','2.05','despesa','despesas_operacionais',true),
 ('pf','2.06','Educação','2','despesa',null,false),
 ('pf','2.06.001','Escola, faculdade e cursos','2.06','despesa','despesas_operacionais',true),
 ('pf','2.07','Pessoal e lazer','2','despesa',null,false),
 ('pf','2.07.001','Roupas e cuidados pessoais','2.07','despesa','despesas_operacionais',true),
 ('pf','2.07.002','Lazer e viagens','2.07','despesa','despesas_operacionais',true),
 ('pf','2.07.003','Assinaturas e aplicativos','2.07','despesa','despesas_operacionais',true),
 ('pf','2.07.004','Presentes e doações','2.07','despesa','despesas_operacionais',true),
 ('pf','2.08','Bancos','2','despesa',null,false),
 ('pf','2.08.001','Tarifas bancárias e IOF','2.08','despesa','resultado_financeiro',true),
 ('pf','2.08.002','Juros e multas pagos','2.08','despesa','resultado_financeiro',true),
 ('pf','2.09','Empréstimos e financiamentos','2','despesa',null,false),
 ('pf','2.09.001','Financiamento','2.09','despesa','resultado_financeiro',true),
 ('pf','2.09.002','Empréstimo','2.09','despesa','resultado_financeiro',true),
 ('pf','2.10','Imposto de renda (IRPF)','2','despesa',null,false),
 ('pf','2.10.001','Imposto de renda a pagar','2.10','despesa','ir_csll',true),
 ('pf','3','Saldos e movimentações',null,'despesa',null,false),
 ('pf','3.01','Saldos','3','despesa',null,false),
 ('pf','3.01.001','Saldo inicial','3.01','receita',null,true),
 ('pf','3.01.002','Ajuste de saldo · entrada','3.01','receita',null,true),
 ('pf','3.01.003','Ajuste de saldo · saída','3.01','despesa',null,true),
 ('pf','3.02','Transferências entre contas próprias','3','despesa',null,false),
 ('pf','3.02.001','Transferência · entrada','3.02','receita',null,true),
 ('pf','3.02.002','Transferência · saída','3.02','despesa',null,true),
 ('pf','3.03','Aplicações financeiras','3','despesa',null,false),
 ('pf','3.03.001','Aplicação','3.03','despesa',null,true),
 ('pf','3.03.002','Resgate','3.03','receita',null,true),
 ('pf','3.04','Bens e patrimônio','3','despesa',null,false),
 ('pf','3.04.001','Imóvel (entrada e parcelas)','3.04','despesa',null,true),
 ('pf','3.04.002','Veículo','3.04','despesa',null,true),
 ('pj','1','Receitas',null,'receita',null,false),
 ('pj','1.01','Receita bruta','1','receita',null,false),
 ('pj','1.01.001','Venda de produtos','1.01','receita','receita_bruta',true),
 ('pj','1.01.002','Prestação de serviços','1.01','receita','receita_bruta',true),
 ('pj','1.01.003','Outras receitas operacionais','1.01','receita','receita_bruta',true),
 ('pj','1.02','Receitas financeiras','1','receita',null,false),
 ('pj','1.02.001','Rendimentos de aplicações','1.02','receita','resultado_financeiro',true),
 ('pj','2','Pagamentos',null,'despesa',null,false),
 ('pj','2.01','Deduções da receita','2','despesa',null,false),
 ('pj','2.01.001','Impostos sobre vendas (Simples)','2.01','despesa','deducoes',true),
 ('pj','2.01.002','Devoluções','2.01','despesa','deducoes',true),
 ('pj','2.01.003','PIS e COFINS','2.01','despesa','deducoes',true),
 ('pj','2.01.004','ISS','2.01','despesa','deducoes',true),
 ('pj','2.01.005','ICMS','2.01','despesa','deducoes',true),
 ('pj','2.01.006','CBS e IBS (reforma tributária)','2.01','despesa','deducoes',true),
 ('pj','2.02','Custo das mercadorias','2','despesa',null,false),
 ('pj','2.02.001','Mercadorias (CMV)','2.02','despesa','custos',true),
 ('pj','2.02.002','Fretes de compra','2.02','despesa','custos',true),
 ('pj','2.03','Custo dos serviços','2','despesa',null,false),
 ('pj','2.03.001','Serviços terceirizados','2.03','despesa','custos',true),
 ('pj','2.03.002','Mão de obra direta','2.03','despesa','custos',true),
 ('pj','2.04','Pessoal','2','despesa',null,false),
 ('pj','2.04.001','Salários e encargos','2.04','despesa','despesas_operacionais',true),
 ('pj','2.04.002','Pró-labore','2.04','despesa','despesas_operacionais',true),
 ('pj','2.04.003','Benefícios (VA, VT, plano de saúde)','2.04','despesa','despesas_operacionais',true),
 ('pj','2.05','Administrativas','2','despesa',null,false),
 ('pj','2.05.001','Aluguel','2.05','despesa','despesas_operacionais',true),
 ('pj','2.05.002','Consultoria','2.05','despesa','despesas_operacionais',true),
 ('pj','2.05.003','Contabilidade','2.05','despesa','despesas_operacionais',true),
 ('pj','2.05.004','Softwares e assinaturas','2.05','despesa','despesas_operacionais',true),
 ('pj','2.05.005','Energia, água e telefone','2.05','despesa','despesas_operacionais',true),
 ('pj','2.05.006','Material de escritório e limpeza','2.05','despesa','despesas_operacionais',true),
 ('pj','2.06','Comerciais','2','despesa',null,false),
 ('pj','2.06.001','Marketing','2.06','despesa','despesas_operacionais',true),
 ('pj','2.06.002','Comissões de vendas','2.06','despesa','despesas_operacionais',true),
 ('pj','2.07','Outras despesas','2','despesa',null,false),
 ('pj','2.07.001','Viagens e deslocamentos','2.07','despesa','despesas_operacionais',true),
 ('pj','2.07.002','Manutenção','2.07','despesa','despesas_operacionais',true),
 ('pj','2.08','Bancos e cartões','2','despesa',null,false),
 ('pj','2.08.001','Tarifas bancárias e IOF','2.08','despesa','resultado_financeiro',true),
 ('pj','2.08.002','Juros e multas pagos','2.08','despesa','resultado_financeiro',true),
 ('pj','2.08.003','Taxas de maquininha e antecipação','2.08','despesa','resultado_financeiro',true),
 ('pj','2.09','Empréstimos','2','despesa',null,false),
 ('pj','2.09.001','Juros de empréstimos e financiamentos','2.09','despesa','resultado_financeiro',true),
 ('pj','2.10','Impostos sobre o lucro (IRPJ e CSLL)','2','despesa',null,false),
 ('pj','2.10.001','IRPJ','2.10','despesa','ir_csll',true),
 ('pj','2.10.002','CSLL','2.10','despesa','ir_csll',true),
 ('pj','3','Saldos e movimentações',null,'despesa',null,false),
 ('pj','3.01','Saldos','3','despesa',null,false),
 ('pj','3.01.001','Saldo inicial','3.01','receita',null,true),
 ('pj','3.01.002','Ajuste de saldo · entrada','3.01','receita',null,true),
 ('pj','3.01.003','Ajuste de saldo · saída','3.01','despesa',null,true),
 ('pj','3.02','Transferências entre contas próprias','3','despesa',null,false),
 ('pj','3.02.001','Transferência · entrada','3.02','receita',null,true),
 ('pj','3.02.002','Transferência · saída','3.02','despesa',null,true),
 ('pj','3.03','Aplicações financeiras','3','despesa',null,false),
 ('pj','3.03.001','Aplicação','3.03','despesa',null,true),
 ('pj','3.03.002','Resgate','3.03','receita',null,true),
 ('pj','3.04','Imobilizado','3','despesa',null,false),
 ('pj','3.04.001','Máquinas, equipamentos e veículos','3.04','despesa',null,true),
 ('pj','3.05','Sócios','3','despesa',null,false),
 ('pj','3.05.001','Distribuição de lucros','3.05','despesa',null,true),
 ('pj','3.05.002','Aporte de capital','3.05','receita',null,true),
 ('pj','3.06','Empréstimos (principal)','3','despesa',null,false),
 ('pj','3.06.001','Empréstimo recebido','3.06','receita',null,true),
 ('pj','3.06.002','Amortização de empréstimo','3.06','despesa',null,true)
;

-- copia o modelo (pj por padrão) para uma empresa nova
drop function if exists privado.copiar_plano_padrao(uuid);
create or replace function privado.copiar_plano_padrao(p_empresa uuid, p_modelo text default 'pj')
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select * from public.plano_contas_modelo where modelo = coalesce(p_modelo, 'pj')
            order by length(codigo), codigo loop
    insert into public.plano_contas (empresa_id, codigo, nome, tipo, grupo_dre, analitica, conta_pai)
    values (p_empresa, r.codigo, r.nome, coalesce(r.tipo, 'despesa'), r.grupo_dre, r.analitica,
            (select id from public.plano_contas where empresa_id = p_empresa and codigo = r.pai))
    on conflict (empresa_id, codigo) do nothing;
  end loop;
  if coalesce(p_modelo, 'pj') = 'pf' then
    insert into public.centros_custo (empresa_id, codigo, nome) values
      (p_empresa, 'CASA', 'Casa'), (p_empresa, 'PES', 'Pessoal')
    on conflict (empresa_id, codigo) do nothing;
  else
    insert into public.centros_custo (empresa_id, codigo, nome) values
      (p_empresa, 'COM', 'Comercial'), (p_empresa, 'OPE', 'Operação'),
      (p_empresa, 'ADM', 'Administrativo'), (p_empresa, 'FIN', 'Financeiro')
    on conflict (empresa_id, codigo) do nothing;
  end if;
end $$;
revoke execute on function privado.copiar_plano_padrao(uuid, text) from public, anon, authenticated;
