// Leitura dos guiões de imprensa (data/imprensa/guioes.md, no formato do utilizador) para dados estruturados.
import { ESCALA_EFEITOS, VARIAVEIS, type CodigoEfeito } from '../config/imprensa';

export type Modo = 'DIR' | 'DONO' | 'AMBOS';
export type Disponibilidade = 'cumprida' | 'em-curso' | 'falhada';

export interface RespostaGuiao {
  letra: 'A' | 'B' | 'C';
  tom: string;
  texto: string;
  /** Efeitos imediatos (−3…+3). */
  efeitos: Partial<Record<CodigoEfeito, number>>;
  /** Texto da promessa (com prazo e consequências), se a resposta for uma PROMESSA. */
  promessa?: string;
  /** Condição em que a resposta é uma MENTIRA (texto do guião). */
  mentira?: string;
  /** Probabilidade de multa (0–1). */
  multa?: number;
  /** Só aparece se a promessa referida estiver neste estado (IMP-066). */
  disponivel?: Disponibilidade;
  /** Efeitos especiais e condições, tal como escritos no guião (para o motor tratar). */
  notas?: string;
}

export interface PerguntaGuiao {
  id: string;
  titulo: string;
  seccao: string;
  quando: string;
  modo: Modo;
  jornalista: string | null;
  /** local, nacional, desportiva, estrangeira, economica, canal, blogue, todos, mesmo (o que fez a promessa) ou qualquer. */
  tipoJornalista: string;
  pergunta: string;
  respostas: RespostaGuiao[];
  variaveis: string[];
}

const SINAL = (s: string) => Number(s.replace('−', '-').replace('+', ''));

function tipoJornalista(j: string | null): string {
  if (!j) return 'qualquer';
  const t = j.toLowerCase();
  if (t.includes('local')) return 'local';
  if (t.includes('nacional')) return 'nacional';
  if (t.includes('estrangeira')) return 'estrangeira';
  if (t.includes('económica') || t.includes('economica')) return 'economica';
  if (t.includes('desportiva')) return 'desportiva';
  if (t.includes('canal')) return 'canal';
  if (t.includes('blogue')) return 'blogue';
  if (t.includes('todos')) return 'todos';
  if (t.includes('mesmo')) return 'mesmo';
  return 'qualquer';
}

/** Tira um "PALAVRA (...)" com parênteses equilibrados; devolve [conteúdo, resto]. */
function extrairParenteses(txt: string, palavra: string): [string | undefined, string] {
  const i = txt.indexOf(palavra + ' (');
  if (i < 0) return [undefined, txt];
  let p = i + palavra.length + 1, nivel = 0, fim = -1;
  for (let k = p; k < txt.length; k++) { if (txt[k] === '(') nivel++; else if (txt[k] === ')') { nivel--; if (nivel === 0) { fim = k; break; } } }
  if (fim < 0) return [undefined, txt];
  return [txt.slice(p + 1, fim).trim(), txt.slice(0, i) + txt.slice(fim + 1)];
}

function lerResposta(linha: string): RespostaGuiao {
  const m = linha.match(/^- \*\*([ABC]) \(([^)]+)\):\*\* "([^"]+)"\s*(.*)$/);
  if (!m) throw new Error(`Resposta mal formada: ${linha}`);
  const [, letra, tom, texto] = m;
  let resto = m[4].trim();
  const r: RespostaGuiao = { letra: letra as 'A' | 'B' | 'C', tom, texto, efeitos: {} };
  const [prom, semProm] = extrairParenteses(resto, 'PROMESSA');
  if (prom !== undefined) { r.promessa = prom; resto = semProm; if (/MENTIRA/.test(prom)) r.mentira = prom.split(';').find((x) => /MENTIRA/.test(x))?.trim(); }
  const disp = resto.match(/\(só disponível se ([^)]+)\)/);
  if (disp) { r.disponivel = disp[1].includes('cumprida') ? 'cumprida' : disp[1].includes('curso') ? 'em-curso' : 'falhada'; resto = resto.replace(disp[0], ''); }
  const multa = resto.match(/probabilidade (\d+)%/);
  if (multa) r.multa = Number(multa[1]) / 100;
  if (/MENTIRA/.test(resto) && !r.mentira) r.mentira = (resto.match(/[^.]*MENTIRA[^.]*/)?.[0] ?? 'MENTIRA').trim();
  // Efeitos imediatos: o primeiro valor de cada código (os valores entre parênteses são condições, ficam nas notas).
  const semParen = resto.replace(/\([^)]*\)/g, '');
  for (const e of semParen.matchAll(/\b(EQ|AD|DN|IM|TR|BL) ([+−-]?\d)/g)) {
    const k = e[1] as CodigoEfeito; if (r.efeitos[k] === undefined) r.efeitos[k] = SINAL(e[2]);
  }
  for (const k of Object.keys(r.efeitos) as CodigoEfeito[]) if (r.efeitos[k] === 0) delete r.efeitos[k];
  const notas = resto.replace(/\b(EQ|AD|DN|IM|TR|BL) [+−-]?\d,?/g, '').replace(/PROMESSA\.?/g, '').replace(/^[\s.,]+|[\s.,]+$/g, '').trim();
  if (notas) r.notas = notas;
  return r;
}

