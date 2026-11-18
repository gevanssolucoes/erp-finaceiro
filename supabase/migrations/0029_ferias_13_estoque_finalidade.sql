-- 0029 · Férias e 13º em contas separadas no plano de contas + finalidade do produto no estoque
-- Pode rodar mais de uma vez (não duplica).

-- 1) Modelos de plano de contas
-- PJ: grupo 2.04 Pessoal ganha Férias e 13º salário
insert into public.plano_contas_modelo (modelo, codigo, nome, pai, tipo, grupo_dre, analitica)
select 'pj', v.codigo, v.nome, '2.04', 'despesa', 'despesas_operacionais', true
from (values ('2.04.004','Férias'),('2.04.005','13º salário')) v(codigo,nome)
where not exists (select 1 from public.plano_contas_modelo m where m.modelo='pj' and m.codigo=v.codigo);

-- PF: "13º salário e férias" vira duas contas
update public.plano_contas_modelo set nome='13º salário' where modelo='pf' and codigo='1.01.002' and nome='13º salário e férias';
insert into public.plano_contas_modelo (modelo, codigo, nome, pai, tipo, grupo_dre, analitica)
select 'pf','1.01.006','Férias','1.01','receita','receita_bruta',true
where not exists (select 1 from public.plano_contas_modelo m where m.modelo='pf' and m.codigo='1.01.006');

-- 2) Empresas que já existem
do $$
declare r record; novo text; nome_ text;
begin
  -- PJ: quem tem o grupo 2.04 Pessoal recebe Férias e 13º salário (se ainda não tiver conta com esse nome)
  for r in select p.id pai_id, p.empresa_id from public.plano_contas p where p.codigo='2.04' and p.nome ilike 'pessoal' loop
    foreach nome_ in array array['Férias','13º salário'] loop
      if not exists (select 1 from public.plano_contas c where c.empresa_id=r.empresa_id and c.conta_pai=r.pai_id and lower(c.nome)=lower(nome_)) then
        select '2.04.'||lpad((coalesce(max(nullif(split_part(codigo,'.',3),'')::int),0)+1)::text,3,'0') into novo
          from public.plano_contas where empresa_id=r.empresa_id and codigo like '2.04.%' and split_part(codigo,'.',3) ~ '^\d+$';
        insert into public.plano_contas (empresa_id, codigo, nome, tipo, grupo_dre, analitica, conta_pai)
        values (r.empresa_id, novo, nome_, 'despesa', 'despesas_operacionais', true, r.pai_id);
      end if;
    end loop;
  end loop;
  -- PF: "13º salário e férias" passa a se chamar "13º salário" e ganha a irmã "Férias"
  for r in select c.id, c.empresa_id, c.conta_pai, c.codigo from public.plano_contas c where c.nome='13º salário e férias' loop
    update public.plano_contas set nome='13º salário' where id=r.id;
    if not exists (select 1 from public.plano_contas c where c.empresa_id=r.empresa_id and c.conta_pai is not distinct from r.conta_pai and lower(c.nome)='férias') then
      select split_part(r.codigo,'.',1)||'.'||split_part(r.codigo,'.',2)||'.'||lpad((coalesce(max(nullif(split_part(codigo,'.',3),'')::int),0)+1)::text,3,'0') into novo
        from public.plano_contas where empresa_id=r.empresa_id and codigo like split_part(r.codigo,'.',1)||'.'||split_part(r.codigo,'.',2)||'.%' and split_part(codigo,'.',3) ~ '^\d+$';
      insert into public.plano_contas (empresa_id, codigo, nome, tipo, grupo_dre, analitica, conta_pai)
      values (r.empresa_id, novo, 'Férias', 'receita', 'receita_bruta', true, r.conta_pai);
    end if;
  end loop;
end $$;

-- 3) Estoque: para que serve o produto (venda ou uso interno/administrativo)
alter table public.produtos add column if not exists finalidade text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='produtos_finalidade_check') then
    alter table public.produtos add constraint produtos_finalidade_check check (finalidade is null or finalidade in ('venda','administrativo'));
  end if;
end $$;
comment on column public.produtos.finalidade is 'venda = estoque para vender; administrativo = uso interno. Vazio: o app deduz (tem preço/conta de receita = venda).';
