// Cria a estrutura inicial dos pacotes de dados (packs/) a partir da tabela de
// ligas aprovada na Paragem 1. Os pacotes passam a ser a fonte de verdade:
// depois de criados editam-se à mão. Este script NÃO sobrescreve pastas que já
// existam, a não ser com --force.
//
// Uso: npm run criar-packs [-- --force]

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, RegrasLiga, RegrasTaca, Desempate, Confederacao, PlayoffSubida, Barragem } from '../src/data/types.ts';

const RAIZ = join(import.meta.dirname, '..', 'packs');
const FORCE = process.argv.includes('--force');

interface LigaDef {
  nome: string;
  equipas: number;
  sobem?: number;
  playoff?: PlayoffSubida;
  descem: number;
  barragem?: Barragem;
  voltas?: number;
  playoffCampeao?: number;
  riqueza: number;
}

interface PaisDef {
  id: string;
  nome: string;
  pais: string | null;
  conf: Confederacao;
  perfil: string;
  taca: string | null;
  desempates: Desempate[];
  plantel?: Partial<RegrasLiga['plantel']>;
  ligas: LigaDef[];
  quotas?: Record<string, number>;
  tipo?: 'pais' | 'regional';
}

const D_PADRAO: Desempate[] = ['pontos', 'dg', 'gm', 'confronto_directo', 'sorteio'];
const D_H2H: Desempate[] = ['pontos', 'confronto_directo', 'dg', 'gm', 'sorteio'];
const D_VIT: Desempate[] = ['pontos', 'vitorias', 'dg', 'gm', 'confronto_directo', 'sorteio'];

// Banda de reputação dos clubes gerados [tecto, piso] (proposta provisória, Paragem 1).
const REP: Record<string, [number, number]> = {
  eng_1: [93, 62], eng_2: [66, 44], eng_3: [50, 32], eng_4: [40, 24],
  esp_1: [95, 55], esp_2: [58, 38],
  ger_1: [94, 56], ger_2: [62, 40], ger_3: [48, 30],
  fra_1: [92, 50], fra_2: [52, 32], fra_3: [38, 22],
  por_1: [85, 40], por_2: [44, 26], por_3: [32, 18],
  ned_1: [82, 40], ned_2: [42, 24],
  bel_1: [74, 40], bel_2: [40, 22],
  sco_1: [78, 34], sco_2: [38, 20],
  tur_1: [80, 42], tur_2: [48, 28],
  ita_1: [92, 56], ita_2: [58, 36],
  sui_1: [68, 42], aut_1: [68, 40], den_1: [66, 40], nor_1: [64, 38], swe_1: [62, 38],
  gre_1: [74, 40], cze_1: [70, 38], cro_1: [68, 32], pol_1: [64, 40], hun_1: [62, 32], ukr_1: [70, 34],
  bra_1: [84, 58], bra_2: [58, 38], arg_1: [82, 45], col_1: [64, 40], uru_1: [66, 32], ecu_1: [64, 36],
  ksa_1: [78, 40], ksa_2: [40, 24], jpn_1: [66, 48], jpn_2: [50, 34], kor_1: [64, 44], uae_1: [62, 38],
  usa_mls_1: [70, 46], mex_1: [72, 48], africa_unificada_1: [68, 36],
};

const PO = (de: number, ate: number, destino: 'subida' | 'barragem' = 'subida'): PlayoffSubida => ({ de, ate, destino });
const BAR = (posicao: number, adversario: 'playoff' | number): Barragem => ({ posicao, adversario, maos: 2 });

