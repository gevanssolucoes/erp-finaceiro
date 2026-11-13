// Emissão de NF (Focus NFe) e cobrança por boleto/PIX (Asaas), por empresa.
// Sem token configurado, roda em modo "simulado": a nota sai autorizada sem valor fiscal e a cobrança
// ganha uma linha digitável e um PIX de teste, para o fluxo inteiro (NF → cobrança → baixa no caixa) ser testado.
// O certificado A1 é repassado ao emissor na hora e não fica guardado aqui.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });
const FOCUS: Record<string, string> = { homologacao: "https://homologacao.focusnfe.com.br", producao: "https://api.focusnfe.com.br" };
const ASAAS: Record<string, string> = { homologacao: "https://api-sandbox.asaas.com/v3", producao: "https://api.asaas.com/v3" };
const CONFIG_OK = ["codigo_municipio", "inscricao_municipal", "serie", "item_lista_servico", "codigo_tributario_municipio",
  "aliquota_iss", "modelo", "conta_bancaria_id", "tarifa_boleto", "tarifa_pix", "focus_empresa_id", "regime_focus", "natureza_operacao"];
const soDig = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
class Falha extends Error { constructor(m: string, public status = 400) { super(m); } }

const url = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const WEBHOOK = `${url}/functions/v1/integracoes-webhook`;

async function integ(emp: string, servico: string) {
  const { data, error } = await admin.rpc("integracao_ler", { p_emp: emp, p_servico: servico });
  if (error) throw error;
  return data && data.empresa_id ? data : { provedor: "simulado", ambiente: "simulado", token: null, config: {}, webhook_token: null };
}
async function http(metodo: string, u: string, headers: Record<string, string>, body?: unknown) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(u, { method: metodo, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
    const txt = await r.text(); let j: any = null; try { j = JSON.parse(txt); } catch { j = { texto: txt.slice(0, 500) }; }
    return { ok: r.ok, status: r.status, j };
  } catch (e) { throw new Falha("O provedor não respondeu a tempo: " + (e as Error).message, 502); }
  finally { clearTimeout(t); }
}
const focusAuth = (token: string) => ({ Authorization: "Basic " + btoa(token + ":") });
const asaasAuth = (token: string) => ({ access_token: token, "User-Agent": "gestor-financeiro" });
const erroFocus = (j: any) => (j?.erros || []).map((e: any) => e.mensagem).filter(Boolean).join(" · ") || j?.mensagem || j?.texto || "erro no emissor";
const erroAsaas = (j: any) => (j?.errors || []).map((e: any) => e.description).filter(Boolean).join(" · ") || j?.texto || "erro no banco";

