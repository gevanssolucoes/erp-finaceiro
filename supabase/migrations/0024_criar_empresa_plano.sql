-- Criar empresa escolhendo o plano de contas: padrão PJ, padrão PF, sem plano (vazio) ou copiado de outra empresa.
-- Mesmo comportamento de antes quando p_modelo não é informado (usa o tipo da empresa). Rodar depois da 0023.
drop function if exists public.criar_empresa(text, text, text, text, text, text, text, uuid, uuid);
create or replace function public.criar_empresa(
  p_cnpj text, p_razao_social text, p_nome_fantasia text default null,
  p_tipo text default 'pj', p_regime text default null, p_atividade text default null,
  p_cor text default null, p_copiar_de uuid default null, p_grupo uuid default null, p_modelo text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tipo text := coalesce(p_tipo, 'pj'); v_grupo uuid := p_grupo; v_master boolean := privado.sou_master();
begin
  if not v_master then
    if v_grupo is null and (select count(*) from privado.meus_grupos_admin()) = 1 then
      select g into v_grupo from privado.meus_grupos_admin() g;
    end if;
    if v_grupo is null or not privado.sou_admin_grupo(v_grupo) then
      raise exception 'Somente a conta master ou o administrador do grupo pode criar empresas';
    end if;
  end if;
  if v_grupo is not null and not exists (select 1 from public.grupos where id = v_grupo) then
    raise exception 'Grupo não encontrado';
  end if;
  if p_copiar_de is not null and not v_master and privado.grupo_da_empresa(p_copiar_de) is distinct from v_grupo then
    raise exception 'Só dá para copiar o plano de uma empresa do mesmo grupo';
  end if;
  if p_modelo is not null and p_modelo not in ('pj', 'pf', 'vazio') then raise exception 'Plano de contas inválido'; end if;
  if v_tipo = 'pj' and length(p_cnpj) <> 14 then raise exception 'O CNPJ precisa ter 14 dígitos'; end if;
  if v_tipo = 'pf' and length(p_cnpj) not in (11, 14) then raise exception 'O CPF precisa ter 11 dígitos'; end if;
  insert into empresas (cnpj, razao_social, nome_fantasia, tipo_pessoa, regime_tributario, atividade, cor, grupo_id)
    values (p_cnpj, p_razao_social, nullif(trim(p_nome_fantasia), ''), v_tipo,
            case when v_tipo = 'pj' then p_regime end, case when v_tipo = 'pj' then p_atividade end, p_cor, v_grupo)
    returning id into v_id;
  if not v_master then insert into usuarios_empresas (usuario_id, empresa_id, papel) values (auth.uid(), v_id, 'admin')
    on conflict (usuario_id, empresa_id) do update set papel = 'admin'; end if;
  if p_copiar_de is not null then
    perform privado.copiar_plano_de(v_id, p_copiar_de);
  elsif coalesce(p_modelo, '') <> 'vazio' then
    perform privado.copiar_plano_padrao(v_id, coalesce(p_modelo, v_tipo));
  end if;
  return v_id;
end $$;
revoke execute on function public.criar_empresa(text, text, text, text, text, text, text, uuid, uuid, text) from public, anon;
grant execute on function public.criar_empresa(text, text, text, text, text, text, text, uuid, uuid, text) to authenticated;