// Tabela aprovada (Paragem 1). Riqueza: proposta provisória, à espera do documento do utilizador.
const PAISES: PaisDef[] = [
  { id: 'eng', nome: 'Inglaterra', pais: 'ENG', conf: 'UEFA', perfil: 'en', taca: 'Taça de Inglaterra', desempates: D_PADRAO,
    plantel: { minimo_nacionais: 8 },
    ligas: [
      { nome: 'Premier League', equipas: 20, descem: 3, riqueza: 100 },
      { nome: 'Championship', equipas: 24, sobem: 2, playoff: PO(3, 6), descem: 3, riqueza: 30 },
      { nome: 'League One', equipas: 24, sobem: 2, playoff: PO(3, 6), descem: 4, riqueza: 10 },
      { nome: 'League Two', equipas: 24, sobem: 3, playoff: PO(4, 7), descem: 2, riqueza: 5 },
    ] },
  { id: 'esp', nome: 'Espanha', pais: 'ESP', conf: 'UEFA', perfil: 'es', taca: 'Taça do Rei', desempates: D_H2H,
    ligas: [
      { nome: 'Primera División', equipas: 20, descem: 3, riqueza: 72 },
      { nome: 'Segunda División', equipas: 22, sobem: 2, playoff: PO(3, 6), descem: 4, riqueza: 15 },
    ] },
  { id: 'ger', nome: 'Alemanha', pais: 'GER', conf: 'UEFA', perfil: 'de', taca: 'Taça da Alemanha', desempates: D_PADRAO,
    plantel: { minimo_nacionais: 12 },
    ligas: [
      { nome: 'Bundesliga', equipas: 18, descem: 2, barragem: BAR(16, 3), riqueza: 70 },
      { nome: '2. Bundesliga', equipas: 18, sobem: 2, descem: 2, barragem: BAR(16, 3), riqueza: 18 },
      { nome: '3. Liga', equipas: 20, sobem: 2, descem: 4, riqueza: 8 },
    ] },
  { id: 'fra', nome: 'França', pais: 'FRA', conf: 'UEFA', perfil: 'fr', taca: 'Taça de França', desempates: D_PADRAO,
    ligas: [
      { nome: 'Ligue 1', equipas: 18, descem: 2, barragem: BAR(16, 'playoff'), riqueza: 50 },
      { nome: 'Ligue 2', equipas: 18, sobem: 2, playoff: PO(3, 5, 'barragem'), descem: 2, barragem: BAR(16, 3), riqueza: 12 },
      { nome: 'Ligue 3', equipas: 18, sobem: 2, descem: 3, riqueza: 4 },
    ] },
  { id: 'por', nome: 'Portugal', pais: 'POR', conf: 'UEFA', perfil: 'pt', taca: 'Taça de Portugal', desempates: D_H2H,
    ligas: [
      { nome: '1.ª Liga', equipas: 18, descem: 2, barragem: BAR(16, 3), riqueza: 28 },
      { nome: '2.ª Liga', equipas: 18, sobem: 2, descem: 2, barragem: BAR(16, 3), riqueza: 7 },
      { nome: 'Liga 3', equipas: 20, sobem: 2, descem: 4, riqueza: 3 },
    ] },
  { id: 'ned', nome: 'Países Baixos', pais: 'NED', conf: 'UEFA', perfil: 'nl', taca: 'Taça dos Países Baixos', desempates: D_PADRAO,
    ligas: [
      { nome: 'Eredivisie', equipas: 18, descem: 2, barragem: BAR(16, 'playoff'), riqueza: 27 },
      { nome: 'Eerste Divisie', equipas: 20, sobem: 2, playoff: PO(3, 6, 'barragem'), descem: 0, riqueza: 7 },
    ] },
  { id: 'bel', nome: 'Bélgica', pais: 'BEL', conf: 'UEFA', perfil: 'be', taca: 'Taça da Bélgica', desempates: D_PADRAO,
    ligas: [
      { nome: 'Pro League', equipas: 18, descem: 2, riqueza: 24 },
      { nome: 'Challenger Pro League', equipas: 16, sobem: 2, descem: 1, riqueza: 5 },
    ] },
  { id: 'sco', nome: 'Escócia', pais: 'SCO', conf: 'UEFA', perfil: 'sc', taca: 'Taça da Escócia', desempates: D_PADRAO,
    ligas: [
      { nome: 'Premiership', equipas: 12, descem: 1, barragem: BAR(11, 'playoff'), riqueza: 18 },
      { nome: 'Championship', equipas: 10, sobem: 1, playoff: PO(2, 4, 'barragem'), descem: 1, riqueza: 4 },
    ] },
  { id: 'tur', nome: 'Turquia', pais: 'TUR', conf: 'UEFA', perfil: 'tr', taca: 'Taça da Turquia', desempates: D_H2H,
    plantel: { maximo_estrangeiros: 14 },
    ligas: [
      { nome: 'Süper Lig', equipas: 18, descem: 3, riqueza: 30 },
      { nome: '1. Lig', equipas: 20, sobem: 2, playoff: PO(3, 6), descem: 3, riqueza: 7 },
    ] },
  { id: 'ita', nome: 'Itália', pais: 'ITA', conf: 'UEFA', perfil: 'it', taca: 'Taça de Itália', desempates: D_H2H,
    plantel: { minimo_nacionais: 8, minimo_formados_no_clube: 4 },
    ligas: [
      { nome: 'Serie A', equipas: 20, descem: 3, riqueza: 62 },
      { nome: 'Serie B', equipas: 20, sobem: 2, playoff: PO(3, 8), descem: 4, riqueza: 14 },
    ] },
  { id: 'sui', nome: 'Suíça', pais: 'SUI', conf: 'UEFA', perfil: 'de', taca: 'Taça da Suíça', desempates: D_PADRAO,
    ligas: [{ nome: 'Super League', equipas: 12, descem: 1, riqueza: 18 }] },
  { id: 'aut', nome: 'Áustria', pais: 'AUT', conf: 'UEFA', perfil: 'de', taca: 'Taça da Áustria', desempates: D_PADRAO,
    ligas: [{ nome: 'Bundesliga', equipas: 12, descem: 1, riqueza: 16 }] },
  { id: 'den', nome: 'Dinamarca', pais: 'DEN', conf: 'UEFA', perfil: 'da', taca: 'Taça da Dinamarca', desempates: D_PADRAO,
    ligas: [{ nome: 'Superliga', equipas: 12, descem: 2, riqueza: 15 }] },
  { id: 'nor', nome: 'Noruega', pais: 'NOR', conf: 'UEFA', perfil: 'no', taca: 'Taça da Noruega', desempates: D_PADRAO,
    ligas: [{ nome: 'Eliteserien', equipas: 16, descem: 2, riqueza: 14 }] },
  { id: 'swe', nome: 'Suécia', pais: 'SWE', conf: 'UEFA', perfil: 'sv', taca: 'Taça da Suécia', desempates: D_PADRAO,
    ligas: [{ nome: 'Allsvenskan', equipas: 16, descem: 2, riqueza: 13 }] },
  { id: 'gre', nome: 'Grécia', pais: 'GRE', conf: 'UEFA', perfil: 'el', taca: 'Taça da Grécia', desempates: D_H2H,
    ligas: [{ nome: 'Super League', equipas: 14, descem: 2, riqueza: 15 }] },
  { id: 'cze', nome: 'Chéquia', pais: 'CZE', conf: 'UEFA', perfil: 'cs', taca: 'Taça da Chéquia', desempates: D_H2H,
    ligas: [{ nome: '1. liga', equipas: 16, descem: 2, riqueza: 11 }] },
  { id: 'cro', nome: 'Croácia', pais: 'CRO', conf: 'UEFA', perfil: 'hr', taca: 'Taça da Croácia', desempates: D_H2H,
    ligas: [{ nome: 'HNL', equipas: 10, descem: 1, riqueza: 8 }] },
  { id: 'pol', nome: 'Polónia', pais: 'POL', conf: 'UEFA', perfil: 'pl', taca: 'Taça da Polónia', desempates: D_H2H,
    ligas: [{ nome: 'Ekstraklasa', equipas: 18, descem: 3, riqueza: 13 }] },
  { id: 'hun', nome: 'Hungria', pais: 'HUN', conf: 'UEFA', perfil: 'hu', taca: 'Taça da Hungria', desempates: D_PADRAO,
    ligas: [{ nome: 'NB I', equipas: 12, descem: 2, riqueza: 9 }] },
  { id: 'ukr', nome: 'Ucrânia', pais: 'UKR', conf: 'UEFA', perfil: 'uk', taca: 'Taça da Ucrânia', desempates: D_H2H,
    ligas: [{ nome: 'Premier Liha', equipas: 16, descem: 2, riqueza: 7 }] },
  { id: 'bra', nome: 'Brasil', pais: 'BRA', conf: 'CONMEBOL', perfil: 'br', taca: 'Copa do Brasil', desempates: D_VIT,
    plantel: { maximo_estrangeiros: 9 },
    ligas: [
      { nome: 'Série A', equipas: 20, descem: 4, riqueza: 35 },
      { nome: 'Série B', equipas: 20, sobem: 4, descem: 4, riqueza: 10 },
    ] },
  { id: 'arg', nome: 'Argentina', pais: 'ARG', conf: 'CONMEBOL', perfil: 'ar', taca: 'Copa Argentina', desempates: D_PADRAO,
    plantel: { maximo_estrangeiros: 6 },
    ligas: [{ nome: 'Liga Profesional', equipas: 30, voltas: 1, playoffCampeao: 8, descem: 2, riqueza: 14 }] },
  { id: 'col', nome: 'Colômbia', pais: 'COL', conf: 'CONMEBOL', perfil: 'es_am', taca: 'Copa Colombia', desempates: D_PADRAO,
    ligas: [{ nome: 'Primera A', equipas: 20, descem: 2, riqueza: 9 }] },
  { id: 'uru', nome: 'Uruguai', pais: 'URU', conf: 'CONMEBOL', perfil: 'es_am', taca: 'Copa AUF Uruguay', desempates: D_PADRAO,
    ligas: [{ nome: 'Primera División', equipas: 16, descem: 2, riqueza: 6 }] },
  { id: 'ecu', nome: 'Equador', pais: 'ECU', conf: 'CONMEBOL', perfil: 'es_am', taca: 'Copa Ecuador', desempates: D_PADRAO,
    ligas: [{ nome: 'LigaPro Serie A', equipas: 16, descem: 2, riqueza: 7 }] },
  { id: 'ksa', nome: 'Arábia Saudita', pais: 'KSA', conf: 'AFC', perfil: 'ar_g', taca: "Taça do Rei (KSA)", desempates: D_H2H,
    plantel: { maximo_estrangeiros: 10 },
    ligas: [
      { nome: 'Pro League', equipas: 18, descem: 3, riqueza: 45 },
      { nome: 'First Division', equipas: 18, sobem: 2, playoff: PO(3, 6), descem: 3, riqueza: 5 },
    ] },
  { id: 'jpn', nome: 'Japão', pais: 'JPN', conf: 'AFC', perfil: 'ja', taca: 'Taça do Imperador', desempates: D_PADRAO,
    ligas: [
      { nome: 'J1 League', equipas: 20, descem: 3, riqueza: 22 },
      { nome: 'J2 League', equipas: 20, sobem: 2, playoff: PO(3, 6), descem: 3, riqueza: 6 },
    ] },
  { id: 'kor', nome: 'Coreia do Sul', pais: 'KOR', conf: 'AFC', perfil: 'ko', taca: 'Taça da Coreia', desempates: D_PADRAO,
    ligas: [{ nome: 'K League 1', equipas: 14, descem: 1, riqueza: 15 }] },
  { id: 'uae', nome: 'Emirados Árabes Unidos', pais: 'UAE', conf: 'AFC', perfil: 'ar_g', taca: 'Taça dos Emirados', desempates: D_H2H,
    ligas: [{ nome: 'Pro League', equipas: 14, descem: 2, riqueza: 24 }] },
  { id: 'usa_mls', nome: 'MLS (EUA/Canadá)', pais: 'USA', conf: 'CONCACAF', perfil: 'us', taca: 'Taça MLS', desempates: D_VIT,
    plantel: { maximo_estrangeiros: 8 },
    ligas: [{ nome: 'MLS', equipas: 30, voltas: 1, playoffCampeao: 8, descem: 0, riqueza: 38 }] },
  { id: 'mex', nome: 'México', pais: 'MEX', conf: 'CONCACAF', perfil: 'es_am', taca: 'Copa MX', desempates: D_PADRAO,
    ligas: [{ nome: 'Liga MX', equipas: 18, descem: 0, riqueza: 28 }] },
  { id: 'africa_unificada', nome: 'Liga Africana Unificada', pais: null, conf: 'CAF', perfil: 'af', taca: null, desempates: D_PADRAO,
    tipo: 'regional',
    quotas: { EGY: 4, MAR: 3, RSA: 3, TUN: 2, ALG: 2, NGA: 2, COD: 2, SEN: 2, GHA: 2, CIV: 2 },
    ligas: [{ nome: 'Liga Africana', equipas: 24, descem: 0, riqueza: 6 }] },
];

