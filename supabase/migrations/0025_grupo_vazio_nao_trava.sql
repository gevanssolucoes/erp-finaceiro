-- Correção: depois de apagar todas as empresas, a pessoa continuava "administradora" de um grupo vazio
-- e por isso não podia ser colocada numa empresa de outro grupo. Grupo sem nenhuma empresa não conta mais:
-- o vínculo de administrador desse grupo vazio é retirado e o cadastro segue. Rodar depois da 0024.
create or replace function privado.trava_grupo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_grupo uuid;
begin
  if privado.eh_master(new.usuario_id) then return new; end if;
  if tg_table_name = 'usuarios_empresas' then
    v_grupo := privado.grupo_da_empresa(new.empresa_id);
  else
    v_grupo := new.grupo_id;
  end if;
  -- administrador de grupo que não tem mais nenhuma empresa: tira o vínculo velho
  delete from public.grupos_admins ga
   where ga.usuario_id = new.usuario_id and ga.grupo_id is distinct from v_grupo
     and not exists (select 1 from public.empresas e where e.grupo_id = ga.grupo_id);
  if exists (select 1 from public.usuarios_empresas ue join public.empresas e on e.id = ue.empresa_id
              where ue.usuario_id = new.usuario_id and e.grupo_id is distinct from v_grupo)
     or exists (select 1 from public.grupos_admins ga
                 where ga.usuario_id = new.usuario_id and ga.grupo_id is distinct from v_grupo) then
    raise exception 'Esta pessoa já usa o app em outro cliente (grupo de empresas). Cada usuário só pode acessar empresas do mesmo cliente.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
