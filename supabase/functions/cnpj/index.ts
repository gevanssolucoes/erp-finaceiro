// Consulta pública do CNPJ (dados do Cartão CNPJ da Receita) para preencher o cadastro da empresa.
// Tenta BrasilAPI, depois minhareceita.org e por último publica.cnpj.ws. Só para usuários logados.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });
const cache = new Map<string, { t: number; d: unknown }>();

const fmtCnae = (c: unknown) => {
  const d = String(c ?? "").replace(/\D/g, "").padStart(7, "0");
  return d === "0000000" ? null : `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`;
};
const s = (v: unknown) => (v == null || v === "" ? null : String(v).trim());

// formato BrasilAPI / minhareceita
function deReceita(r: any, fonte: string) {
  const tel = s(r.ddd_telefone_1);
  return {
    cnpj: String(r.cnpj).replace(/\D/g, "").padStart(14, "0"),
    razao_social: s(r.razao_social), nome_fantasia: s(r.nome_fantasia),
    cnae_principal: fmtCnae(r.cnae_fiscal), cnae_descricao: s(r.cnae_fiscal_descricao),
    cnaes_secundarios: (r.cnaes_secundarios || []).filter((x: any) => x && x.codigo).map((x: any) => ({ codigo: fmtCnae(x.codigo), descricao: s(x.descricao) })),
    natureza_juridica: s(r.natureza_juridica), porte: s(r.porte ?? r.descricao_porte),
    data_abertura: s(r.data_inicio_atividade), situacao_cadastral: s(r.descricao_situacao_cadastral),
    logradouro: [s(r.descricao_tipo_de_logradouro), s(r.logradouro)].filter(Boolean).join(" ") || null,
    numero: s(r.numero), complemento: s(r.complemento), bairro: s(r.bairro), municipio: s(r.municipio), uf: s(r.uf),
    cep: s(r.cep), email: s(r.email)?.toLowerCase() ?? null, telefone: tel,
    simples: r.opcao_pelo_simples ?? null, mei: r.opcao_pelo_mei ?? null, inscricao_estadual: null, fonte,
  };
}
// formato publica.cnpj.ws
function deCnpjWs(r: any) {
  const e = r.estabelecimento || {};
  const ie = (e.inscricoes_estaduais || []).find((x: any) => x.ativo !== false) || null;
  return {
    cnpj: s(e.cnpj), razao_social: s(r.razao_social), nome_fantasia: s(e.nome_fantasia),
    cnae_principal: fmtCnae(e.atividade_principal?.subclasse ?? e.atividade_principal?.id), cnae_descricao: s(e.atividade_principal?.descricao),
    cnaes_secundarios: (e.atividades_secundarias || []).map((x: any) => ({ codigo: fmtCnae(x.subclasse ?? x.id), descricao: s(x.descricao) })),
    natureza_juridica: s(r.natureza_juridica?.descricao), porte: s(r.porte?.descricao),
    data_abertura: s(e.data_inicio_atividade), situacao_cadastral: s(e.situacao_cadastral),
    logradouro: [s(e.tipo_logradouro), s(e.logradouro)].filter(Boolean).join(" ") || null,
    numero: s(e.numero), complemento: s(e.complemento), bairro: s(e.bairro), municipio: s(e.cidade?.nome), uf: s(e.estado?.sigla),
    cep: s(e.cep), email: s(e.email)?.toLowerCase() ?? null, telefone: e.ddd1 && e.telefone1 ? `${e.ddd1}${e.telefone1}` : null,
    simples: r.simples ? r.simples.simples === "Sim" : null, mei: r.simples ? r.simples.mei === "Sim" : null,
    inscricao_estadual: ie ? s(ie.inscricao_estadual) : null, fonte: "publica.cnpj.ws",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    let cnpj = new URL(req.url).searchParams.get("cnpj") ?? "";
    if (!cnpj && req.method === "POST") cnpj = String((await req.json().catch(() => ({})))?.cnpj ?? "");
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return json({ erro: "Informe um CNPJ com 14 dígitos." }, 400);
    const c = cache.get(cnpj);
    if (c && Date.now() - c.t < 24 * 3600e3) return json(c.d);
    const fontes: [string, (r: any) => unknown][] = [
      [`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, (r) => deReceita(r, "BrasilAPI")],
      [`https://minhareceita.org/${cnpj}`, (r) => deReceita(r, "minhareceita.org")],
      [`https://publica.cnpj.ws/cnpj/${cnpj}`, deCnpjWs],
    ];
    let naoAchou = 0;
    const erros: string[] = [];
    for (const [url, conv] of fontes) {
      try {
        const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "GevansGestor/1.0" }, signal: AbortSignal.timeout(9000) });
        if (r.status === 404) { naoAchou++; continue; }
        if (!r.ok) { erros.push(`${new URL(url).host}: HTTP ${r.status}`); continue; }
        const d = conv(await r.json());
        cache.set(cnpj, { t: Date.now(), d });
        return json(d);
      } catch (e) { erros.push(`${new URL(url).host}: ${(e as Error).message}`); }
    }
    if (naoAchou && !erros.length) return json({ erro: "CNPJ não encontrado na Receita." }, 404);
    return json({ erro: "A consulta à Receita não respondeu agora. Tente de novo em alguns minutos.", detalhe: erros }, 502);
  } catch (e) {
    return json({ erro: String((e as Error).message || e) }, 500);
  }
});
