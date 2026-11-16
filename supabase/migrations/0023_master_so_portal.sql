-- Regra (Evaldo, 2026-11-16): a conta master só cria empresas, cria usuários dentro delas, pausa e exclui empresas.
-- Ela NÃO entra nos dados das empresas. Toda a manutenção de dentro da empresa (cadastros, plano de contas,
-- reabrir conciliação, alçadas, auditoria, CNPJ) fica com o administrador da própria empresa, pelo app.
-- Rodar depois da 0022.

-- ===================== 1) Funções de acesso a dados: o master deixa de ter passe livre
-- (troca "privado.sou_master()" por "false" no corpo atual de cada função, sem mexer no resto)
do $$
declare f text; d text;
begin
  foreach f in array array[
    'privado.cuida_pessoas(uuid)', 'privado.pode_aprovar(uuid,text,numeric,uuid)', 'privado.pode_editar(uuid)',
    'privado.predio_permitido(uuid)', 'privado.sou_admin(uuid)', 'privado.segrega_baixa()', 'privado.pagamento_lote_valida()'
  ] loop
    d := pg_get_functiondef(f::regprocedure);
    if position('privado.sou_master()' in d) > 0 then execute replace(d, 'privado.sou_master()', 'false'); end if;
  end loop;
  -- reabrir conciliação concluída: passa a ser do administrador da empresa
  d := pg_get_functiondef('privado.extrato_situacao_valida()'::regprocedure);
  d := replace(d, 'not privado.sou_master()', 'not privado.sou_admin(old.empresa_id)');
  d := replace(d, 'Só a conta master reabre', 'Só o administrador da empresa reabre');
  execute d;
  -- criar empresa: o master não vira usuário da empresa que cria (quem cuida é o administrador convidado)
  d := pg_get_functiondef('public.criar_empresa(text,text,text,text,text,text,text,uuid,uuid)'::regprocedure);
  d := replace(d, 'insert into usuarios_empresas (usuario_id, empresa_id, papel) values (auth.uid(), v_id, ''admin'')',
                  'if not v_master then insert into usuarios_empresas (usuario_id, empresa_id, papel) values (auth.uid(), v_id, ''admin'')');
  d := replace(d, 'on conflict (usuario_id, empresa_id) do update set papel = ''admin'';',
                  'on conflict (usuario_id, empresa_id) do update set papel = ''admin''; end if;');
  execute d;
end $$;

-- ===================== 2) Empresas que a pessoa enxerga: só as dela (o master não enxerga nenhuma)
create or replace function privado.minhas_empresas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select ue.empresa_id from public.usuarios_empresas ue
    join public.perfis p on p.usuario_id = ue.usuario_id and p.ativo and not p.master
    join public.empresas e on e.id = ue.empresa_id and e.ativa
   where ue.usuario_id = (select auth.uid())
     and (select count(distinct e2.grupo_id) from public.usuarios_empresas u2
            join public.empresas e2 on e2.id = u2.empresa_id where u2.usuario_id = ue.usuario_id) <= 1
     and not exists (select 1 from public.assinaturas a
                      where a.grupo_id = e.grupo_id and a.situacao in ('suspenso','cancelado'))
$$;

-- vínculos antigos da conta master com empresas deixam de existir
delete from public.usuarios_empresas where usuario_id in (select usuario_id from public.perfis where master);
delete from public.usuarios_predios where usuario_id in (select usuario_id from public.perfis where master);

-- ===================== 3) Políticas que davam acesso direto ao master
drop policy if exists alcadas_grava on public.alcadas;
create policy alcadas_grava on public.alcadas for all to authenticated
  using ((select privado.sou_admin(empresa_id))) with check ((select privado.sou_admin(empresa_id)));
drop policy if exists auditoria_leitura on public.auditoria;
create policy auditoria_leitura on public.auditoria for select to authenticated
  using (exists (select 1 from public.usuarios_empresas ue
                  where ue.usuario_id = (select auth.uid()) and ue.empresa_id = auditoria.empresa_id
                    and ue.papel in ('admin','financeiro')));
-- registro de acessos: o administrador vê o da própria empresa (o master continua vendo quem entrou, sem dados)
drop policy if exists acessos_admin on public.acessos;
create policy acessos_admin on public.acessos for select to authenticated
  using (empresa_id is not null and (select privado.sou_admin(empresa_id)));

-- Empresa: todos da empresa leem; só o administrador altera; criar, pausar e excluir só pelas funções do master
drop policy if exists empresas_acesso on public.empresas;
drop policy if exists empresas_leitura on public.empresas;
drop policy if exists empresas_altera on public.empresas;
create policy empresas_leitura on public.empresas for select to authenticated
  using (id in (select privado.minhas_empresas()));
create policy empresas_altera on public.empresas for update to authenticated
  using ((select privado.sou_admin(id))) with check ((select privado.sou_admin(id)));

-- ===================== 4) Lista de empresas para o portal master (só dados de cadastro, nada financeiro)
create or replace function public.master_empresas() returns table (
  id uuid, cnpj text, razao_social text, nome_fantasia text, tipo_pessoa text, grupo_id uuid, ativa boolean, criado_em timestamptz, usuarios bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not privado.sou_master() then raise exception 'Somente a conta master'; end if;
  return query
  select e.id, e.cnpj, e.razao_social, e.nome_fantasia, e.tipo_pessoa::text, e.grupo_id, e.ativa, e.criado_em,
         (select count(*) from public.usuarios_empresas ue join public.perfis p on p.usuario_id = ue.usuario_id and not p.master
           where ue.empresa_id = e.id)
    from public.empresas e order by coalesce(nullif(trim(e.nome_fantasia), ''), e.razao_social);
end $$;
revoke execute on function public.master_empresas() from public, anon;
grant execute on function public.master_empresas() to authenticated;