// ---------- NF
function mapaFocus(j: any, base: string) {
  const st = j?.status;
  const out: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (st === "autorizado") {
    Object.assign(out, { status: "autorizada", numero: j.numero ?? j.numero_nfse ?? null, codigo_verificacao: j.codigo_verificacao ?? null,
      chave_acesso: j.chave_nfe ?? j.chave_nfse ?? null, url_pdf: j.url_danfse ?? j.url ?? (j.caminho_danfe ? base + j.caminho_danfe : null),
      url_xml: j.caminho_xml_nota_fiscal ? base + j.caminho_xml_nota_fiscal : null, mensagem: null });
  } else if (st === "erro_autorizacao" || st === "denegado") Object.assign(out, { status: "erro", mensagem: erroFocus(j).slice(0, 2000) });
  else if (st === "cancelado") Object.assign(out, { status: "cancelada" });
  else Object.assign(out, { status: "processando" });
  return out;
}
async function consultarNf(nf: any) {
  if (nf.provedor !== "focusnfe") return nf;
  const it = await integ(nf.empresa_id, "nf"); if (!it.token) throw new Falha("Token do emissor não configurado.");
  const base = FOCUS[nf.ambiente] || FOCUS.homologacao, rota = nf.modelo === "nfe" ? "nfe" : nf.modelo === "nfse_nacional" ? "nfsen" : "nfse";
  const r = await http("GET", `${base}/v2/${rota}/${encodeURIComponent(nf.ref)}`, focusAuth(it.token));
  if (!r.ok && r.status !== 404) throw new Falha("Emissor: " + erroFocus(r.j), 502);
  const up = r.ok ? mapaFocus(r.j, base) : { mensagem: "Ainda não localizada no emissor." };
  const { data, error } = await admin.from("nf_emitidas").update(up).eq("id", nf.id).select().single(); if (error) throw error;
  if (data.status === "autorizada" && data.numero && data.lancamento_id) await marcarLanc(data);
  return data;
}
async function marcarLanc(nf: any) {
  await admin.from("lancamentos").update({ numero_nf: String(nf.numero) }).eq("id", nf.lancamento_id).is("numero_nf", null);
  await admin.from("lancamentos").update({ descricao: "NF " + nf.numero }).eq("id", nf.lancamento_id).is("descricao", null);
}
async function emitirNf(emp: string, b: any, uid: string) {
  const d = b.dados || {};
  const valor = Math.round(Number(d.valor) * 100) / 100; if (!(valor > 0)) throw new Falha("Informe o valor da nota.");
  const docT = soDig(d.tomador?.documento); if (docT && docT.length !== 11 && docT.length !== 14) throw new Falha("CPF/CNPJ do cliente inválido.");
  let lanc: any = null;
  if (b.lancamento_id) {
    const { data } = await admin.from("lancamentos").select("id,empresa_id,parceiro_id,numero_nf").eq("id", b.lancamento_id).maybeSingle();
    if (!data || data.empresa_id !== emp) throw new Falha("Faturamento não encontrado nesta empresa.");
    lanc = data;
  }
  const { data: e } = await admin.from("empresas").select("*").eq("id", emp).single();
  const it = await integ(emp, "nf"); const cfg = it.config || {};
  const real = it.provedor === "focusnfe" && it.token && it.ambiente !== "simulado";
  const modelo = ["nfse", "nfse_nacional", "nfe"].includes(d.modelo) ? d.modelo : (cfg.modelo || "nfse");
  const ref = "gg" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const aliq = d.aliquota_iss != null && d.aliquota_iss !== "" ? Number(d.aliquota_iss) : (cfg.aliquota_iss != null ? Number(cfg.aliquota_iss) : null);
  const linha: Record<string, unknown> = {
    empresa_id: emp, modelo, provedor: real ? "focusnfe" : "simulado", ambiente: real ? it.ambiente : "simulado", ref, status: "processando",
    data_emissao: d.data_emissao || hoje(), parceiro_id: lanc?.parceiro_id ?? null, tomador_nome: String(d.tomador?.nome || "").slice(0, 200) || null,
    tomador_documento: docT || null, tomador_email: String(d.tomador?.email || "").slice(0, 200) || null,
    discriminacao: String(d.discriminacao || "").slice(0, 2000) || null, codigo_servico: String(d.codigo_servico || cfg.item_lista_servico || "").slice(0, 20) || null,
    valor_servicos: valor, aliquota_iss: aliq, iss_retido: !!d.iss_retido, valor_iss: aliq != null ? Math.round(valor * aliq) / 100 : null,
    valor_cbs: d.valor_cbs ?? null, valor_ibs: d.valor_ibs ?? null, lancamento_id: lanc?.id ?? null, criado_por: uid,
  };
  if (!real) {
    const { count } = await admin.from("nf_emitidas").select("id", { count: "exact", head: true }).eq("empresa_id", emp).eq("ambiente", "simulado");
    Object.assign(linha, { status: "autorizada", numero: String((count || 0) + 1), codigo_verificacao: crypto.randomUUID().slice(0, 8).toUpperCase(),
      mensagem: "Emitida em modo simulado, sem valor fiscal. Configure o emissor para emitir de verdade." });
    const { data, error } = await admin.from("nf_emitidas").insert(linha).select().single(); if (error) throw error;
    if (lanc) await marcarLanc(data);
    return data;
  }
  if (!e.cnpj || e.cnpj.length !== 14) throw new Falha("A empresa precisa de CNPJ para emitir nota.");
  const base = FOCUS[it.ambiente];
  let corpo: any, rota: string;
  if (modelo === "nfe") throw new Falha("NF-e de produto entra na próxima etapa. Use NFS-e para serviços.");
  const tomador: any = { razao_social: linha.tomador_nome, email: linha.tomador_email || undefined };
  if (docT.length === 14) tomador.cnpj = docT; else if (docT.length === 11) tomador.cpf = docT;
  if (d.tomador?.endereco) tomador.endereco = d.tomador.endereco;
  if (modelo === "nfse_nacional") {
    rota = "nfsen";
    corpo = { data_emissao: linha.data_emissao, data_competencia: linha.data_emissao, codigo_municipio_emissora: cfg.codigo_municipio,
      cnpj_prestador: e.cnpj, inscricao_municipal_prestador: cfg.inscricao_municipal || e.inscricao_municipal || undefined,
      codigo_opcao_simples_nacional: e.regime_tributario === "simples_nacional" ? 3 : 1, regime_especial_tributacao: 0,
      cnpj_tomador: tomador.cnpj, cpf_tomador: tomador.cpf, razao_social_tomador: tomador.razao_social, email_tomador: tomador.email,
      codigo_municipio_prestacao: cfg.codigo_municipio, codigo_tributacao_nacional_iss: linha.codigo_servico,
      descricao_servico: linha.discriminacao, valor_servico: valor, tributacao_iss: 1, tipo_retencao_iss: linha.iss_retido ? 2 : 1 };
  } else {
    rota = "nfse";
    corpo = { data_emissao: linha.data_emissao,
      prestador: { cnpj: e.cnpj, inscricao_municipal: cfg.inscricao_municipal || e.inscricao_municipal, codigo_municipio: cfg.codigo_municipio },
      tomador, natureza_operacao: cfg.natureza_operacao || 1, optante_simples_nacional: e.regime_tributario === "simples_nacional",
      servico: { valor_servicos: valor, aliquota: aliq ?? undefined, iss_retido: !!linha.iss_retido, item_lista_servico: linha.codigo_servico,
        codigo_tributario_municipio: cfg.codigo_tributario_municipio || undefined, discriminacao: linha.discriminacao } };
  }
  if (!cfg.codigo_municipio) throw new Falha("Informe o código IBGE do município da empresa em Integrações > Emissor.");
  const { data: nf, error } = await admin.from("nf_emitidas").insert(linha).select().single(); if (error) throw error;
  const r = await http("POST", `${base}/v2/${rota}?ref=${ref}`, focusAuth(it.token), corpo);
  if (!r.ok) {
    const { data } = await admin.from("nf_emitidas").update({ status: "erro", mensagem: erroFocus(r.j).slice(0, 2000), atualizado_em: new Date().toISOString() }).eq("id", nf.id).select().single();
    return data;
  }
  await new Promise((ok) => setTimeout(ok, 2500));
  return await consultarNf(nf);
}
async function cancelarNf(emp: string, b: any) {
  const { data: nf } = await admin.from("nf_emitidas").select("*").eq("id", b.nf_id).eq("empresa_id", emp).maybeSingle();
  if (!nf) throw new Falha("Nota não encontrada.");
  const just = String(b.justificativa || "").trim(); if (just.length < 15) throw new Falha("A justificativa precisa ter pelo menos 15 letras.");
  if (nf.provedor === "focusnfe") {
    const it = await integ(emp, "nf"); const base = FOCUS[nf.ambiente], rota = nf.modelo === "nfse_nacional" ? "nfsen" : nf.modelo === "nfe" ? "nfe" : "nfse";
    const r = await http("DELETE", `${base}/v2/${rota}/${nf.ref}`, focusAuth(it.token), { justificativa: just });
    if (!r.ok) throw new Falha("Emissor: " + erroFocus(r.j), 502);
    if (r.j?.status && r.j.status !== "cancelado") {
      const { data } = await admin.from("nf_emitidas").update({ mensagem: "Cancelamento pedido: " + (r.j.mensagem || r.j.status) }).eq("id", nf.id).select().single(); return data;
    }
  }
  const { data, error } = await admin.from("nf_emitidas").update({ status: "cancelada", mensagem: "Cancelada: " + just.slice(0, 300), atualizado_em: new Date().toISOString() }).eq("id", nf.id).select().single();
  if (error) throw error; return data;
}
async function enviarCertificado(emp: string, b: any) {
  const it = await integ(emp, "nf");
  if (it.provedor !== "focusnfe" || !it.token) throw new Falha("Configure o token do Focus NFe antes de enviar o certificado.");
  const arq = String(b.arquivo_base64 || ""), senha = String(b.senha || "");
  if (arq.length < 500 || arq.length > 400000) throw new Falha("Arquivo do certificado inválido (.pfx ou .p12).");
  if (!senha) throw new Falha("Informe a senha do certificado.");
  const { data: e } = await admin.from("empresas").select("*").eq("id", emp).single();
  const reg = e.regime_tributario === "simples_nacional" ? 1 : 3;
  const corpo = { nome: e.razao_social, nome_fantasia: e.nome_fantasia || e.razao_social, cnpj: e.cnpj, inscricao_municipal: it.config?.inscricao_municipal || e.inscricao_municipal,
    inscricao_estadual: e.inscricao_estadual ? soDig(e.inscricao_estadual) : undefined, regime_tributario: it.config?.regime_focus || reg,
    email: e.email, telefone: e.telefone, logradouro: e.logradouro, numero: e.numero, complemento: e.complemento, bairro: e.bairro,
    cep: soDig(e.cep), municipio: e.municipio, uf: e.uf, habilita_nfse: true, arquivo_certificado_base64: arq, senha_certificado: senha };
  const idF = it.config?.focus_empresa_id;
  const r = await http(idF ? "PUT" : "POST", `${FOCUS.producao}/v2/empresas${idF ? "/" + idF : ""}`, focusAuth(it.token), corpo);
  if (!r.ok) throw new Falha("Emissor recusou o certificado: " + erroFocus(r.j), 400);
  const validade = r.j?.certificado_valido_ate ? String(r.j.certificado_valido_ate).slice(0, 10) : null;
  const cfgNovo: Record<string, unknown> = { focus_empresa_id: r.j?.id ?? idF ?? null };
  const tokenEmp = it.ambiente === "producao" ? r.j?.token_producao : r.j?.token_homologacao;
  await admin.rpc("integracao_salvar", { p_emp: emp, p_servico: "nf", p_provedor: "focusnfe", p_ambiente: it.ambiente, p_token: tokenEmp || "", p_config: cfgNovo, p_usuario: null });
  await admin.rpc("integracao_certificado", { p_emp: emp, p_validade: validade });
  return { ok: true, validade };
}

