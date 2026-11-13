// Mercado de treinadores (Prompt 3, Bloco C): contratos, reserva de livres, contratação, despedimentos, reforma.
import { Rng } from '../core/rng.ts';
import { MERCADO_TREINADORES as MT, DESPEDIMENTO as DP } from '../config/mercadoTreinadores.ts';
import { PARAMETROS } from '../config/arquetipos.ts';
import { gerarTreinador } from './gerador.ts';
import { fimDeEpoca } from '../economia/contratos.ts';
import type { Treinador } from './store.ts';
import type { World } from '../engine/world.ts';
import type { Economia } from '../economia/motorEconomico.ts';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const euros = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(2)} M€` : `${Math.round(x / 1e3)} mil €`);
const media = (t: Treinador) => (t.atributos.tactica + t.atributos.motivacao + t.atributos.desenvolvimento + t.atributos.gestao + t.atributos.disciplina) / 5;

export type MotivoSaida = 'resultados' | 'justa_causa' | 'mutuo_acordo' | 'saiu_para_outro' | 'demissao' | 'fim_contrato' | 'reforma';

export class MercadoTreinadores {
  livres: Treinador[] = [];
  reformados = 0;
  private seq = 0;

  constructor(public w: World, public e: Economia) {}

  /** Salário pedido por um treinador para treinar o clube c. */
  salario(t: Treinador, c: number): number {
    const receita = Math.max(1, this.e.clubes.receitaPrevista[c]);
    return Math.max(MT.salario_minimo, Math.round((MT.salario_fraccao_receita * receita * (0.6 + (0.8 * (t.reputacao ?? 50)) / 100)) / 1000) * 1000);
  }

  /** Completa os treinadores do Prompt 2 (um por clube) com idade, reputação e contrato; gera a reserva de livres. */
  iniciar(dia: number) {
    const w = this.w;
    w.motor!.treinadores.forEach((t, c) => this.prepararEmpregado(t, c, dia, Rng.de(w.semente, 'contrato-treinador', w.clubes[c].id)));
    this.gerarLivres(dia, MT.livres);
  }

  prepararEmpregado(t: Treinador, c: number, dia: number, rng: Rng) {
    if (t.reputacao === undefined) t.reputacao = clamp(Math.round(MT.reputacao_clube * this.w.reputacao[c] + MT.reputacao_atributos * (media(t) - 10) + rng.normal(0, MT.reputacao_ruido)), 1, 100);
    if (t.idade === undefined) t.idade = rng.int(MT.idade[0], MT.idade[1]);
    t.estado = 'empregado';
    t.clube = c;
    t.moral = 70;
    t.carreira ??= [{ clube: c, desde: dia - rng.int(0, 3) * 365 }];
    this.contrato(t, c, dia, rng);
  }

  contrato(t: Treinador, c: number, dia: number, rng: Rng) {
    const anos = rng.int(MT.anos[0], MT.anos[1]);
    t.salario = this.salario(t, c);
    // Acaba no fim de uma época; contratado tarde (a menos de 4 meses do fim), cobre pelo menos a época seguinte.
    t.contratoFim = fimDeEpoca(this.w, c, dia + 120, anos);
    t.clausula = t.salario * anos * MT.clausula;
    // Pedidos: os treinadores com mais reputação pedem mais (orçamento, reforços, autonomia).
    const r = (t.reputacao ?? 50) / 100;
    t.pedidos = { orcamento: Math.round(100 * (0.05 + 0.15 * r)) / 100, reforcos: Math.round(1 + 4 * r), autonomia: Math.round(100 * clamp(0.3 + 0.5 * r + (t.atributos.autoridade - 10) / 40, 0, 1)) / 100 };
  }

  gerarLivres(dia: number, n: number) {
    const w = this.w;
    const rng = Rng.de(w.semente, 'treinadores-livres', dia);
    for (let k = 0; k < n; k++) {
      const modelo = rng.int(0, w.clubes.length - 1);
      const t = gerarTreinador(w, modelo, rng, `tl${dia}_${++this.seq}`);
      t.clube = -1;
      t.estado = 'livre';
      t.idade = rng.int(MT.idade_novos[0], MT.idade[1]);
      t.reputacao = clamp(Math.round(MT.reputacao_clube * w.reputacao[modelo] * (0.6 + 0.5 * rng.next()) + MT.reputacao_atributos * (media(t) - 10) + rng.normal(0, MT.reputacao_ruido)), 1, 100);
      t.moral = 70;
      t.carreira = [];
      this.livres.push(t);
    }
  }

  /** Probabilidade de um treinador aceitar o projecto do clube (os bons recusam projectos fracos). */
  probAceitar(t: Treinador, c: number): number {
    const imagem = this.e.ia.imagem[c] ?? DP.imagem_inicial;
    const x = (this.w.reputacao[c] + MT.aceita_folga - (t.reputacao ?? 50)) / MT.aceita_escala + (imagem - 50) / 25;
    return 1 / (1 + Math.exp(-x));
  }

  /** Pontuação de um candidato para o clube: compatibilidade com a filosofia, qualidade e reputação (face à do clube). */
  pontuar(t: Treinador, c: number): number {
    const arq = PARAMETROS[this.e.ia.arquetipo[c]];
    const compat = arq.perfis[t.perfil] ?? 1;
    const rep = t.reputacao ?? 50;
    const d = this.e.donos[c];
    // Dono paciente valoriza formadores e gestores; impaciente valoriza reputação.
    const pesoRep = d ? 1 + (10 - d.atributos.paciencia) / 20 : 1;
    return 1.5 * compat + 0.25 * (media(t) - 10) + (pesoRep * Math.min(rep, this.w.reputacao[c] + 10)) / 15;
  }

  /** Procura e contrata um treinador para o clube (livre, ou empregado num clube mais pequeno pagando a cláusula). */
  procurar(c: number, dia: number, rng: Rng): Treinador {
    const w = this.w;
    const cand: { t: Treinador; v: number; origem: number }[] = [];
    const amostra = Math.min(this.livres.length, MT.candidatos);
    const passo = Math.max(1, Math.floor(this.livres.length / amostra));
    const inicio = rng.int(0, Math.max(0, passo - 1));
    // Quem saiu deste clube nos últimos 2 anos não volta já.
    const saiuHaPouco = (t: Treinador) => !!t.carreira?.some((x) => x.clube === c && x.ate !== undefined && dia - x.ate < 730);
    for (let k = inicio; k < this.livres.length; k += passo) if (!saiuHaPouco(this.livres[k])) cand.push({ t: this.livres[k], v: this.pontuar(this.livres[k], c), origem: -1 });
    if (w.reputacao[c] >= MT.roubar_reputacao) {
      const ts = w.motor!.treinadores;
      for (let k = 0; k < 40; k++) {
        const o = rng.int(0, ts.length - 1);
        if (o === c || w.liga[o] < 0 || w.reputacao[o] > w.reputacao[c] - MT.roubar_diferenca) continue;
        cand.push({ t: ts[o], v: this.pontuar(ts[o], c) - 0.3, origem: o });
      }
    }
    cand.sort((a, b) => b.v - a.v);
    for (const x of cand.slice(0, 12)) {
      if (!rng.chance(this.probAceitar(x.t, c))) continue;
      if (x.origem >= 0) {
        // O clube paga a cláusula ao clube de origem, que tem de procurar outro treinador.
        const cl = x.t.clausula ?? 0;
        this.e.clubes.lancar(c, 'indemnizacoes', cl);
        this.e.clubes.lancar(x.origem, 'outras', cl);
        this.sair(x.origem, x.t, dia, 'saiu_para_outro', false);
        this.contratar(c, x.t, dia, rng);
        this.e.registar(dia, x.origem, 'treinador_sai', `${x.t.nome} sai para o ${w.clubes[c].nome} (cláusula de ${(cl / 1e6).toFixed(1)} M€)`, cl);
        this.e.ia.vaga(x.origem, dia, Rng.de(w.semente, 'vaga', w.clubes[x.origem].id, dia));
        return x.t;
      }
      this.livres = this.livres.filter((t) => t !== x.t);
      this.contratar(c, x.t, dia, rng);
      return x.t;
    }
    // Ninguém aceitou: um treinador novo (gerado ao nível do clube).
    const t = gerarTreinador(w, c, rng, `tn${dia}_${++this.seq}`);
    t.idade = rng.int(MT.idade_novos[0], MT.idade_novos[1]);
    t.reputacao = clamp(Math.round(0.55 * w.reputacao[c] + rng.normal(0, 4)), 1, 100);
    t.carreira = [];
    this.contratar(c, t, dia, rng);
    return t;
  }

  contratar(c: number, t: Treinador, dia: number, rng: Rng) {
    const w = this.w;
    const i = this.livres.indexOf(t);
    if (i >= 0) this.livres.splice(i, 1);
    t.clube = c;
    t.estado = 'empregado';
    t.moral = 70;
    t.conflito = false;
    // A preferência do treinador: as suas formações e instruções (já no objecto); os papéis preferidos ficam os dele.
    this.contrato(t, c, dia, rng);
    (t.carreira ??= []).push({ clube: c, desde: dia });
    w.motor!.treinadores[c] = t;
    w.motor!.cache.limpar();
    // Táctica nova: o entrosamento do plantel desce.
    const st = w.jogadores;
    if (st) for (const j of w.plantel[c]) if (st.clube[j] === c) st.entrosamento[j] = Math.round(st.entrosamento[j] * 0.6);
    this.e.ia.novoTreinador(c, dia);
    if (w.motor!.clubeUtilizador === c && w.motor!.relacao) w.motor!.definirClubeUtilizador(c);
    this.e.registar(dia, c, 'treinador_contratado', `contrata ${t.nome} (${t.perfil}, reputação ${t.reputacao}, ${((t.salario ?? 0) / 1e6).toFixed(2)} M€/ano até ${new Date((t.contratoFim ?? dia) * 864e5).getUTCFullYear()})`, t.salario);
  }

  /** Tira o treinador do clube (vai para os livres ou reforma-se). */
  sair(c: number, t: Treinador, dia: number, motivo: MotivoSaida, paraLivres = true) {
    const ult = t.carreira?.at(-1);
    if (ult && ult.clube === c && ult.ate === undefined) { ult.ate = dia; ult.saida = motivo; }
    t.clube = -1;
    if (motivo === 'reforma' || (t.idade ?? 50) >= MT.reforma_fim) { t.estado = 'reformado'; this.reformados++; return; }
    t.estado = 'livre';
    t.salario = 0;
    t.moral = 60;
    if (motivo === 'resultados' || motivo === 'justa_causa') t.reputacao = clamp((t.reputacao ?? 50) - 3, 1, 100);
    if (paraLivres) this.livres.push(t);
  }

  /** Despedimento: indemnização pelo motivo, imagem do clube junto dos treinadores, novo treinador. */
  despedir(c: number, dia: number, motivo: 'resultados' | 'justa_causa' | 'mutuo_acordo', rng: Rng, texto = '') {
    const w = this.w, e = this.e;
    const t = w.motor!.treinadores[c];
    const restante = Math.max(0, ((t.contratoFim ?? dia) - dia) / 365) * (t.salario ?? 0);
    let custo = 0, nota = '';
    if (motivo === 'resultados') { custo = DP.resultados * restante; e.ia.imagem[c] += DP.imagem_por_despedimento; }
    else if (motivo === 'mutuo_acordo') { custo = (DP.mutuo[0] + rng.next() * (DP.mutuo[1] - DP.mutuo[0])) * restante; }
    else {
      const fraca = rng.chance(0.4);
      custo = DP.justa_causa * restante;
      if (fraca) {
        e.ia.imagem[c] += DP.imagem_justa_causa_fraca;
        if (rng.chance(DP.litigio_prob_fraca)) { custo = DP.litigio_custo * restante; nota = ' — justa causa fraca: o treinador ganha o litígio'; }
        else nota = ' — justa causa fraca: o clube ganha o litígio';
      }
    }
    e.ia.imagem[c] = clamp(e.ia.imagem[c], 0, 100);
    if (custo > 0) e.clubes.lancar(c, 'indemnizacoes', custo);
    const nomes = { resultados: 'despedido por resultados', justa_causa: 'despedido por justa causa', mutuo_acordo: 'sai por mútuo acordo' };
    e.registar(dia, c, 'treinador_despedido', `${t.nome} ${nomes[motivo]}${texto ? ` (${texto})` : ''}: indemnização de ${euros(custo)}${nota}`, custo);
    this.sair(c, t, dia, motivo);
    this.procurar(c, dia, rng);
  }

  /** O treinador demite-se (sem indemnização). */
  demissao(c: number, dia: number, rng: Rng, texto: string) {
    const t = this.w.motor!.treinadores[c];
    this.e.registar(dia, c, 'treinador_demite', `${t.nome} demite-se (${texto})`);
    this.sair(c, t, dia, 'demissao');
    this.procurar(c, dia, rng);
  }

  /** Fim de época: idade, reforma dos livres e reposição da reserva. */
  anual(dia: number) {
    const rng = Rng.de(this.w.semente, 'treinadores-ano', dia);
    for (const t of this.livres) t.idade = (t.idade ?? 50) + 1;
    const antes = this.livres.length;
    this.livres = this.livres.filter((t) => {
      const i = t.idade ?? 50;
      if (i < MT.reforma_inicio) return true;
      const p = (i - MT.reforma_inicio + 1) / (MT.reforma_fim - MT.reforma_inicio + 1);
      if (rng.chance(p)) { t.estado = 'reformado'; return false; }
      return true;
    });
    this.reformados += antes - this.livres.length;
    // Os livres esquecidos perdem reputação devagar.
    for (const t of this.livres) t.reputacao = clamp((t.reputacao ?? 50) - 1, 1, 100);
    if (this.livres.length < MT.livres) this.gerarLivres(dia, MT.livres - this.livres.length);
  }
}
