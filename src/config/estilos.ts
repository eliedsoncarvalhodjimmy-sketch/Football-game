// Estilos tácticos (texto do utilizador em data/tacticas/estilos.md). Cada estilo: esquemas (o 1.º é o preferido),
// instruções de equipa que o traduzem no motor, atributos valorizados (ids do motor, com peso) e quem o neutraliza.
// As instruções, os pesos e as magnitudes são propostas minhas, à espera de aprovação (PARAGEM dos estilos).
import type { Instrucoes } from './tacticas.ts';
import type { IdAtributo } from './atributos.ts';

export const ESTILOS_IDS = ['tiki_taka', 'gegenpressen', 'contra_ataque', 'catenaccio', 'jogo_direto', 'pelas_alas', 'futebol_total', 'bloco_medio_baixo'] as const;
export type IdEstilo = (typeof ESTILOS_IDS)[number];

/** Atributo valorizado: ids do motor e o peso; "Jogo aéreo" de campo = cabeceamento + impulsão; "Defesa" = desarme. */
export interface Valorizado { nome: string; atributos: IdAtributo[]; peso: number }

export interface Estilo {
  id: IdEstilo;
  nome: string;
  ideia: string;
  esquemas: [string, string, string];
  instrucoes: Instrucoes;
  valorizados: Valorizado[];
  /** "Polivalência" (Futebol Total): familiaridade média dos titulares noutras posições do mesmo sector. */
  polivalencia?: boolean;
  risco: string;
}

const V = (nome: string, atributos: IdAtributo[], peso = 1): Valorizado => ({ nome, atributos, peso });

