-- Dois produtos separados: "gestor" (ERP completo) e "dados" (Gevans Dados: só sobe a base e vê os indicadores).
-- A conta master escolhe o produto ao criar a empresa e pode trocar depois. Quem é só de empresas "dados"
-- entra pela porta do Gevans Dados e vê apenas Indicadores, Conexões de dados e Usuários.
-- Só acrescenta; nada é apagado. Rodar depois da 0031.
alter table public.empresas add column if not exists produto text not null default 'gestor' check (produto in ('gestor', 'dados'));

create or replace function public.definir_produto_empresa(p_empresa uuid, p_produto text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not privado.sou_master() then raise exception 'Só a conta master define o produto da empresa.' using errcode = '42501'; end if;
  if p_produto not in ('gestor', 'dados') then raise exception 'Produto inválido.'; end if;
  update public.empresas set produto = p_produto where id = p_empresa;
  if not found then raise exception 'Empresa não encontrada.'; end if;
end $$;
revoke execute on function public.definir_produto_empresa(uuid, text) from public, anon;
grant execute on function public.definir_produto_empresa(uuid, text) to authenticated;

-- lista do portal master passa a mostrar o produto (muda o tipo de retorno, por isso drop + create)
drop function if exists public.master_empresas();
create function public.master_empresas() returns table (
  id uuid, cnpj text, razao_social text, nome_fantasia text, tipo_pessoa text, grupo_id uuid, ativa boolean, criado_em timestamptz, usuarios bigint, produto text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not privado.sou_master() then raise exception 'Somente a conta master'; end if;
  return query
  select e.id, e.cnpj, e.razao_social, e.nome_fantasia, e.tipo_pessoa::text, e.grupo_id, e.ativa, e.criado_em,
         (select count(*) from public.usuarios_empresas ue join public.perfis p on p.usuario_id = ue.usuario_id and not p.master
           where ue.empresa_id = e.id),
         e.produto
    from public.empresas e order by coalesce(nullif(trim(e.nome_fantasia), ''), e.razao_social);
end $$;
revoke execute on function public.master_empresas() from public, anon;
grant execute on function public.master_empresas() to authenticated;
