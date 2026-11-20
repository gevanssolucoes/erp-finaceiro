// Gevans Dados · conector de entrada. Busca dados para uma base da empresa, como o "Obter dados" do Power BI:
//   tipo "web":       baixa um link de API ou arquivo (JSON ou CSV), com cabeçalhos opcionais (ex.: token).
//   tipo "postgres" | "mysql" | "sqlserver": roda UMA consulta SELECT só de leitura no banco do cliente.
// Só usuários logados com permissão de edição na empresa. Senhas e tokens não são guardados: valem só para esta chamada.
// Bloqueia endereços internos (rede privada, localhost, metadados de nuvem). Até 100 mil linhas e 30 s por consulta.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import postgres from "npm:postgres@3.4.5";
import mysql from "npm:mysql2@3.11.3/promise";
import mssql from "npm:mssql@11.0.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
const MAX_LINHAS = 100_000, MAX_BYTES = 25 * 1024 * 1024, TEMPO = 30_000;

// ---------- endereços proibidos
function ipPrivado(ip: string): boolean {
  if (ip.includes(":")) {
    const x = ip.toLowerCase();
    if (x.startsWith("::ffff:")) return ipPrivado(x.slice(7));
    return x === "::1" || x === "::" || /^f[cd]/.test(x) || /^fe[89ab]/.test(x);
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function hostLiberado(host: string): Promise<void> {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".supabase.co") || h.endsWith(".supabase.com")) {
    throw new Error("Este endereço não é permitido.");
  }
  let ips: string[] = [];
  if (/^[\d.]+$/.test(h) || h.includes(":")) ips = [h];
  else {
    const [a, b] = await Promise.all([Deno.resolveDns(h, "A").catch(() => []), Deno.resolveDns(h, "AAAA").catch(() => [])]);
    ips = [...a, ...b];
  }
  if (!ips.length) throw new Error(`Não achei o endereço ${host}.`);
  if (ips.some(ipPrivado)) throw new Error("Endereços de rede interna não são permitidos. Use o endereço público do servidor.");
}

// ---------- só consulta de leitura, um comando
function consultaOk(sql: string): string {
  const s = String(sql ?? "").trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(s)) throw new Error("A consulta precisa começar com SELECT ou WITH.");
  if (s.includes(";")) throw new Error("Envie só uma consulta, sem ponto e vírgula no meio.");
  if (/\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|exec|execute|call|copy|into\s+outfile)\b/i.test(s.replace(/'[^']*'/g, ""))) {
    throw new Error("A consulta só pode ler dados.");
  }
  return s;
}
const limpa = (rows: Record<string, unknown>[]) =>
  rows.slice(0, MAX_LINHAS).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "bigint" ? Number(v) : v])));

async function sqlPostgres(c: any, sql: string) {
  const db = postgres({ host: c.host, port: +c.porta || 5432, database: c.banco, username: c.usuario, password: c.senha,
    ssl: c.ssl === false ? false : "prefer", max: 1, connect_timeout: 15, idle_timeout: 5, prepare: false,
    types: { numeric: { to: 1700, from: [1700, 20], serialize: String, parse: Number } } });
  try {
    return await db.begin("read only", async (t) => {
      await t.unsafe(`set local statement_timeout = ${TEMPO}`);
      return limpa(await t.unsafe(`select * from (${sql}) as consulta limit ${MAX_LINHAS + 1}`) as any);
    });
  } finally { await db.end({ timeout: 2 }); }
}
async function sqlMysql(c: any, sql: string) {
  const db = await mysql.createConnection({ host: c.host, port: +c.porta || 3306, database: c.banco, user: c.usuario, password: c.senha,
    connectTimeout: 15000, dateStrings: true, decimalNumbers: true, supportBigNumbers: true, ssl: c.ssl === false ? undefined : { rejectUnauthorized: false } });
  try {
    await db.query("SET SESSION TRANSACTION READ ONLY");
    const [rows] = await db.query({ sql: `select * from (${sql}) as consulta limit ${MAX_LINHAS + 1}`, timeout: TEMPO });
    return limpa(rows as any);
  } finally { await db.end(); }
}
async function sqlServer(c: any, sql: string) {
  const pool = await mssql.connect({ server: c.host, port: +c.porta || 1433, database: c.banco, user: c.usuario, password: c.senha,
    requestTimeout: TEMPO, connectionTimeout: 15000, options: { encrypt: c.ssl !== false, trustServerCertificate: true } });
  try {
    const r = await pool.request().query(`select top ${MAX_LINHAS + 1} * from (${sql}) as consulta`);
    return limpa(r.recordset as any);
  } finally { await pool.close(); }
}
async function web(c: any) {
  const u = new URL(String(c.url ?? ""));
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("O link precisa começar com https://");
  await hostLiberado(u.hostname);
  const hdr: Record<string, string> = { accept: "application/json, text/csv, */*" };
  for (const [k, v] of Object.entries(c.cabecalhos ?? {})) if (/^[\w-]{1,60}$/.test(k)) hdr[k] = String(v).slice(0, 2000);
  const r = await fetch(u, { headers: hdr, redirect: "manual", signal: AbortSignal.timeout(TEMPO) });
  if (r.status >= 300 && r.status < 400) throw new Error("O link redireciona para outro endereço. Use o endereço final.");
  if (!r.ok) throw new Error(`O link respondeu ${r.status}.`);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("Resposta maior que 25 MB.");
  return { conteudo: new TextDecoder().decode(buf), tipo: r.headers.get("content-type") ?? "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const quem = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await quem.auth.getUser();
    if (!user) return json({ erro: "Entre no app para usar o conector." }, 401);
    const c = await req.json().catch(() => ({}));
    const { data: ue } = await quem.from("usuarios_empresas").select("papel").eq("usuario_id", user.id).eq("empresa_id", c.empresa_id ?? "").maybeSingle();
    if (!ue || !["admin", "financeiro"].includes(ue.papel)) return json({ erro: "Só quem edita a empresa pode buscar dados para ela." }, 403);

    if (c.tipo === "web") return json(await web(c));
    if (!["postgres", "mysql", "sqlserver"].includes(c.tipo)) return json({ erro: "Tipo de conexão desconhecido." }, 400);
    if (!c.host || !c.usuario) return json({ erro: "Informe servidor e usuário." }, 400);
    await hostLiberado(String(c.host));
    const sql = consultaOk(c.sql);
    const linhas = c.tipo === "postgres" ? await sqlPostgres(c, sql) : c.tipo === "mysql" ? await sqlMysql(c, sql) : await sqlServer(c, sql);
    return json({ linhas: linhas.slice(0, MAX_LINHAS), cortado: linhas.length > MAX_LINHAS });
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    return json({ erro: /password|senha|authentication|login failed|Access denied/i.test(m) ? "Usuário ou senha do banco recusados." : m.slice(0, 400) }, 400);
  }
});