// ---------- cobranças
function linhaFake(valor: number, venc: string) {
  const fator = Math.round((Date.parse(venc) - Date.parse("2025-02-22")) / 864e5) + 1000;
  const campo = (s: string) => { let soma = 0, p = 2; for (let i = s.length - 1; i >= 0; i--) { const n = +s[i] * p; soma += n > 9 ? Math.floor(n / 10) + (n % 10) : n; p = p === 2 ? 1 : 2; } return s + ((10 - (soma % 10)) % 10); };
  const livre = String(Math.floor(Math.random() * 1e12)).padStart(25, "0").slice(0, 25);
  const v = String(Math.round(valor * 100)).padStart(10, "0"), f = String(fator).padStart(4, "0");
  const bc0 = "9999" + f + v + livre; let soma = 0, p = 2; for (let i = bc0.length - 1; i >= 0; i--) { soma += +bc0[i] * p; p = p === 9 ? 2 : p + 1; }
  let dv = 11 - (soma % 11); if (dv === 0 || dv > 9) dv = 1;
  return campo("9999" + livre.slice(0, 5)) + campo(livre.slice(5, 15)) + campo(livre.slice(15, 25)) + dv + f + v;
}
async function clienteAsaas(base: string, token: string, p: any) {
  const doc = soDig(p.documento); if (doc.length !== 11 && doc.length !== 14) throw new Falha(`Cadastre o CPF/CNPJ de ${p.nome || "cliente"} para gerar a cobrança no banco.`);
  const q = await http("GET", `${base}/customers?cpfCnpj=${doc}`, asaasAuth(token));
  if (q.ok && q.j?.data?.length) return q.j.data[0].id;
  const c = await http("POST", `${base}/customers`, asaasAuth(token), { name: p.nome, cpfCnpj: doc, email: p.email || undefined, notificationDisabled: false });
  if (!c.ok) throw new Falha("Banco: " + erroAsaas(c.j), 400);
  return c.j.id;
}
async function criarCobrancas(emp: string, b: any, uid: string) {
  const tipo = ["boleto", "pix", "boleto_pix"].includes(b.tipo) ? b.tipo : "boleto_pix";
  const ids: string[] = (b.parcela_ids || []).slice(0, 60);
  if (!ids.length) throw new Falha("Escolha ao menos uma parcela a receber.");
  const { data: ps, error } = await admin.from("parcelas").select("id,empresa_id,lancamento_id,numero,vencimento,valor,status").in("id", ids);
  if (error) throw error;
  const it = await integ(emp, "banco"); const real = it.provedor === "asaas" && it.token && it.ambiente !== "simulado";
  const base = ASAAS[it.ambiente] || ASAAS.homologacao;
  const out: any[] = [];
  for (const p of ps || []) {
    if (p.empresa_id !== emp || p.status !== "aberta" || !(Number(p.valor) > 0)) continue;
    const { data: ja } = await admin.from("cobrancas").select("id").eq("parcela_id", p.id).in("status", ["pendente", "paga"]).limit(1);
    if (ja?.length) continue;
    const { data: l } = await admin.from("lancamentos").select("id,parceiro_id,numero_nf,descricao").eq("id", p.lancamento_id).single();
    const { data: parc } = l.parceiro_id ? await admin.from("parceiros").select("nome,documento,email").eq("id", l.parceiro_id).single() : { data: null };
    const venc = p.vencimento < hoje() ? hoje() : p.vencimento;
    const linha: any = { empresa_id: emp, parcela_id: p.id, nf_id: b.nf_id || null, provedor: real ? "asaas" : "simulado", ambiente: real ? it.ambiente : "simulado",
      tipo, valor: Number(p.valor), vencimento: venc, status: "pendente", criado_por: uid };
    const { data: cob, error: e1 } = await admin.from("cobrancas").insert(linha).select().single(); if (e1) throw e1;
    let up: any;
    if (!real) {
      up = { externo_id: "sim_" + cob.id.slice(0, 18), linha_digitavel: tipo === "pix" ? null : linhaFake(cob.valor, venc),
        pix_copia_cola: tipo === "boleto" ? null : `00020126580014br.gov.bcb.pix0136${cob.id}5204000053039865406${cob.valor.toFixed(2)}5802BR5915GESTOR SIMULADO6009SAO PAULO62070503***6304SIMU`,
        mensagem: "Cobrança simulada, sem valor bancário. Use “Simular pagamento” para ver a baixa no caixa." };
    } else {
      try {
        if (!parc) throw new Falha("O faturamento não tem cliente. Informe o cliente para gerar a cobrança no banco.");
        const cust = await clienteAsaas(base, it.token, parc);
        const r = await http("POST", `${base}/payments`, asaasAuth(it.token), { customer: cust, billingType: tipo === "pix" ? "PIX" : tipo === "boleto" ? "BOLETO" : "UNDEFINED",
          value: cob.valor, dueDate: venc, description: (l.numero_nf ? "NF " + l.numero_nf : l.descricao || "Cobrança") + (ps!.length > 1 ? ` · parcela ${p.numero}` : ""), externalReference: cob.id });
        if (!r.ok) throw new Falha("Banco: " + erroAsaas(r.j), 400);
        up = { externo_id: r.j.id, url: r.j.bankSlipUrl || r.j.invoiceUrl || null, mensagem: null };
        if (tipo !== "pix") { const l2 = await http("GET", `${base}/payments/${r.j.id}/identificationField`, asaasAuth(it.token)); if (l2.ok) up.linha_digitavel = l2.j.identificationField; }
        if (tipo !== "boleto") { const q2 = await http("GET", `${base}/payments/${r.j.id}/pixQrCode`, asaasAuth(it.token)); if (q2.ok) up.pix_copia_cola = q2.j.payload; }
      } catch (e) { up = { status: "erro", mensagem: String((e as Error).message).slice(0, 2000) }; }
    }
    const { data: fim } = await admin.from("cobrancas").update({ ...up, atualizado_em: new Date().toISOString() }).eq("id", cob.id).select().single();
    out.push(fim);
  }
  return out;
}
async function cancelarCobranca(emp: string, b: any) {
  const { data: c } = await admin.from("cobrancas").select("*").eq("id", b.cobranca_id).eq("empresa_id", emp).maybeSingle();
  if (!c) throw new Falha("Cobrança não encontrada."); if (c.status === "paga") throw new Falha("Cobrança já paga não pode ser cancelada.");
  if (c.provedor === "asaas" && c.externo_id) {
    const it = await integ(emp, "banco"); const r = await http("DELETE", `${ASAAS[c.ambiente]}/payments/${c.externo_id}`, asaasAuth(it.token));
    if (!r.ok && r.status !== 404) throw new Falha("Banco: " + erroAsaas(r.j), 502);
  }
  const { data } = await admin.from("cobrancas").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).eq("id", c.id).select().single();
  return data;
}
async function simularPagamento(emp: string, b: any) {
  const { data: c } = await admin.from("cobrancas").select("*").eq("id", b.cobranca_id).eq("empresa_id", emp).maybeSingle();
  if (!c) throw new Falha("Cobrança não encontrada.");
  if (c.ambiente === "producao") throw new Falha("Em produção o pagamento só entra pelo banco.");
  if (c.provedor === "asaas") {
    const it = await integ(emp, "banco");
    const r = await http("POST", `${ASAAS.homologacao}/sandbox/payment/${c.externo_id}/confirm`, asaasAuth(it.token), {});
    if (!r.ok) throw new Falha("Sandbox do banco: " + erroAsaas(r.j), 502);
    return { ok: true, aguardando_webhook: true };
  }
  const it = await integ(emp, "banco");
  const tar = Number(c.tipo === "pix" ? it.config?.tarifa_pix ?? 1.99 : it.config?.tarifa_boleto ?? 1.99) || 0;
  const { data, error } = await admin.rpc("cobranca_baixar", { p_cobranca: c.id, p_valor_pago: c.valor, p_liquido: Math.round((c.valor - tar) * 100) / 100, p_data: hoje() });
  if (error) throw new Falha(error.message, 400);
  return data;
}