export function lerGuioes(md: string): PerguntaGuiao[] {
  const linhas = md.split(/\r?\n/);
  const out: PerguntaGuiao[] = [];
  let seccao = '', atual: PerguntaGuiao | null = null;
  for (const l of linhas) {
    const s = l.match(/^## (\d+)\. (.+)$/);
    if (s) { seccao = s[2].trim(); continue; }
    const h = l.match(/^### (IMP-\d{3}) — (.+)$/);
    if (h) { atual = { id: h[1], titulo: h[2].trim(), seccao, quando: '', modo: 'AMBOS', jornalista: null, tipoJornalista: 'qualquer', pergunta: '', respostas: [], variaveis: [] }; out.push(atual); continue; }
    if (!atual) continue;
    if (l.startsWith('**Quando:**')) {
      const quando = l.match(/\*\*Quando:\*\*\s*(.*?)(?=\s*\*\*|$)/)?.[1] ?? '';
      atual.quando = quando.replace(/\.$/, '').trim();
      const modo = l.match(/\*\*Modo:\*\*\s*(DIR|DONO|AMBOS)/)?.[1] ?? quando.match(/modo (DIR|DONO)\b/)?.[1];
      if (modo) atual.modo = modo as Modo;
      const j = l.match(/\*\*Jornalista:\*\*\s*(.*?)\.?\s*$/)?.[1] ?? null;
      atual.jornalista = j; atual.tipoJornalista = tipoJornalista(j);
    } else if (l.startsWith('**Pergunta:**')) atual.pergunta = l.match(/"(.+)"/)?.[1] ?? '';
    else if (/^- \*\*[ABC] \(/.test(l)) atual.respostas.push(lerResposta(l));
  }
  for (const p of out) {
    const todos = [p.pergunta, ...p.respostas.map((r) => r.texto)].join(' ');
    p.variaveis = [...new Set([...todos.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]))];
  }
  return out;
}

export interface Validacao { erros: string[]; avisos: string[] }
export function validarGuioes(g: PerguntaGuiao[]): Validacao {
  const erros: string[] = [], avisos: string[] = [];
  const ids = new Set<string>();
  for (const p of g) {
    if (ids.has(p.id)) erros.push(`${p.id}: identificador repetido`); ids.add(p.id);
    if (!p.pergunta) erros.push(`${p.id}: sem pergunta`);
    if (!p.quando) erros.push(`${p.id}: sem gatilho (Quando)`);
    if (p.respostas.length !== 3) erros.push(`${p.id}: ${p.respostas.length} respostas (esperadas 3)`);
    for (const r of p.respostas) for (const [k, v] of Object.entries(r.efeitos)) if (v! < ESCALA_EFEITOS.minimo || v! > ESCALA_EFEITOS.maximo) erros.push(`${p.id}${r.letra}: ${k} ${v} fora da escala`);
    for (const v of p.variaveis) if (!VARIAVEIS.includes(v)) erros.push(`${p.id}: variável desconhecida {${v}}`);
    if (!p.jornalista) avisos.push(`${p.id}: sem jornalista (qualquer um)`);
  }
  return { erros, avisos };
}