function regras(p: PaisDef, l: LigaDef, nivel: number, ultima: boolean): RegrasLiga {
  return {
    id: `${p.id}_${nivel}`,
    nome: l.nome,
    tipo: 'liga',
    pais: p.pais,
    nivel,
    formato: { equipas: l.equipas, voltas: l.voltas ?? 2, playoff_campeao: l.playoffCampeao ? { equipas: l.playoffCampeao } : null },
    subidas: { directas: l.sobem ?? 0, playoff: l.playoff ?? null },
    descidas: { directas: l.descem, barragem: l.barragem ?? null, exterior: ultima },
    desempates: p.desempates,
    epoca: { calendario: 'ago_mai' },
    indice_riqueza: l.riqueza,
    geracao: REP[`${p.id}_${nivel}`] ? { rep_tecto: REP[`${p.id}_${nivel}`][0], rep_piso: REP[`${p.id}_${nivel}`][1] } : null,
    janelas_transferencias: [
      { abre: '07-01', fecha: '09-01' },
      { abre: '01-01', fecha: '02-01' },
    ],
    plantel: {
      max: 25,
      minimo_nacionais: p.plantel?.minimo_nacionais ?? null,
      maximo_estrangeiros: p.plantel?.maximo_estrangeiros ?? null,
      minimo_formados_no_clube: p.plantel?.minimo_formados_no_clube ?? null,
      por_validar: true,
    },
    tv: { total_milhoes_eur: null, por_posicao: [], paraquedas: [], por_validar: true },
    premios: [],
    fair_play: { massa_salarial_max_receita: 0.8, sancoes: ['aviso', 'multa', 'proibicao_inscricoes'] },
    licenciamento: nivel > 1 ? { exigido: true, notas: 'por definir' } : null,
  };
}

