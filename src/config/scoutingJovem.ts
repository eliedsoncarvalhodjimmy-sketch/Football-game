// Scouting de jovens (plano juvenil, bloco 3): países elegíveis (mapa do utilizador + Angola, Senegal, Camarões e Costa do
// Marfim; sem Guatemala, Honduras e El Salvador; sem ilhas pequenas), perfil típico de cada país (tendência, não regra),
// região do rosto, custos e missões do olheiro de jovens.

/** Zona de custo de um país (para um clube europeu). */
export type ZonaCusto = 'europa' | 'africa' | 'america' | 'medio' | 'asia';
/** Região do rosto (tom de pele, cabelo, traços) usada pela interface para gerar a cara. */
export type RegiaoRosto = 'europa_sul' | 'europa_norte' | 'africa' | 'lusofonia_africa' | 'america_sul' | 'america_central' | 'norte_africa' | 'asia_leste' | 'asia_sul' | 'mundo';

/** Qualidades típicas e os atributos que puxam (ids de src/config/atributos.ts). */
export const QUALIDADES: Record<string, string[]> = {
  'Técnica': ['tec', 'ptq'], Drible: ['dri', 'agi'], Criatividade: ['vis', 'dri'], Passe: ['pas', 'plo'], 'Visão': ['vis', 'dec'],
  'Determinação': ['det', 'ctr'], Agressividade: ['agr', 'des'], 'Marcação': ['mar', 'des'], Velocidade: ['vel', 'ace'], 'Força': ['for', 'equ'],
  'Resistência': ['res', 'ctr'], Cabeceamento: ['cab', 'imp'], Trabalho: ['ctr', 'teq'], Agilidade: ['agi', 'equ'], Posicionamento: ['pos', 'ant'],
  'Decisões': ['dec', 'cmp'], Intensidade: ['ctr', 'agr'], Altura: ['imp', 'cab'], 'Remate de longe': ['rld', 'tec'], Remate: ['fin', 'rld'],
  Disciplina: ['pos', 'teq'], 'Explosão': ['ace', 'imp'],
};

/** Perfis (3 qualidades típicas). */
export const PERFIS_PAIS: Record<string, [string, string, string]> = {
  pt: ['Técnica', 'Drible', 'Passe'], br: ['Técnica', 'Drible', 'Criatividade'], ar: ['Técnica', 'Determinação', 'Drible'], uy: ['Agressividade', 'Determinação', 'Marcação'],
  co: ['Drible', 'Velocidade', 'Técnica'], ec: ['Velocidade', 'Força', 'Resistência'], py: ['Cabeceamento', 'Marcação', 'Agressividade'], cl: ['Resistência', 'Trabalho', 'Agressividade'],
  ve: ['Velocidade', 'Força', 'Drible'], mx: ['Técnica', 'Agilidade', 'Passe'], am: ['Força', 'Resistência', 'Velocidade'],
  es: ['Passe', 'Visão', 'Técnica'], it: ['Posicionamento', 'Marcação', 'Decisões'], fr: ['Força', 'Velocidade', 'Técnica'], en: ['Força', 'Cabeceamento', 'Intensidade'],
  ie: ['Cabeceamento', 'Agressividade', 'Determinação'], de: ['Decisões', 'Passe', 'Resistência'], nl: ['Técnica', 'Visão', 'Passe'], no: ['Força', 'Cabeceamento', 'Trabalho'],
  bk: ['Técnica', 'Remate de longe', 'Altura'], le: ['Força', 'Resistência', 'Disciplina'], gr: ['Marcação', 'Determinação', 'Posicionamento'], tr: ['Agressividade', 'Técnica', 'Remate'],
  na: ['Drible', 'Técnica', 'Agilidade'], wa: ['Força', 'Velocidade', 'Explosão'], ao: ['Velocidade', 'Drible', 'Agilidade'], za: ['Velocidade', 'Agilidade', 'Técnica'],
  mo: ['Técnica', 'Velocidade', 'Agilidade'], jp: ['Técnica', 'Trabalho', 'Disciplina'], kr: ['Resistência', 'Trabalho', 'Velocidade'], cn: ['Disciplina', 'Força', 'Resistência'],
  in: ['Agilidade', 'Resistência', 'Trabalho'], oc: ['Força', 'Resistência', 'Determinação'],
};

