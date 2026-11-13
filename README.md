# Gevans Gestor (ERP Financeiro) multiempresa

App web (HTML + JavaScript) ligado ao Supabase: DRE, fluxo de caixa, contas a pagar e receber,
lançamentos, plano de contas, empresas e prédios, importação de dados antigos por Excel e
controle de usuários pela conta master.

## Estrutura

- `docs/` – o app publicado no GitHub Pages (`index.html` único, bibliotecas em `docs/vendor/`,
  planilha modelo de importação `modelo_importacao.xlsx`).
- `supabase/migrations/` – banco de dados (aplicado no projeto Supabase `erp-financeiro`):
  - `0001_base.sql` empresas, plano de contas, premissas, orçamento com espelhos, NF, lançamentos, parcelas, estoque, visões de DRE e fluxo, RLS por empresa.
  - `0002_ajustes_seguranca.sql` funções auxiliares fora da API e índices.
  - `0003_predios_bancos_conciliacao.sql` prédios, contas bancárias, extratos e importações.
  - `0004_usuarios_master.sql` conta master, perfis, cadastro só por convite, acesso por papel e por prédio, plano de contas padrão.
  - `0013_pagamentos_cnab.sql` dados bancários do fornecedor, boleto na parcela, lotes de pagamento com aprovação e arquivos de remessa e retorno.
  - `0019_dados_cartao_cnpj.sql` dados do Cartão CNPJ na empresa (CNAE principal e secundários, natureza jurídica, porte, situação, endereço, contato e inscrições).
  - `0020_nf_cobranca_api.sql` emissão de NF (Focus NFe) e cobrança por boleto/PIX (Asaas): `nf_emitidas`, `cobrancas`, credenciais em `privado.integracoes` (fora da API) e `cobranca_baixar`, que quita a parcela e lança a tarifa quando o banco avisa o pagamento. Funções `integracoes` e `integracoes-webhook`; tela em `docs/nf.js`. Sem token, tudo roda em modo simulado.
  - `0018_grupos_empresas.sql` grupos de empresas (um grupo por cliente): ninguém fora da equipe master é ligado a empresas de dois grupos, administrador do grupo, empresa nova dentro do grupo e `verificar_isolamento()` (só master).
  - `0007_compras.sql` esteira de compras (pedido, confirmação, cotações, aprovação com verba do orçamento, compra, entrega) e ligação com estoque e contas a pagar.
- `supabase/functions/usuarios-admin/` – função que a tela Usuários usa para convidar, alterar e desativar acessos (só a conta master).
- `python/nfe/` – leitura do XML da NF-e e geração de parcelas pela premissa da conta.
  Testes: `cd python && python3 -m unittest tests/test_nfe.py -v`
- Extratos e conciliação (menu Controle): importa extrato bancário em OFX, CSV ou PDF (layout do Nubank e layout comum
  "data histórico valor"), confere com as baixas, dá baixa em contas em aberto, lança o que falta e aprende a conta do plano
  pelo histórico (`regras_classificacao`). Leitor de PDF em `docs/vendor/pdf.min.js` (pdf.js 3.11.174), carregado só quando precisa.
- `docs/cartao-cnpj.js` – cadastro da empresa conforme o Cartão CNPJ (Empresas › Editar dados e Nova empresa): busca na Receita pela função `supabase/functions/cnpj` (BrasilAPI, minhareceita.org e publica.cnpj.ws) e leitura do PDF do comprovante; sugere atividade pelo CNAE e Simples pela opção na Receita.
- `docs/grupos.js` – tela Grupos de empresas (Cadastros): grupos, administradores de grupo, mudar empresa de grupo, consolidado do grupo e verificação de isolamento.
- `docs/compras.js` – módulo da esteira de compras e da tela de estoque (carregado pelo `index.html`).
- `docs/pagamentos.js` – pagamentos a fornecedores por arquivo CNAB 240 (layout FEBRABAN): lote, aprovação, remessa e leitura do retorno (carregado pelo `compras.js`).
- `tests/teste_cnab.js` – testes do gerador e do leitor CNAB 240: `node tests/teste_cnab.js`.
- `tests/teste_pagamentos.js` – fluxo da tela de pagamentos com o Supabase simulado.
- `tests/teste_app.js` – teste do app no navegador (Playwright) com um Supabase simulado.
- `tests/teste_compras.js` – fluxo completo da esteira de compras com o mesmo Supabase simulado.

## Acesso

Só entra quem foi convidado pela conta master. A conta master cria a própria senha uma única vez em
“Primeiro acesso da conta master” na tela de login.

A chave usada no `index.html` é a chave pública (anon) do Supabase; a segurança dos dados é feita pelas
regras de acesso (RLS) no banco.
