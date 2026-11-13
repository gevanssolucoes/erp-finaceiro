// Avisos automáticos dos provedores (sem login de usuário; conferidos pelo código secreto da empresa):
//   ?p=asaas&e=<empresa>  → pagamento recebido: quita a parcela a receber, lança a tarifa e entra no caixa.
//   ?p=focus&e=<empresa>&k=<código> → nota autorizada, com erro ou cancelada.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const resp = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const FOCUS: Record<string, string> = { homologacao: "https://homologacao.focusnfe.com.br", producao: "https://api.focusnfe.com.br" };

function igual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resp({ ok: true });
  const u = new URL(req.url), p = u.searchParams.get("p"), emp = u.searchParams.get("e") || "";
  if (!/^[0-9a-f-]{36}$/.test(emp)) return resp({ erro: "empresa" }, 400);
  const servico = p === "asaas" ? "banco" : p === "focus" ? "nf" : null;
  if (!servico) return resp({ erro: "provedor" }, 400);
  const { data: it } = await admin.rpc("integracao_ler", { p_emp: emp, p_servico: servico });
  const recebido = p === "asaas" ? req.headers.get("asaas-access-token") || "" : u.searchParams.get("k") || "";
  if (!it?.webhook_token || !igual(recebido, it.webhook_token)) return resp({ erro: "não autorizado" }, 401);
  const b = await req.json().catch(() => ({}));

  try {
    if (p === "asaas") {
      const pg = b.payment || {};
      let { data: c } = await admin.from("cobrancas").select("*").eq("empresa_id", emp).eq("provedor", "asaas").eq("externo_id", pg.id || "-").maybeSingle();
      if (!c && /^[0-9a-f-]{36}$/.test(pg.externalReference || "")) ({ data: c } = await admin.from("cobrancas").select("*").eq("empresa_id", emp).eq("id", pg.externalReference).maybeSingle());
      if (!c) return resp({ ok: true, ignorado: "cobrança de fora do sistema" });
      const ev = String(b.event || "");
      if (ev === "PAYMENT_RECEIVED" || ev === "PAYMENT_CONFIRMED") {
        const data = String(pg.clientPaymentDate || pg.paymentDate || pg.confirmedDate || "").slice(0, 10) || null;
        const { data: r, error } = await admin.rpc("cobranca_baixar", { p_cobranca: c.id, p_valor_pago: pg.value ?? c.valor, p_liquido: pg.netValue ?? pg.value ?? c.valor, p_data: data });
        if (error) { await admin.from("cobrancas").update({ mensagem: "Pagamento recebido, mas a baixa falhou: " + error.message }).eq("id", c.id); return resp({ ok: false, erro: error.message }); }
        return resp(r);
      }
      if (ev === "PAYMENT_DELETED") { if (c.status === "pendente") await admin.from("cobrancas").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).eq("id", c.id); }
      if (ev === "PAYMENT_REFUNDED") await admin.from("cobrancas").update({ mensagem: "Pagamento estornado pelo banco em " + new Date().toISOString().slice(0, 10) + ". Ajuste a baixa em contas a receber." }).eq("id", c.id);
      if (ev === "PAYMENT_OVERDUE") await admin.from("cobrancas").update({ mensagem: "Vencida sem pagamento." }).eq("id", c.id);
      return resp({ ok: true });
    }
    // Focus NFe
    const ref = String(b.ref || "");
    const { data: nf } = await admin.from("nf_emitidas").select("*").eq("empresa_id", emp).eq("ref", ref).maybeSingle();
    if (!nf) return resp({ ok: true, ignorado: "nota de fora do sistema" });
    const base = FOCUS[nf.ambiente] || FOCUS.homologacao, st = b.status;
    const up: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
    if (st === "autorizado") Object.assign(up, { status: "autorizada", numero: b.numero ?? b.numero_nfse ?? null, codigo_verificacao: b.codigo_verificacao ?? null,
      url_pdf: b.url_danfse ?? b.url ?? null, url_xml: b.caminho_xml_nota_fiscal ? base + b.caminho_xml_nota_fiscal : null, mensagem: null });
    else if (st === "erro_autorizacao") Object.assign(up, { status: "erro", mensagem: (b.erros || []).map((e: any) => e.mensagem).join(" · ").slice(0, 2000) || "erro no emissor" });
    else if (st === "cancelado") Object.assign(up, { status: "cancelada" });
    await admin.from("nf_emitidas").update(up).eq("id", nf.id);
    if (up.status === "autorizada" && up.numero && nf.lancamento_id) {
      await admin.from("lancamentos").update({ numero_nf: String(up.numero) }).eq("id", nf.lancamento_id).is("numero_nf", null);
    }
    return resp({ ok: true });
  } catch (e) {
    console.error(e);
    return resp({ ok: false, erro: (e as Error).message }, 500);
  }
});
