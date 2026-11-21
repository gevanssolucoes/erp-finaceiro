// Gevans Dados · API de saída. Entrega as visões de BI de UMA empresa, escolhida pela chave de API.
// Para Power BI (Obter dados > Web), Excel (Dados > Da Web), planilhas Google, scripts etc.
// Publicar SEM verificação de JWT (quem chama é o Power BI, não o app). A segurança é a chave:
//   GET /functions/v1/dados-api?recurso=fluxo_mensal&formato=csv&de=2026-01-01&ate=2026-12-31
//   cabeçalho  x-api-key: gd_...   (ou Authorization: Bearer gd_..., ou ?chave=gd_... no link)
// formato: json (padrão), csv (vírgula, ponto decimal) ou csv-br (ponto e vírgula, vírgula decimal, abre direto no Excel).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const RECURSOS: Record<string, string> = {
  empresas: "Empresa da chave (id, nome, CNPJ)",
  contas: "Plano de contas",
  realizado_competencia: "Realizado por competência, linha a linha (app + bases enviadas)",
  realizado_caixa: "Realizado por caixa: pagamentos e recebimentos efetivos",
  contas_abertas: "Contas a pagar e a receber em aberto",
  orcado_competencia: "Orçamento e forecast por competência (todas as versões)",
  orcado_caixa: "Orçamento e forecast por caixa (com as premissas de pagamento)",
  fluxo_mensal: "Tudo mês a mês: cenário (realizado/orçado) × regime (competência/caixa)",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
const dataOk = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function csv(rows: Record<string, unknown>[], br: boolean): string {
  if (!rows.length) return "﻿";
  const sep = br ? ";" : ",";
  const cols = Object.keys(rows[0]);
  const cel = (v: unknown) => {
    if (v == null) return "";
    let t = typeof v === "number" ? (br ? String(v).replace(".", ",") : String(v)) : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (typeof v === "boolean") t = v ? "sim" : "nao";
    return /[",;\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + [cols.join(sep), ...rows.map((r) => cols.map((c) => cel(r[c])).join(sep))].join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ erro: "Use GET." }, 405);
  const u = new URL(req.url);
  const recurso = u.searchParams.get("recurso") ?? u.pathname.split("/").filter(Boolean).pop() ?? "";
  if (!recurso || recurso === "dados-api") {
    return json({ produto: "Gevans Dados", uso: "GET ?recurso=<nome>&formato=json|csv|csv-br&de=AAAA-MM-DD&ate=AAAA-MM-DD com o cabeçalho x-api-key", recursos: RECURSOS });
  }
  if (!(recurso in RECURSOS)) return json({ erro: `Recurso desconhecido: ${recurso}`, recursos: Object.keys(RECURSOS) }, 404);
  const auth = req.headers.get("authorization") ?? "";
  const chave = req.headers.get("x-api-key") ?? (auth.startsWith("Bearer gd_") ? auth.slice(7) : null) ?? u.searchParams.get("chave");
  if (!chave || !/^gd_[0-9a-f]{48}$/.test(chave)) return json({ erro: "Informe a chave de API no cabeçalho x-api-key." }, 401);

  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/api_extrair`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "content-type": "application/json" },
    body: JSON.stringify({ p_chave: chave, p_recurso: recurso, p_de: dataOk(u.searchParams.get("de")), p_ate: dataOk(u.searchParams.get("ate")) }),
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = corpo?.message ?? "Erro ao ler os dados.";
    return json({ erro: msg }, /inválida|revogada/.test(msg) ? 401 : 400);
  }
  const rows = (corpo ?? []) as Record<string, unknown>[];
  const formato = (u.searchParams.get("formato") ?? "json").toLowerCase();
  if (formato === "csv" || formato === "csv-br") {
    return new Response(csv(rows, formato === "csv-br"), {
      headers: { ...CORS, "content-type": "text/csv; charset=utf-8", "content-disposition": `inline; filename="${recurso}.csv"` },
    });
  }
  return json(rows);
});