export const ESTILOS: Estilo[] = [
  { id: 'tiki_taka', nome: 'Tiki-Taka', ideia: 'Posse absoluta, passes curtos, pressão imediata após perder a bola.', esquemas: ['4-3-3', '4-2-3-1', '3-4-3'],
    instrucoes: { mentalidade: 1, pressao: 1, linha: 1, largura: 0, ritmo: -1 },
    valorizados: [V('Técnica', ['tec']), V('Passe', ['pas']), V('Primeiro toque', ['ptq']), V('Visão de jogo', ['vis']), V('Decisões', ['dec']), V('Resistência', ['res'], 0.7)],
    risco: 'Posse estéril contra quem fecha os espaços.' },
  { id: 'gegenpressen', nome: 'Gegenpressen', ideia: 'Recuperar a bola nos 5–6 segundos após a perder, ainda no meio-campo adversário.', esquemas: ['4-2-3-1', '4-3-3', '4-4-2'],
    instrucoes: { mentalidade: 1, pressao: 1, linha: 1, largura: 0, ritmo: 1 },
    valorizados: [V('Resistência', ['res'], 1.2), V('Determinação', ['det']), V('Trabalho em equipa', ['teq']), V('Velocidade', ['vel']), V('Agressividade', ['agr']), V('Passe', ['pas'], 0.7)],
    risco: 'Pressão quebrada deixa a defesa exposta a bolas longas; cansa muito no fim do jogo.' },
  { id: 'contra_ataque', nome: 'Contra-ataque', ideia: 'Ceder a posse, bloco compacto e transições rápidas com poucos toques.', esquemas: ['4-4-2', '4-2-3-1', '5-3-2'],
    instrucoes: { mentalidade: -1, pressao: 0, linha: -1, largura: 0, ritmo: 1 },
    valorizados: [V('Velocidade', ['vel']), V('Aceleração', ['ace']), V('Passe longo', ['plo']), V('Decisões', ['dec']), V('Concentração', ['con']), V('Resistência', ['res'], 0.7)],
    risco: 'Se sofrer primeiro, tem dificuldade em assumir o jogo.' },
  { id: 'catenaccio', nome: 'Catenaccio', ideia: 'Defesa absoluta: bloco baixo, marcação individual, saída em bolas longas.', esquemas: ['5-3-2', '5-4-1', '4-4-2'],
    instrucoes: { mentalidade: -2, pressao: -1, linha: -1, largura: -1, ritmo: 0 },
    valorizados: [V('Defesa', ['des']), V('Marcação', ['mar']), V('Concentração', ['con']), V('Determinação', ['det']), V('Posicionamento', ['pos']), V('Força', ['for'], 0.8)],
    risco: 'Se sofrer um golo raramente reage; cede muitos cruzamentos.' },
  { id: 'jogo_direto', nome: 'Jogo Direto', ideia: 'Saltar o meio-campo: bola longa para o avançado, segundas bolas.', esquemas: ['4-4-2', '4-2-3-1', '3-5-2'],
    instrucoes: { mentalidade: 0, pressao: 0, linha: 0, largura: 0, ritmo: 1 },
    valorizados: [V('Força', ['for']), V('Jogo aéreo', ['cab', 'imp']), V('Passe longo', ['plo']), V('Determinação', ['det']), V('Resistência', ['res'], 0.7), V('Finalização', ['fin'])],
    risco: 'Perde muita posse; se o avançado não ganhar no ar, o ataque morre.' },
  { id: 'pelas_alas', nome: 'Pelas Alas', ideia: 'Largura: laterais e extremos sobem, 1x1 e cruzamentos.', esquemas: ['4-4-2', '4-3-3', '3-5-2'],
    instrucoes: { mentalidade: 1, pressao: 0, linha: 0, largura: 1, ritmo: 0 },
    valorizados: [V('Velocidade', ['vel']), V('Cruzamento', ['cru'], 1.2), V('Drible', ['dri']), V('Resistência', ['res'], 0.7), V('Posicionamento', ['pos'], 0.8), V('Trabalho em equipa', ['teq'], 0.8)],
    risco: 'Laterais muito subidos expõem os corredores a contra-ataques.' },
  { id: 'futebol_total', nome: 'Futebol Total', ideia: 'Todos atacam, todos defendem; trocas constantes de posição.', esquemas: ['4-3-3', '3-4-3', '4-2-3-1'],
    instrucoes: { mentalidade: 1, pressao: 1, linha: 1, largura: 1, ritmo: 0 },
    valorizados: [V('Visão de jogo', ['vis']), V('Decisões', ['dec']), V('Técnica', ['tec']), V('Passe', ['pas']), V('Resistência', ['res'], 0.8)], polivalencia: true,
    risco: 'Sem visão e decisão, o sistema colapsa em caos.' },
  { id: 'bloco_medio_baixo', nome: 'Bloco Médio-Baixo', ideia: 'Duas linhas de 4 juntas, defesa zonal, saída em 2–3 passes.', esquemas: ['4-4-2', '5-4-1', '4-1-4-1'],
    instrucoes: { mentalidade: -1, pressao: -1, linha: -1, largura: 0, ritmo: 0 },
    valorizados: [V('Posicionamento', ['pos'], 1.2), V('Concentração', ['con']), V('Trabalho em equipa', ['teq']), V('Resistência', ['res'], 0.8), V('Velocidade', ['vel'], 0.7)],
    risco: 'Sofre muitos remates de fora da área.' },
];
export const ESTILO_POR_ID = Object.fromEntries(ESTILOS.map((e) => [e.id, e])) as Record<IdEstilo, Estilo>;

/**
 * Quem neutraliza quem (do campo "Contra" de cada estilo). A relação é **condicional**: só vale se a equipa que neutraliza
 * tiver os atributos que a tornam eficaz (`precisa`, nos sectores indicados) e a outra não os tiver para resistir
 * (`resiste`). Vários pares são mútuos no texto (Tiki-Taka ↔ Gegenpressen, Catenaccio ↔ Jogo Direto, Contra-ataque ↔ Pelas
 * Alas, Tiki-Taka ↔ Contra-ataque): quem ganha decide-se por esse duelo de atributos.
 */