export interface PaisScout { nome: string; zona: ZonaCusto; perfil: string; rosto: RegiaoRosto }
const p = (nome: string, zona: ZonaCusto, perfil: string, rosto: RegiaoRosto): PaisScout => ({ nome, zona, perfil, rosto });

/** Países elegíveis para o olheiro de jovens (70). A Escócia entra pelo Reino Unido do mapa. */
export const PAISES_SCOUT: Record<string, PaisScout> = {
  POR: p('Portugal', 'europa', 'pt', 'europa_sul'), ESP: p('Espanha', 'europa', 'es', 'europa_sul'), FRA: p('França', 'europa', 'fr', 'mundo'), ITA: p('Itália', 'europa', 'it', 'europa_sul'),
  ENG: p('Inglaterra', 'europa', 'en', 'europa_norte'), SCO: p('Escócia', 'europa', 'en', 'europa_norte'), IRL: p('Irlanda', 'europa', 'ie', 'europa_norte'),
  GER: p('Alemanha', 'europa', 'de', 'europa_norte'), AUT: p('Áustria', 'europa', 'de', 'europa_norte'), SUI: p('Suíça', 'europa', 'de', 'europa_norte'),
  NED: p('Países Baixos', 'europa', 'nl', 'europa_norte'), BEL: p('Bélgica', 'europa', 'nl', 'europa_norte'), LUX: p('Luxemburgo', 'europa', 'de', 'europa_norte'),
  DEN: p('Dinamarca', 'europa', 'no', 'europa_norte'), NOR: p('Noruega', 'europa', 'no', 'europa_norte'), SWE: p('Suécia', 'europa', 'no', 'europa_norte'),
  FIN: p('Finlândia', 'europa', 'no', 'europa_norte'), ISL: p('Islândia', 'europa', 'no', 'europa_norte'),
  CRO: p('Croácia', 'europa', 'bk', 'europa_norte'), SRB: p('Sérvia', 'europa', 'bk', 'europa_norte'), BIH: p('Bósnia e Herzegovina', 'europa', 'bk', 'europa_norte'),
  MNE: p('Montenegro', 'europa', 'bk', 'europa_norte'), MKD: p('Macedónia do Norte', 'europa', 'bk', 'europa_norte'), ALB: p('Albânia', 'europa', 'bk', 'europa_sul'),
  KOS: p('Kosovo', 'europa', 'bk', 'europa_sul'), SVN: p('Eslovénia', 'europa', 'bk', 'europa_norte'),
  POL: p('Polónia', 'europa', 'le', 'europa_norte'), CZE: p('Chéquia', 'europa', 'le', 'europa_norte'), SVK: p('Eslováquia', 'europa', 'le', 'europa_norte'),
  HUN: p('Hungria', 'europa', 'le', 'europa_norte'), ROU: p('Roménia', 'europa', 'le', 'europa_sul'), BUL: p('Bulgária', 'europa', 'le', 'europa_sul'),
  UKR: p('Ucrânia', 'europa', 'le', 'europa_norte'), RUS: p('Rússia', 'europa', 'le', 'europa_norte'), MDA: p('Moldávia', 'europa', 'le', 'europa_sul'),
  LTU: p('Lituânia', 'europa', 'le', 'europa_norte'), LVA: p('Letónia', 'europa', 'le', 'europa_norte'), EST: p('Estónia', 'europa', 'le', 'europa_norte'),
  GRE: p('Grécia', 'europa', 'gr', 'europa_sul'), TUR: p('Turquia', 'europa', 'tr', 'norte_africa'),
  BRA: p('Brasil', 'america', 'br', 'america_sul'), ARG: p('Argentina', 'america', 'ar', 'europa_sul'), URU: p('Uruguai', 'america', 'uy', 'europa_sul'),
  COL: p('Colômbia', 'america', 'co', 'america_sul'), ECU: p('Equador', 'america', 'ec', 'america_sul'), PAR: p('Paraguai', 'america', 'py', 'america_central'),
  CHI: p('Chile', 'america', 'cl', 'america_central'), PER: p('Peru', 'america', 'ec', 'america_central'), BOL: p('Bolívia', 'america', 'ec', 'america_central'),
  VEN: p('Venezuela', 'america', 've', 'america_sul'), MEX: p('México', 'america', 'mx', 'america_central'),
  USA: p('Estados Unidos', 'america', 'am', 'mundo'), CAN: p('Canadá', 'america', 'am', 'mundo'),
  MAR: p('Marrocos', 'africa', 'na', 'norte_africa'), ALG: p('Argélia', 'africa', 'na', 'norte_africa'), TUN: p('Tunísia', 'africa', 'na', 'norte_africa'),
  EGY: p('Egipto', 'africa', 'na', 'norte_africa'), SEN: p('Senegal', 'africa', 'wa', 'africa'), CIV: p('Costa do Marfim', 'africa', 'wa', 'africa'),
  GHA: p('Gana', 'africa', 'wa', 'africa'), NGA: p('Nigéria', 'africa', 'wa', 'africa'), CMR: p('Camarões', 'africa', 'wa', 'africa'),
  ANG: p('Angola', 'africa', 'ao', 'lusofonia_africa'), RSA: p('África do Sul', 'africa', 'za', 'africa'),
  KSA: p('Arábia Saudita', 'medio', 'mo', 'norte_africa'), ISR: p('Israel', 'medio', 'mo', 'europa_sul'),
  JPN: p('Japão', 'asia', 'jp', 'asia_leste'), KOR: p('Coreia do Sul', 'asia', 'kr', 'asia_leste'), CHN: p('China', 'asia', 'cn', 'asia_leste'),
  IND: p('Índia', 'asia', 'in', 'asia_sul'), AUS: p('Austrália', 'asia', 'oc', 'europa_norte'), NZL: p('Nova Zelândia', 'asia', 'oc', 'europa_norte'),
};

