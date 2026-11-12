// Gerador de nomes fictícios (cidades, clubes, estádios) a partir dos perfis.
import { Rng } from '../core/rng.ts';
import { perfil, type PerfilNomes } from './perfisNomes.ts';

function ponderado(rng: Rng, itens: [string, number][]): string {
  const total = itens.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [v, w] of itens) {
    r -= w;
    if (r < 0) return v;
  }
  return itens[itens.length - 1][0];
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function semAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export class GeradorNomes {
  private p: PerfilNomes;
  private bloqueio: Set<string>;

  constructor(perfilId: string, private rng: Rng, private usados: Set<string>) {
    this.p = perfil(perfilId);
    this.bloqueio = new Set((this.p.bloqueio ?? []).map((b) => b.toLowerCase()));
  }

  cidade(): string {
    for (let t = 0; t < 200; t++) {
      const meio = this.p.meio && this.p.meio.length && this.rng.chance(0.15) ? this.rng.pick(this.p.meio) : '';
      const ini = this.rng.pick(this.p.ini);
      const fim = this.rng.pick(this.p.fim);
      if (ini.trim().toLowerCase() === fim.trim().toLowerCase()) continue;
      let c = ini + meio + fim;
      // As sílabas já trazem as maiúsculas certas ("Vila " + "da Ribeira"); só a 1.ª letra é forçada.
      c = capitalizar(c).replace(/-([a-zà-ÿ])/g, (_, x: string) => '-' + x.toUpperCase());
      c = c.replace(/([a-z])\1\1/g, '$1$1');
      if (this.bloqueio.has(c.toLowerCase())) continue;
      if (this.usados.has('cidade:' + c)) continue;
      this.usados.add('cidade:' + c);
      return c;
    }
    throw new Error('não foi possível gerar uma cidade única');
  }

  clube(cidade: string): string {
    for (let t = 0; t < 100; t++) {
      const nome = ponderado(this.rng, this.p.padroes).replace('{C}', cidade);
      if (this.usados.has('clube:' + nome)) continue;
      this.usados.add('clube:' + nome);
      return nome;
    }
    // Último recurso: acrescenta um ano de fundação.
    const nome = `${cidade} ${1890 + this.rng.int(0, 90)}`;
    this.usados.add('clube:' + nome);
    return nome;
  }

  estadio(cidade: string): string {
    return this.rng.pick(this.p.estadio).replace('{C}', cidade);
  }
}

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'del', 'la', 'las', 'los', 'el', 'al', 'of', 'the', 'nad']);
const PREFIXOS = new Set(['al', 'ras', 'wadi', 'bab', 'ain', 'jabal', 'umm', 'san', 'santa', 'villa', 'vila', 'sao', 'puerto', 'porto', 'rio',
  'cerro', 'valle', 'monte', 'llano', 'nueva', 'nova', 'torre', 'ponte', 'povoa', 'quinta', 'serra', 'barca', 'azenha', 'campo', 'barra',
  'general', 'coronel', 'barrio', 'colonia', 'agia', 'kato', 'ano', 'oued', 'bir', 'sidi', 'bordj', 'dar', 'saint',
  'lugar', 'casal', 'pouso', 'lagoa', 'ribeirao', 'arraial', 'vale', 'morro', 'loma', 'paso']);

/** Sigla de 3 letras, única dentro do país. */
export function nomeCurto(cidade: string, usados: Set<string>): string {
  const palavras = semAcentos(cidade).split(/[\s-]+/).filter(Boolean);
  const sig = palavras.filter((p, i) => !PARTICULAS.has(p.toLowerCase()) && !(i === 0 && palavras.length > 1 && PREFIXOS.has(p.toLowerCase())));
  const base = (sig[0] ?? palavras[0]).replace(/[^A-Za-z]/g, '').toUpperCase();
  const cands = [base.slice(0, 3), base[0] + base.slice(2, 4), base[0] + base[1] + base[base.length - 1], base[0] + base.slice(-2)];
  for (const c of cands) if (c.length === 3 && !usados.has(c)) { usados.add(c); return c; }
  for (let i = 0; i < 26; i++) {
    const c = base.slice(0, 2) + String.fromCharCode(65 + i);
    if (!usados.has(c)) { usados.add(c); return c; }
  }
  return base.slice(0, 3);
}
