-- Portal master: excluir empresa (com confirmação pelo nome) e desativar empresa (some para os usuários do cliente, nada é apagado).
-- Rodar depois da 0021.

-- ===================== 1) Travas deixam passar quando a empresa inteira está sendo apagada
create or replace function public.bloqueia_versao_congelada() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.empresas where id = old.empresa_id) then return old; end if;
  if exists (select 1 from orcamento_versoes v
             where v.id = coalesce(new.versao_id, old.versao_id) and v.congelada) then
    raise exception 'Versao de orcamento congelada (espelho) nao pode ser alterada';
  end if;
  return coalesce(new, old);
end $$;

create or replace function privado.protege_versao_travada() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.empresas where id = old.empresa_id) then return old; end if;
  if old.congelada then
    raise exception 'Versao travada (espelho) nao pode ser alterada nem apagada';
  end if;
  if tg_op = 'UPDATE' and new.congelada then
    new.congelada_em := now();
  end if;
  return coalesce(new, old);
end $$;

create or replace function privado.extrato_linha_trava() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.empresas where id = old.empresa_id) then return old; end if;
  if exists (select 1 from public.extratos where id = coalesce(new.extrato_id, old.extrato_id) and situacao = 'concluido') then
    raise exception 'Conciliação concluída: peça à conta master para reabrir';
  end if;
  return coalesce(new, old);
end $$;

-- ===================== 2) Empresa desativada não aparece para os usuários do cliente (o master continua vendo)
create or replace function privado.minhas_empresas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.id from public.empresas e where privado.sou_master()
  union
  select ue.empresa_id from public.usuarios_empresas ue
    join public.perfis p on p.usuario_id = ue.usuario_id and p.ativo
    join public.empresas e on e.id = ue.empresa_id and e.ativa
   where ue.usuario_id = (select auth.uid())
     and (select count(distinct e2.grupo_id) from public.usuarios_empresas u2
            join public.empresas e2 on e2.id = u2.empresa_id where u2.usuario_id = ue.usuario_id) <= 1
     and not exists (select 1 from public.assinaturas a
                      where a.grupo_id = e.grupo_id and a.situacao in ('suspenso','cancelado'))
$$;

create or replace function public.ativar_empresa(p_empresa uuid, p_ativa boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not privado.sou_master() then raise exception 'Somente a conta master'; end if;
  update public.empresas set ativa = p_ativa where id = p_empresa;
  if not found then raise exception 'Empresa não encontrada'; end if;
end $$;
revoke execute on function public.ativar_empresa(uuid, boolean) from public, anon;
grant execute on function public.ativar_empresa(uuid, boolean) to authenticated;

-- ===================== 3) Excluir de vez: só o master, e só digitando o nome da empresa
create or replace function public.excluir_empresa(p_empresa uuid, p_confirmacao text) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if not privado.sou_master() then raise exception 'Somente a conta master pode excluir empresas'; end if;
  select coalesce(nullif(trim(nome_fantasia), ''), razao_social) into v_nome from public.empresas where id = p_empresa;
  if v_nome is null then raise exception 'Empresa não encontrada'; end if;
  if lower(trim(coalesce(p_confirmacao, ''))) <> lower(trim(v_nome)) then
    raise exception 'Para excluir, digite exatamente o nome: %', v_nome;
  end if;
  delete from public.empresas where id = p_empresa;
  return v_nome;
end $$;
revoke execute on function public.excluir_empresa(uuid, text) from public, anon;
grant execute on function public.excluir_empresa(uuid, text) to authenticated;
