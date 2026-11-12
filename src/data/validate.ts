// Validação de formato e coerência dos pacotes.
import type { Dados } from './load.ts';
import type { RegrasLiga } from './types.ts';

export interface Problema {
  pacote: string;
  nivel: 'erro' | 'aviso';
  msg: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function validarLiga(p: string, l: RegrasLiga, out: Problema[]) {
  const e = (msg: string) => out.push({ pacote: p, nivel: 'erro', msg: `${l.id}: ${msg}` });
  const n = l.formato?.equipas;
  if (!Number.isInteger(n) || n < 2) e('formato.equipas inválido');
  if (!Number.isInteger(l.formato?.voltas) || l.formato.voltas < 1 || l.formato.voltas > 4) e('formato.voltas deve estar entre 1 e 4');
  if (!Array.isArray(l.desempates) || l.desempates[0] !== 'pontos') e('desempates deve começar por "pontos"');
  const sd = l.subidas?.directas ?? 0;
  const dd = l.descidas?.directas ?? 0;
  if (sd + dd + (l.descidas?.barragem ? 1 : 0) > n) e('subidas + descidas excedem o nº de equipas');
  const po = l.subidas?.playoff;
  if (po && (po.de <= sd || po.ate < po.de || po.ate > n - dd)) e('posições do play-off de subida incoerentes');
  const b = l.descidas?.barragem;
  if (b && (b.posicao <= 0 || b.posicao > n - dd)) e('posição da barragem incoerente');
  const pc = l.formato?.playoff_campeao;
  if (pc && (pc.equipas < 2 || pc.equipas > n || (pc.equipas & (pc.equipas - 1)) !== 0)) e('playoff_campeao.equipas deve ser potência de 2 e ≤ equipas');
  if (typeof l.indice_riqueza !== 'number' || l.indice_riqueza < 0 || l.indice_riqueza > 100) e('indice_riqueza deve estar entre 0 e 100');
}

export function validar(d: Dados): Problema[] {
  const out: Problema[] = d.erros.map((msg) => ({ pacote: msg.split('/')[0], nivel: 'erro' as const, msg }));
  const idsClube = new Set<string>();
  const paises = new Map<string, string>(); // pais -> confederação

  for (const pk of d.pacotes) {
    const p = pk.manifest.id;
    const e = (msg: string) => out.push({ pacote: p, nivel: 'erro', msg });
    const a = (msg: string) => out.push({ pacote: p, nivel: 'aviso', msg });
    const m = pk.manifest;
    for (const campo of ['id', 'nome', 'tipo', 'confederacao', 'versao', 'piramide', 'perfil_nomes'] as const) {
      if (m[campo] == null) e(`manifest: campo "${campo}" em falta`);
    }
    if (m.pais) paises.set(m.pais, m.confederacao);
    if (m.quotas_paises) for (const c of Object.keys(m.quotas_paises)) paises.set(c, m.confederacao);
    const porId = new Map(pk.ligas.map((l) => [l.id, l]));
    m.piramide.forEach((id, i) => {
      const l = porId.get(id);
      if (!l) return e(`piramide: liga "${id}" sem ficheiro em competicoes/`);
      if (l.nivel !== i + 1) e(`${id}: nivel ${l.nivel} não corresponde à posição ${i + 1} na pirâmide`);
    });
    if (m.quotas_paises) {
      const soma = Object.values(m.quotas_paises).reduce((s, v) => s + v, 0);
      const l1 = porId.get(m.piramide[0]);
      if (l1 && soma !== l1.formato.equipas) e(`quotas_paises somam ${soma}, a liga tem ${l1.formato.equipas}`);
    }
    for (const l of pk.ligas) validarLiga(p, l, out);
    // Coerência entre divisões vizinhas.
    const ligas = m.piramide.map((id) => porId.get(id)).filter((l): l is RegrasLiga => !!l);
    ligas.forEach((l, i) => {
      const baixo = ligas[i + 1];
      if (i === 0 && l.subidas.directas > 0) e(`${l.id}: o 1.º nível não pode ter subidas`);
      if (!baixo) {
        if (l.descidas.directas > 0 && !l.descidas.exterior) e(`${l.id}: último nível com descidas tem de ter descidas.exterior = true`);
        if (l.descidas.barragem) e(`${l.id}: último nível não pode ter barragem`);
        return;
      }
      if (l.descidas.exterior) e(`${l.id}: só o último nível desce para o exterior`);
      const sobem = baixo.subidas.directas + (baixo.subidas.playoff?.destino === 'subida' ? 1 : 0);
      if (sobem !== l.descidas.directas) e(`${l.id}→${baixo.id}: descem ${l.descidas.directas} mas sobem ${sobem}`);
      const b = l.descidas.barragem;
      const poBar = baixo.subidas.playoff?.destino === 'barragem';
      if (b?.adversario === 'playoff' && !poBar) e(`${l.id}: barragem contra o play-off, mas ${baixo.id} não tem play-off com destino "barragem"`);
      if (poBar && b?.adversario !== 'playoff') e(`${baixo.id}: play-off com destino "barragem" sem barragem correspondente em ${l.id}`);
      if (typeof b?.adversario === 'number' && b.adversario <= baixo.subidas.directas) e(`${l.id}: adversário da barragem (${b.adversario}.º) já sobe directamente`);
    });
    if (pk.taca) {
      for (const nivel of Object.keys(pk.taca.entrada_por_nivel)) {
        if (Number(nivel) > ligas.length) e(`${pk.taca.id}: nível ${nivel} não existe`);
      }
    }
    // Clubes fornecidos.
    const porLiga = new Map<string, number>();
    for (const c of pk.clubes) {
      if (!c.id) { e('clubes.csv: linha sem id'); continue; }
      if (idsClube.has(c.id)) e(`clubes.csv: id duplicado "${c.id}"`);
      idsClube.add(c.id);
      if (!porId.has(c.liga)) e(`clubes.csv: ${c.id} na liga desconhecida "${c.liga}"`);
      porLiga.set(c.liga, (porLiga.get(c.liga) ?? 0) + 1);
      if (!HEX.test(c.cores[0]) || !HEX.test(c.cores[1])) e(`clubes.csv: ${c.id} com cores inválidas`);
      if (c.reputacao && (c.reputacao < 1 || c.reputacao > 100)) e(`clubes.csv: ${c.id} reputação fora de 1–100`);
    }
    for (const l of ligas) {
      const k = porLiga.get(l.id) ?? 0;
      if (k > l.formato.equipas) e(`${l.id}: ${k} clubes fornecidos para ${l.formato.equipas} vagas`);
      else if (k < l.formato.equipas) a(`${l.id}: ${l.formato.equipas - k} clubes serão gerados`);
    }
  }

  // Continentais.
  const c = d.continental;
  if (!c) out.push({ pacote: '_continental', nivel: 'erro', msg: 'pacote continental em falta' });
  else {
    const comps = new Map(c.competicoes.map((x) => [x.id, x]));
    const soma = new Map<string, number>();
    for (const [pais, porComp] of Object.entries(c.vagas.vagas)) {
      const conf = paises.get(pais);
      if (!conf) { out.push({ pacote: '_continental', nivel: 'erro', msg: `vagas: país ${pais} sem pacote activo` }); continue; }
      for (const [comp, v] of Object.entries(porComp)) {
        const cc = comps.get(comp);
        if (!cc) { out.push({ pacote: '_continental', nivel: 'erro', msg: `vagas: competição ${comp} desconhecida` }); continue; }
        if (cc.confederacao !== conf) out.push({ pacote: '_continental', nivel: 'erro', msg: `vagas: ${pais} (${conf}) não pode ter vagas em ${comp}` });
        soma.set(comp, (soma.get(comp) ?? 0) + (v.liga ?? 0) + (v.taca ?? 0));
      }
    }
    for (const cc of c.competicoes) {
      if ((soma.get(cc.id) ?? 0) !== cc.equipas) out.push({ pacote: '_continental', nivel: 'erro', msg: `${cc.id}: ${soma.get(cc.id) ?? 0} vagas para ${cc.equipas} equipas` });
    }
  }
  return out;
}
