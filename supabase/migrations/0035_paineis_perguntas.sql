-- Perguntas do negócio: nova parte do painel (base com real, orçado e forecast por regional, cidade e empresa).
alter table public.dados_paineis drop constraint if exists dados_paineis_parte_check;
alter table public.dados_paineis add constraint dados_paineis_parte_check check (parte in ('resumo','movimentos','auditoria','perguntas'));
