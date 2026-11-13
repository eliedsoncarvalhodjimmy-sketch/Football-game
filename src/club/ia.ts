// IA do clube (Prompt 3, Bloco C): arquétipo (personalidade), estado dinâmico e ciclo de decisão.
//   anual (pré-época): arquétipo com inércia, ambição, pressão, posição esperada;
//   mensal: confiança no treinador e despedimentos, choque de filosofia, justa causa, conflito com o utilizador, reacção à crise;
//   por evento: título, subida, descida, título continental, dono novo.
// A IA só usa o que o utilizador também veria (atributos visíveis, resultados, finanças).
import { Rng } from '../core/rng.ts';
import { ARQUETIPOS, PARAMETROS, INERCIA, NOME_ARQUETIPO, type Arquetipo } from '../config/arquetipos.ts';
import { CONFIANCA as CF, FILOSOFIA as FL, DESPEDIMENTO as DP, MERCADO_TREINADORES as MT } from '../config/mercadoTreinadores.ts';
import { INTERFERENCIA } from '../config/treinadores.ts';
import { fundacao } from './ficha.ts';
import type { World } from '../engine/world.ts';
import type { Economia } from '../economia/motorEconomico.ts';
import type { Temporada } from '../engine/season/temporada.ts';
import type { RegistoEpoca } from '../engine/history.ts';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export class IAClubes {
  arquetipo: Arquetipo[] = [];
  arqDesde = new Int32Array(0);
  arqOrigem: string[] = [];
  /** Estado dinâmico: confiança no treinador (0–100), imagem do clube junto dos treinadores (0–100), pressão (0–1), ambição (0–1). */
  confianca = new Float32Array(0);
  imagem = new Float32Array(0);
  pressao = new Float32Array(0);
  ambicao = new Float32Array(0);
  /** Evento na época (dono novo, subida, descida, administração): os orçamentos podem saltar mais do que o limite anual. */
  evento = new Uint8Array(0);
  /** Já reagiu à crise nesta época. */
  reagiu = new Uint8Array(0);
  /** Intenções de venda registadas para o Prompt 4 (clube-vendedor, analítico). */
  intencoes: { dia: number; clube: number; jogador: number; motivo: string }[] = [];
  private posEsperada = new Map<number, number>();

  constructor(public w: World, public e: Economia) {}

  garantir(n: number, csv = new Map<string, string>()) {
    if (n <= this.confianca.length) return;
    const g = <T extends Float32Array | Int32Array | Uint8Array>(a: T, C: new (k: number) => T) => { const b = new C(n); b.set(a); return b; };
    const n0 = this.confianca.length;
    this.confianca = g(this.confianca, Float32Array); this.imagem = g(this.imagem, Float32Array); this.pressao = g(this.pressao, Float32Array);
    this.ambicao = g(this.ambicao, Float32Array); this.arqDesde = g(this.arqDesde, Int32Array); this.evento = g(this.evento, Uint8Array); this.reagiu = g(this.reagiu, Uint8Array);
    const dia0 = Math.floor(Date.UTC(this.w.epoca, 6, 1) / 864e5);
    for (let c = n0; c < n; c++) {
      this.confianca[c] = CF.inicial;
      // Inércia escalonada: cada clube já tem a filosofia há 0–3 anos (evita que todos possam mudar no mesmo ano).
      this.arqDesde[c] = dia0 - Rng.de(this.w.semente, 'arq-desde', this.w.clubes[c].id).int(0, 3) * 365;
      this.imagem[c] = DP.imagem_inicial;
      const manual = csv.get(this.w.clubes[c].id) as Arquetipo | undefined;
      if (manual && ARQUETIPOS.includes(manual)) { this.arquetipo[c] = manual; this.arqOrigem[c] = 'manual'; }
      else { this.arquetipo[c] = this.melhorArquetipo(c, Rng.de(this.w.semente, 'arquetipo', this.w.clubes[c].id)); this.arqOrigem[c] = 'gerado'; }
    }
  }

  /** Pontuação de cada arquétipo: reputação, riqueza, dono, idade média do plantel e história (fundação). */
  pontuacoes(c: number): Record<Arquetipo, number> {
    const w = this.w, e = this.e;
    const rep = w.reputacao[c] / 100;
    const d = e.donos[c];
    const l = w.liga[c];
    const ind = l >= 0 ? w.ligas[l].regras.indice_riqueza / 100 : 0.2;
    const st = w.jogadores;
    let idade = 26;
    if (st) { const js = w.plantel[c].filter((j) => st.clube[j] === c); if (js.length) idade = js.reduce((s, j) => s + st.idade(j, Math.floor(Date.UTC(w.epoca, 7, 1) / 864e5)), 0) / js.length; }
    const antigo = (1960 - fundacao(w, c)) / 60; // ~0 a 1,5
    const tipo = d?.tipo ?? 'familia';
    const a = d?.atributos;
    return {
      formador: 0.6 + (26 - idade) * 0.25 + (tipo === 'adeptos' || tipo === 'familia' ? 0.4 : 0) + (0.6 - Math.abs(rep - 0.5)) + (a ? (a.paciencia - 10) / 20 : 0),
      comprador_estrelas: 1.6 * rep + 1.2 * ind + (tipo === 'bilionario' || tipo === 'estado' ? 0.7 : 0) + (a ? (a.ambicao - 10) / 15 : 0) - 0.4,
      analitico: 0.7 + (tipo === 'investimento' || tipo === 'multiclube' ? 0.8 : 0) + (a ? (a.risco - 10) / 30 : 0) - Math.abs(rep - 0.55),
      magnata_impaciente: (tipo === 'bilionario' || tipo === 'estado' ? 0.9 : -0.5) + (a ? (a.ambicao - a.paciencia) / 12 : 0),
      tradicional: 0.5 + 0.6 * antigo + (tipo === 'adeptos' || tipo === 'familia' ? 0.3 : 0) + (a ? (a.lealdade - 10) / 25 : 0) + 0.3 * rep,
      vendedor: 0.6 + (0.5 - ind) * 1.2 + (tipo === 'multiclube' ? 0.6 : 0) + (rep > 0.55 && ind < 0.3 ? 0.5 : 0) + (26 - idade) * 0.1,
    };
  }

  melhorArquetipo(c: number, rng: Rng): Arquetipo {
    const p = this.pontuacoes(c);
    let m: Arquetipo = 'tradicional', v = -Infinity;
    for (const a of ARQUETIPOS) { const x = p[a] + rng.normal(0, INERCIA.ruido); if (x > v) { v = x; m = a; } }
    return m;
  }

  // ---------------------------------------------------------------- anual

  abrirEpoca(t: Temporada) {
    const w = this.w, e = this.e;
    this.garantir(w.clubes.length);
    for (const p of t.pacotes) for (const li of p.ligas) {
      const L = w.ligas[li];
      const ordem = [...L.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
      ordem.forEach((c, i) => this.posEsperada.set(c, i + 1));
      for (const c of L.clubes) {
        this.reagiu[c] = 0;
        const rng = Rng.de(w.semente, 'ia-ano', w.clubes[c].id, t.ano);
        // Arquétipo com inércia: só muda se outro passar o actual pela margem, e no máximo uma vez em N anos (excepto com dono novo).
        if (this.arqOrigem[c] !== 'manual') {
          const pts = this.pontuacoes(c);
          const novo = this.melhorArquetipo(c, rng);
          const anos = (t.base - this.arqDesde[c]) / 365;
          if (novo !== this.arquetipo[c] && pts[novo] - pts[this.arquetipo[c]] > INERCIA.margem && (anos >= INERCIA.anos || this.evento[c])) {
            e.registar(t.base, c, 'arquetipo', `muda de filosofia: ${NOME_ARQUETIPO[this.arquetipo[c]]} → ${NOME_ARQUETIPO[novo]}`);
            this.arquetipo[c] = novo;
            this.arqDesde[c] = t.base;
          }
        }
        const d = e.donos[c];
        this.ambicao[c] = clamp((d ? d.atributos.ambicao / 20 : 0.5) * (this.arquetipo[c] === 'comprador_estrelas' || this.arquetipo[c] === 'magnata_impaciente' ? 1.2 : 1), 0, 1);
        this.pressao[c] = clamp(0.3 + 0.5 * this.ambicao[c] + 0.3 * w.reputacao[c] / 100, 0, 1);
      }
    }
  }

  /** Fecho de época: confiança pelos eventos (título, subida, descida, continental), reputação dos treinadores, contratos, staff. */
  fecharEpoca(t: Temporada, reg: RegistoEpoca) {
    const w = this.w, e = this.e;
    const dia = t.base + 51 * 7;
    const ts = w.motor!.treinadores;
    const campeoes = new Set(Object.values(reg.campeoes));
    const continental = new Set(Object.values(reg.continentais).map((x) => x.vencedor));
    const subidos = new Set(reg.movimentos.filter((m) => m.via !== 'exterior' && e.nivelLiga(m.para) < e.nivelLiga(m.de)).map((m) => m.clube));
    const descidos = new Set(reg.movimentos.filter((m) => m.via !== 'exterior' && e.nivelLiga(m.para) > e.nivelLiga(m.de)).map((m) => m.clube));
    for (const [id, tab] of Object.entries(reg.tabelas)) {
      const n = tab.length;
      tab.forEach((linha, i) => {
        const c = linha.clube;
        if (c >= this.confianca.length) return;
        const tr = ts[c];
        const esperada = this.posEsperada.get(c) ?? (n + 1) / 2;
        // Reputação do treinador: desempenho face ao esperado e títulos.
        let dr = (MT.reputacao_desempenho * (esperada - (i + 1)) * 20) / n;
        if (campeoes.has(c)) dr += MT.reputacao_titulo * (e.nivelLiga(id) === 1 ? 1 : 0.5);
        if (continental.has(c)) dr += MT.reputacao_titulo;
        tr.reputacao = clamp(Math.round((tr.reputacao ?? 50) + clamp(dr, -MT.reputacao_max_variacao, MT.reputacao_max_variacao)), 1, 100);
        tr.idade = (tr.idade ?? 50) + 1;
        // Confiança: eventos.
        if (campeoes.has(c)) this.confianca[c] += CF.titulo;
        if (subidos.has(c)) { this.confianca[c] += CF.subida; this.evento[c] = 1; }
        if (descidos.has(c)) { this.confianca[c] += CF.descida; this.evento[c] = 1; }
        if (continental.has(c)) { this.confianca[c] += CF.continental; this.ambicao[c] = clamp(this.ambicao[c] + 0.1, 0, 1); }
        this.confianca[c] = clamp(this.confianca[c], 0, 100);
        this.imagem[c] = clamp(this.imagem[c] + DP.imagem_recuperacao, 0, 100);
      });
    }
    for (const p of t.pacotes) for (const li of p.ligas) for (const c of w.ligas[li].clubes) {
      const rng = Rng.de(w.semente, 'ia-fecho', w.clubes[c].id, t.ano);
      const tr = ts[c];
      // Reforma (65–70) ou fim de contrato: renova se o clube confiar nele (e ele aceitar continuar).
      const idade = tr.idade ?? 50;
      if (idade >= MT.reforma_inicio && rng.chance((idade - MT.reforma_inicio + 1) / (MT.reforma_fim - MT.reforma_inicio + 1))) {
        e.registar(dia, c, 'treinador_sai', `${tr.nome} reforma-se aos ${idade} anos`);
        e.mercadoT.sair(c, tr, dia, 'reforma');
        e.mercadoT.procurar(c, dia, rng);
      } else if ((tr.contratoFim ?? 0) <= dia + 45) {
        if (this.confianca[c] >= CF.renova && rng.chance(e.mercadoT.probAceitar(tr, c))) e.mercadoT.contrato(tr, c, dia, rng);
        else {
          e.registar(dia, c, 'treinador_sai', `${tr.nome} sai no fim do contrato`);
          e.mercadoT.sair(c, tr, dia, 'fim_contrato');
          e.mercadoT.procurar(c, dia, rng);
        }
      }
      // Staff: renovações e melhoria de um cargo.
      const novo = e.staff.epoca(c, dia, e.clubes.receitaPrevista[c], e.clubes.orcStaff[c] - e.custoTreinador(c), rng, (cl, v, origem) => {
        e.clubes.lancar(cl, 'staff', v);
        if (origem !== undefined && origem >= 0) e.clubes.lancar(origem, 'outras', v);
      });
      if (novo) e.registar(dia, c, 'staff', `contrata ${novo.nome} (${novo.cargo}, nível ${novo.nivel})`, novo.salario);
      this.evento[c] = 0;
    }
  }

  // ---------------------------------------------------------------- mensal

  mes(dia: number) {
    const w = this.w, e = this.e;
    this.garantir(w.clubes.length);
    // Posição actual em cada liga a decorrer.
    const actual = new Map<number, [number, number, number]>(); // clube → [posição, nº, jogos]
    for (const t of e.temporadas?.values() ?? []) for (const comp of t.ligas.values()) {
      if (comp.terminada()) continue;
      const tab = comp.tabela.ordenar(comp.regras.desempates);
      tab.forEach((l, i) => actual.set(l.clube, [i + 1, tab.length, l.pj]));
    }
    const ts = w.motor!.treinadores;
    for (let c = 0; c < this.confianca.length; c++) {
      if (w.liga[c] < 0) continue;
      const tr = ts[c];
      const rng = Rng.de(w.semente, 'ia-mes', w.clubes[c].id, dia);
      const d = e.donos[c];
      const arq = PARAMETROS[this.arquetipo[c]];
      // 1. Conflito com o utilizador (interferência): em crise, o treinador demite-se.
      const m = w.motor!;
      if (FL.demite_se_conflito && m.clubeUtilizador === c && m.relacao && m.relacao.conflito >= INTERFERENCIA.crise) {
        e.mercadoT.demissao(c, dia, rng, `conflito com o presidente: ${Math.round(m.relacao.conflito)}/100`);
        continue;
      }
      // 2. Confiança pelos resultados (posição actual face à esperada).
      const a = actual.get(c);
      const desde = tr.carreira?.at(-1)?.desde ?? 0;
      if (a && a[2] >= CF.jornadas_minimas && dia - desde >= CF.carencia_dias) {
        const esperada = this.posEsperada.get(c) ?? (a[1] + 1) / 2;
        this.confianca[c] = clamp(this.confianca[c] + (CF.por_desempenho * (esperada - a[0]) * 10) / a[1] - CF.regresso * (this.confianca[c] - 60), 0, 100);
        // Despedimento por resultados: paciência do dono e do arquétipo; lua de mel do dono = paciência máxima.
        const pac = d ? (dia < d.luaDeMelAte ? 2 : (0.5 + d.atributos.paciencia / 20) * arq.paciencia) : arq.paciencia;
        if (this.confianca[c] < CF.limiar / pac && rng.chance(CF.prob_despedir)) {
          e.mercadoT.despedir(c, dia, 'resultados', rng, `${a[0]}.º, esperado ${esperada}.º`);
          continue;
        }
      }
      // 3. Justa causa (indisciplina, escândalo), rara.
      if (rng.chance((DP.justa_causa_anual / 12) * (1.5 - tr.atributos.disciplina / 20))) {
        e.mercadoT.despedir(c, dia, 'justa_causa', rng, rng.chance(0.5) ? 'indisciplina' : 'escândalo');
        continue;
      }
      // 4. Choque de filosofia: o treinador cumpre em parte e a moral desce; pede para sair ou entra em conflito público.
      const compat = arq.perfis[tr.perfil] ?? 1;
      if (compat < FL.choque_abaixo) {
        tr.moral = clamp((tr.moral ?? 70) - FL.moral_por_mes * (1.5 - tr.atributos.adaptabilidade / 20), 0, 100);
        if ((tr.moral ?? 70) < FL.moral_saida) {
          const cede = clamp(0.5 + (w.reputacao[c] - tr.atributos.autoridade * 5) / 100, 0, 1);
          if (tr.atributos.autoridade >= FL.conflito_autoridade && !tr.conflito) {
            tr.conflito = true;
            this.confianca[c] = clamp(this.confianca[c] - 15, 0, 100);
            e.registar(dia, c, 'conflito', `${tr.nome} entra em conflito público com a direcção (filosofia ${NOME_ARQUETIPO[this.arquetipo[c]]} contra o seu estilo ${tr.perfil}; cede ${Math.round(100 * cede)}%)`);
          } else if (rng.chance(0.3)) {
            e.mercadoT.despedir(c, dia, 'mutuo_acordo', rng, `choque de filosofia: ${NOME_ARQUETIPO[this.arquetipo[c]]} contra ${tr.perfil}`);
            continue;
          }
        }
      } else tr.moral = clamp((tr.moral ?? 70) + 2, 0, 85);
      // 5. Reacção à crise (uma vez por época), pelo arquétipo.
      if (e.clubes.saude[c] >= 2 && !this.reagiu[c]) { this.reagiu[c] = 1; this.crise(c, dia, rng); }
    }
  }

  /** Reacção à crise por arquétipo. */
  crise(c: number, dia: number, rng: Rng) {
    const w = this.w, e = this.e, s = e.clubes;
    const st = w.jogadores;
    const arq = PARAMETROS[this.arquetipo[c]];
    const melhor = () => (st ? w.plantel[c].filter((j) => st.clube[j] === c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a))[0] : -1);
    switch (arq.crise) {
      case 'cortar_salarios':
        s.escalaClube[c] *= 0.9;
        e.registar(dia, c, 'crise', 'crise: corta salários (renovações 10% abaixo) e aposta nos jovens');
        break;
      case 'endividar_despedir':
        e.registar(dia, c, 'crise', 'crise: o dono endivida o clube e despede o treinador');
        if (this.confianca[c] < 70) e.mercadoT.despedir(c, dia, 'resultados', rng, 'crise');
        break;
      case 'vender_melhor': {
        const j = melhor();
        if (j >= 0) this.intencoes.push({ dia, clube: c, jogador: j, motivo: 'crise: vender o melhor jogador' });
        e.registar(dia, c, 'crise', `crise: quer vender o melhor jogador${j >= 0 && st ? ` (${st.nomes[j]})` : ''} — a venda fica para o mercado do Prompt 4`);
        break;
      }
      case 'vender_pico': {
        const js = st ? w.plantel[c].filter((j) => st.clube[j] === c && st.idade(j, dia) >= 26 && st.idade(j, dia) <= 29).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)) : [];
        if (js.length) this.intencoes.push({ dia, clube: c, jogador: js[0], motivo: 'crise: vender quem está no pico' });
        e.registar(dia, c, 'crise', 'crise: quer vender quem está no pico — fica para o mercado do Prompt 4');
        break;
      }
      case 'arriscar_ffp':
        s.orcSalarios[c] *= 1.1;
        e.registar(dia, c, 'crise', 'crise: arrisca o fair play (orçamento de salários +10%)');
        break;
      default:
        e.registar(dia, c, 'crise', 'crise: aguenta, sem mudanças');
    }
  }

  // ---------------------------------------------------------------- eventos

  novoTreinador(c: number, _dia: number) {
    this.garantir(this.w.clubes.length);
    this.confianca[c] = CF.inicial;
  }

  /** Dono novo: pode mudar a filosofia já e despedir o treinador. */
  donoNovo(c: number, dia: number, rng: Rng) {
    this.garantir(this.w.clubes.length);
    this.evento[c] = 1;
    this.arqDesde[c] = 0;
    const d = this.e.donos[c];
    if (d && this.confianca[c] < 70 && rng.chance((d.atributos.interferencia / 20) * CF.dono_novo)) this.e.mercadoT.despedir(c, dia, 'resultados', rng, 'escolha do dono novo');
  }

  vaga(c: number, dia: number, rng: Rng) {
    if (this.w.motor!.treinadores[c].clube !== c) this.e.mercadoT.procurar(c, dia, rng);
  }
}
