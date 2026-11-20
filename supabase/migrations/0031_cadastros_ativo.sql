-- Cadastros da empresa: o admin (ou financeiro) desativa um cadastro que já foi usado em lançamentos,
-- em vez de apagar. Desativado some das listas de escolha, mas continua nos relatórios antigos.
-- Só acrescenta; nada é apagado. Rodar depois da 0030.
alter table public.centros_custo add column if not exists ativo boolean not null default true;
alter table public.parceiros     add column if not exists ativo boolean not null default true;
alter table public.produtos      add column if not exists ativo boolean not null default true;
do $$ declare t text; begin
  foreach t in array array['centros_custo','parceiros','produtos','predios','departamentos'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_trilha') then
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function privado.auditar()', t || '_trilha', t);
    end if;
  end loop;
end $$;