/** Custo por semana (€) de uma missão, para um clube europeu: África e Américas mais baratas; Ásia e Oceânia as mais caras.
 *  Para um clube de outro continente, o próprio continente toma o preço de África e a Europa o das Américas. */
export const CUSTO_SEMANA = { proprio_pais: 1500, africa: 2000, america: 2500, europa: 3000, medio: 3500, asia: 4500, proprio_continente: 2000 } as const;

export const MISSOES = {
  duracoes: [2, 4, 8, 12] as const,
  posicoes: ['Todas', 'Guarda-redes', 'Defesas', 'Médios', 'Avançados'] as const,
  /** Nomes no relatório: 2 + (quantidade − 6) × a + semanas × b ± ruído, entre 2 e 10. */
  nomes_base: 2, nomes_por_quantidade: 0.4, nomes_por_semana: 0.45, nomes_ruido: 1, nomes_min: 2, nomes_max: 10,
  /** Meia-largura dos intervalos de OVR e PT: base − avaliação / divisor (mínimo); fora da região do olheiro, × (1 + (10 − adaptabilidade) × x). */
  largura_base: 10, largura_divisor: 3, largura_min: 2, fora_regiao_por_ponto: 0.04,
  /** Idades procuradas. */
  idade: [15, 18] as [number, number],
  /** Fracção dos nomes que são jovens das academias do jogo (se o país tiver clubes); os outros são de clubes locais fora do jogo. */
  fraccao_academias: 0.6,
  /** O olheiro procura talento: o melhor de n sorteios. */
  sorteios: 2,
  /** Dias para contratar um nome de fora do jogo; depois o rasto perde-se. */
  validade_dias: 120,
};

/** Perfil por país na geração dos jovens: probabilidade de seguir o perfil e pontos a somar por atributo da qualidade. */
export const EFEITO_PERFIL = { prob: 0.6, pontos: [1, 3] as [number, number], qualidades: [1, 2] as [number, number] };