function taca(p: PaisDef): RegrasTaca | null {
  if (!p.taca || !p.pais) return null;
  // Com 3+ níveis, os dois mais baixos entram na 1.ª ronda; cada nível acima entra
  // uma ronda depois. Com 2 níveis: o 2.º na 1.ª ronda, o 1.º na 2.ª.
  const n = p.ligas.length;
  const entrada: Record<string, number> = {};
  for (let nivel = 1; nivel <= n; nivel++) entrada[String(nivel)] = Math.max(1, n - nivel + (n >= 3 ? 0 : 1));
  return { id: `${p.id}_taca`, nome: p.taca, tipo: 'taca', pais: p.pais, entrada_por_nivel: entrada, jogo_unico: true, final_neutra: true };
}

const CABECALHOS: Record<string, string> = {
  'clubes.csv': 'id,nome,nome_curto,cidade,cor1,cor2,reputacao,estadio,capacidade,liga,origem',
  'jogadores.csv': 'id,nome,data_nascimento,pais_formacao,clube,posicao,origem',
  'treinadores.csv': 'id,nome,data_nascimento,pais,clube,origem',
  'staff.csv': 'id,nome,funcao,clube,origem',
  'donos.csv': 'id,nome,tipo,clube,origem',
  'estadios.csv': 'id,nome,cidade,capacidade,clube,origem',
  'rivalidades.csv': 'clube_a,clube_b,intensidade,origem',
};