// ---------- configuração
async function salvar(emp: string, b: any, user: any) {
  const servico = b.servico === "banco" ? "banco" : "nf";
  const provedor = servico === "nf" ? (b.provedor === "focusnfe" ? "focusnfe" : "simulado") : (b.provedor === "asaas" ? "asaas" : "simulado");
  const ambiente = provedor === "simulado" ? "simulado" : (b.ambiente === "producao" ? "producao" : "homologacao");
  const cfg: Record<string, unknown> = {};
  for (const k of CONFIG_OK) if (b.config && k in b.config) cfg[k] = b.config[k] === "" ? null : b.config[k];
  const token = String(b.token || "").trim();
  const antes = await integ(emp, servico);
  const usar = token || (antes.provedor === provedor ? antes.token : null);
  const avisos: string[] = [];
  if (provedor !== "simulado" && !usar) throw new Falha("Informe o token da API.");
  if (provedor === "asaas") {
    const r = await http("GET", `${ASAAS[ambiente]}/myAccount`, asaasAuth(usar));
    if (r.status === 401) throw new Falha("O banco recusou o token. Confira se ele é do ambiente " + (ambiente === "producao" ? "de produção" : "sandbox") + ".");
  }
  if (provedor === "focusnfe") {
    const r = await http("GET", `${FOCUS[ambiente]}/v2/nfse/teste-de-acesso`, focusAuth(usar));
    if (r.status === 401 || r.status === 403) throw new Falha("O emissor recusou o token. Confira se ele é do ambiente " + (ambiente === "producao" ? "de produção" : "de homologação") + ".");
  }
  const { error } = await admin.rpc("integracao_salvar", { p_emp: emp, p_servico: servico, p_provedor: provedor, p_ambiente: ambiente, p_token: token, p_config: cfg, p_usuario: user.id });
  if (error) throw error;
  const it = await integ(emp, servico);
  if (provedor === "asaas") {
    const r = await http("POST", `${ASAAS[ambiente]}/webhooks`, asaasAuth(it.token), { name: "Gestor financeiro", url: `${WEBHOOK}?p=asaas&e=${emp}`, email: user.email,
      enabled: true, interrupted: false, apiVersion: 3, authToken: it.webhook_token, sendType: "SEQUENTIALLY",
      events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_DELETED", "PAYMENT_REFUNDED", "PAYMENT_OVERDUE"] });
    if (!r.ok) avisos.push("Não consegui cadastrar o aviso de pagamento no banco (" + erroAsaas(r.j) + "). Cadastre manualmente o endereço mostrado na tela.");
  }
  if (provedor === "focusnfe") {
    const { data: e } = await admin.from("empresas").select("cnpj").eq("id", emp).single();
    const r = await http("POST", `${FOCUS[ambiente]}/v2/hooks`, focusAuth(it.token), { cnpj: e.cnpj, event: "nfse", url: `${WEBHOOK}?p=focus&e=${emp}&k=${it.webhook_token}` });
    if (!r.ok) avisos.push("Não consegui cadastrar o aviso de nota autorizada no emissor (" + erroFocus(r.j) + "). As notas serão conferidas pelo botão Atualizar.");
  }
  return { ok: true, avisos };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const quem = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await quem.auth.getUser();
    if (!user) return json({ erro: "Entre no sistema de novo." }, 401);
    const b = await req.json().catch(() => ({}));
    const emp = String(b.empresa_id || "");
    if (!/^[0-9a-f-]{36}$/.test(emp)) return json({ erro: "Empresa não informada." }, 400);
    const { data: pode } = await quem.rpc("posso_editar_empresa", { p_emp: emp });
    if (!pode) return json({ erro: "Você não tem permissão para emitir ou cobrar nesta empresa." }, 403);
    switch (b.acao) {
      case "salvar": return json(await salvar(emp, b, user));
      case "certificado": return json(await enviarCertificado(emp, b));
      case "nf_emitir": return json(await emitirNf(emp, b, user.id));
      case "nf_consultar": {
        const { data: nf } = await admin.from("nf_emitidas").select("*").eq("id", b.nf_id).eq("empresa_id", emp).maybeSingle();
        if (!nf) throw new Falha("Nota não encontrada."); return json(await consultarNf(nf));
      }
      case "nf_cancelar": return json(await cancelarNf(emp, b));
      case "cobranca_criar": return json(await criarCobrancas(emp, b, user.id));
      case "cobranca_cancelar": return json(await cancelarCobranca(emp, b));
      case "cobranca_simular": return json(await simularPagamento(emp, b));
      default: return json({ erro: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    const st = e instanceof Falha ? e.status : 500;
    console.error(e);
    return json({ erro: (e as Error).message || "Erro inesperado." }, st);
  }
});