export type Sector = 'def' | 'med' | 'ata' | 'equipa';
export interface Neutraliza {
  alvo: IdEstilo;
  por: IdEstilo | 'bolas_paradas';
  como: string;
  precisa: { sector: Sector; atributos: IdAtributo[] }[];
  resiste: { sector: Sector; atributos: IdAtributo[] }[];
}

const N = (alvo: IdEstilo, por: Neutraliza['por'], como: string, precisa: Neutraliza['precisa'], resiste: Neutraliza['resiste']): Neutraliza => ({ alvo, por, como, precisa, resiste });

export const NEUTRALIZACOES: Neutraliza[] = [
  N('tiki_taka', 'gegenpressen', 'Pressão alta organizada', [{ sector: 'equipa', atributos: ['res', 'teq', 'agr', 'vel'] }], [{ sector: 'med', atributos: ['tec', 'ptq', 'cmp', 'pas'] }]),
  N('tiki_taka', 'contra_ataque', 'Contra-ataques rápidos pelos lados', [{ sector: 'ata', atributos: ['vel', 'ace'] }], [{ sector: 'def', atributos: ['vel', 'pos'] }]),
  N('tiki_taka', 'bloco_medio_baixo', 'Fecha o meio-campo: obriga a circular para os lados', [{ sector: 'med', atributos: ['pos', 'con', 'teq'] }], [{ sector: 'med', atributos: ['vis', 'rld'] }]),
  N('tiki_taka', 'catenaccio', 'Fecha o meio-campo: obriga a circular para os lados', [{ sector: 'def', atributos: ['pos', 'mar', 'con'] }], [{ sector: 'med', atributos: ['vis', 'rld'] }]),
  N('gegenpressen', 'jogo_direto', 'Bolas longas por cima da pressão para pontas rápidos', [{ sector: 'def', atributos: ['plo'] }, { sector: 'ata', atributos: ['vel', 'for'] }], [{ sector: 'def', atributos: ['vel', 'cab'] }]),
  N('gegenpressen', 'tiki_taka', 'Boa posse que sai da pressão', [{ sector: 'med', atributos: ['tec', 'ptq', 'cmp', 'pas'] }], [{ sector: 'equipa', atributos: ['res', 'teq', 'agr'] }]),
  N('gegenpressen', 'bloco_medio_baixo', 'Bloco baixo compacto sem espaços para pressionar', [{ sector: 'equipa', atributos: ['pos', 'con'] }], [{ sector: 'med', atributos: ['vis', 'dec'] }]),
  N('gegenpressen', 'catenaccio', 'Bloco baixo compacto sem espaços para pressionar', [{ sector: 'def', atributos: ['pos', 'con', 'mar'] }], [{ sector: 'med', atributos: ['vis', 'dec'] }]),
  N('contra_ataque', 'tiki_taka', 'Posse que não se expõe (não deixa transições)', [{ sector: 'med', atributos: ['pas', 'dec', 'cmp'] }], [{ sector: 'ata', atributos: ['vel', 'ace', 'fin'] }]),
  N('contra_ataque', 'pelas_alas', 'Laterais muito subidos (ver nota: o texto também diz o contrário)', [{ sector: 'def', atributos: ['vel', 'res'] }], [{ sector: 'ata', atributos: ['vel', 'ace'] }]),
  N('contra_ataque', 'catenaccio', 'Defende primeiro e não se expõe', [{ sector: 'def', atributos: ['pos', 'con'] }], [{ sector: 'ata', atributos: ['dri', 'fin'] }]),
  N('contra_ataque', 'bloco_medio_baixo', 'Defende primeiro e não se expõe', [{ sector: 'equipa', atributos: ['pos', 'con'] }], [{ sector: 'ata', atributos: ['dri', 'fin'] }]),
  N('catenaccio', 'tiki_taka', 'Paciência e remate de fora da área', [{ sector: 'med', atributos: ['rld', 'cmp'] }], [{ sector: 'def', atributos: ['des', 'pos'] }]),
  N('catenaccio', 'bolas_paradas', 'Bolas paradas', [{ sector: 'equipa', atributos: ['bpa', 'cab'] }], [{ sector: 'def', atributos: ['cab', 'mar'] }]),
  N('catenaccio', 'jogo_direto', 'Avançado forte no ar (o Catenaccio cede muitos cruzamentos)', [{ sector: 'ata', atributos: ['cab', 'imp', 'for'] }], [{ sector: 'def', atributos: ['cab', 'imp', 'for'] }]),
  N('jogo_direto', 'catenaccio', 'Centrais altos e bons no jogo aéreo', [{ sector: 'def', atributos: ['cab', 'imp', 'for'] }], [{ sector: 'ata', atributos: ['cab', 'imp', 'for'] }]),
  N('jogo_direto', 'gegenpressen', 'Pressão alta que corta as bolas longas', [{ sector: 'equipa', atributos: ['agr', 'teq', 'res'] }], [{ sector: 'def', atributos: ['plo', 'cmp'] }]),
  N('pelas_alas', 'catenaccio', 'Bloco baixo com centrais bons no ar', [{ sector: 'def', atributos: ['cab', 'imp'] }], [{ sector: 'ata', atributos: ['cab', 'fin'] }]),
  N('pelas_alas', 'bloco_medio_baixo', 'Bloco baixo com centrais bons no ar', [{ sector: 'def', atributos: ['cab', 'imp'] }], [{ sector: 'ata', atributos: ['cab', 'fin'] }]),
  N('pelas_alas', 'contra_ataque', 'Contra-ataques pelos corredores deixados', [{ sector: 'ata', atributos: ['vel', 'ace'] }], [{ sector: 'def', atributos: ['vel', 'pos'] }]),
  N('futebol_total', 'catenaccio', 'Organização que não segue as trocas de posição', [{ sector: 'def', atributos: ['pos', 'con'] }], [{ sector: 'equipa', atributos: ['vis', 'dec'] }]),
  N('futebol_total', 'bloco_medio_baixo', 'Organização que não segue as trocas de posição', [{ sector: 'equipa', atributos: ['pos', 'con'] }], [{ sector: 'equipa', atributos: ['vis', 'dec'] }]),
  N('futebol_total', 'gegenpressen', 'Pressão coordenada nos espaços das trocas', [{ sector: 'equipa', atributos: ['res', 'teq', 'agr'] }], [{ sector: 'equipa', atributos: ['dec', 'cmp'] }]),
  N('bloco_medio_baixo', 'tiki_taka', 'Paciência e remate de fora da área', [{ sector: 'med', atributos: ['rld', 'pas'] }], [{ sector: 'med', atributos: ['pos', 'des'] }]),
  N('bloco_medio_baixo', 'jogo_direto', 'Avançado forte no ar', [{ sector: 'ata', atributos: ['cab', 'imp', 'for'] }], [{ sector: 'def', atributos: ['cab', 'imp'] }]),
  N('bloco_medio_baixo', 'pelas_alas', 'Cruzamentos para bons finalizadores', [{ sector: 'ata', atributos: ['cru', 'fin', 'cab'] }], [{ sector: 'def', atributos: ['cab', 'mar'] }]),
];

/** Efeito (proposta): a equipa neutralizada perde até x nos ratings do seu ponto forte, conforme o duelo de atributos. */
export const EFEITO_ESTILOS = {
  /** Perda máxima (fracção) nos ratings afectados quando o duelo é totalmente favorável a quem neutraliza. */
  neutralizacao_max: 0.07,
  /** Diferença média de atributos (pontos 1–20) a partir da qual a neutralização é total; em 0 vale metade. */
  duelo_saturacao: 4,
  /** Bónus/penalização de adequação do plantel ao estilo: ±x conforme a média dos atributos valorizados face à média do plantel. */
  adequacao_max: 0.05,
};