function escrever(caminho: string, conteudo: unknown) {
  writeFileSync(caminho, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 2) + '\n');
}

let criados = 0;
for (const p of PAISES) {
  const dir = join(RAIZ, p.id);
  if (existsSync(dir) && !FORCE) {
    console.log(`= ${p.id} já existe (use --force para recriar)`);
    continue;
  }
  mkdirSync(join(dir, 'competicoes'), { recursive: true });
  const ligas = p.ligas.map((l, i) => regras(p, l, i + 1, i === p.ligas.length - 1));
  const t = taca(p);
  const manifest: Manifest = {
    id: p.id, nome: p.nome, tipo: p.tipo ?? 'pais', pais: p.pais, confederacao: p.conf, versao: '0.1.0',
    piramide: ligas.map((l) => l.id), taca: t?.id ?? null, perfil_nomes: p.perfil, activo: true,
    ...(p.quotas ? { quotas_paises: p.quotas } : {}),
  };
  escrever(join(dir, 'manifest.json'), manifest);
  for (const l of ligas) escrever(join(dir, 'competicoes', `${l.id}.json`), l);
  if (t) escrever(join(dir, 'competicoes', `${t.id}.json`), t);
  for (const [f, h] of Object.entries(CABECALHOS)) escrever(join(dir, f), h + '\n');
  escrever(join(dir, 'overrides.json'), {});
  criados++;
}
console.log(`Pacotes criados: ${criados}`);
