// Perfis de jogo (pedido do utilizador): o utilizador entra (3 contas locais), cria o perfil, escolhe o modo e o perfil de
// partida, põe uma foto (opcional) e escolhe o clube. Os textos são do utilizador; os EFEITOS são propostas minhas (a aprovar).

/** Contas locais (no máximo 3). Só separam os perfis e as gravações num aparelho partilhado: não é segurança a sério.
 *  As palavras-passe não ficam no código: guarda-se o SHA-256 de "futceo:<utilizador em minúsculas>:<palavra-passe>". */
export const CONTAS = [
  { utilizador: 'Aleixo', hash: '46b1490527dfcfb055f62fbd58ae69aac70799a857ee6972f4eabc4c3d47974c' },
  { utilizador: 'Eliedson', hash: '7a41d829936bf79d5a0e2be79be387624dc5579fe70d3f116996ace71e0b7c41' },
  { utilizador: 'User3', hash: 'cb8bc458c4bb9e803fa0927523cb96506b98d2df6df6aaa8463621529b7c270d' },
];

export interface PerfilPartida {
  id: string;
  texto: string;
  /** Fortuna pessoal inicial (€), modo Dono. */
  fortuna?: number;
  /** Efeitos propostos (multiplicadores ou bónus), a aprovar pelo utilizador. */
  efeitos: Record<string, number>;
  resumo: string;
}

export const PERFIS_DONO: PerfilPartida[] = [
  { id: 'dono-tecnologia', fortuna: 500e6, texto: 'Empresário do ramo de tecnologia que acaba de vender a sua empresa de análise de dados para a WS Holding S.A por 500 Milhões de Euros.',
    efeitos: { conhecimento_scouting: 1.1, custo_departamento_analise: 0.85 }, resumo: 'Análise de dados: scouting conhece +10% mais depressa; departamento de análise −15% de custo.' },
  { id: 'dono-agro-construcao', fortuna: 1.2e9, texto: 'Empresário com negócios ligados à agricultura, construção civil e rede de super-mercados, com património avaliado em + 1 bilhão',
    efeitos: { custo_obras: 0.85, prazo_obras: 0.85, patrocinio_local: 1.1 }, resumo: 'Construção civil: obras −15% no custo e no prazo; rede de supermercados: +10% nos patrocínios locais.' },
  { id: 'dono-banca', fortuna: 1.1e9, texto: 'Bancário bem sucessido, com várias agências espalhadas pelos EUA com património de +1B.',
    efeitos: { juro_divida_pp: -1.5, limite_endividamento: 1.15 }, resumo: 'Banca: juros da dívida −1,5 pontos; limite de endividamento +15%.' },
  { id: 'dono-ia', fortuna: 850e6, texto: 'Empresário que acaba de vender a sua Startup de IA para um fundo de investimentos por 850 milhões.',
    efeitos: { precisao_relatorios: 1.1, receitas_digitais: 1.1 }, resumo: 'IA: relatórios de scouting com intervalos 10% mais estreitos; +10% nas receitas digitais e de marketing.' },
];

export const PERFIS_DIRECTOR: PerfilPartida[] = [
  { id: 'dir-harvard', texto: 'Formado em adminstração e negócios em Harvard.',
    efeitos: { negociacao: 1.05, confianca_inicial_dono: 5 }, resumo: 'Negociação: os clubes e agentes cedem um pouco mais (5%); confiança inicial do dono +5.' },
  { id: 'dir-gestao-dados', texto: 'Formado em Gestão desportiva e análise de dados.',
    efeitos: { conhecimento_scouting: 1.08, previsao_financas: 1 }, resumo: 'Dados: scouting conhece +8% mais depressa; previsões financeiras mais exactas.' },
  { id: 'dir-ex-scout', texto: 'Antigo chefe de Scout.',
    efeitos: { precisao_relatorios: 1.15, prospectos_vistos: 1.2, reputacao_inicial: -5 }, resumo: 'Olho para talento: relatórios 15% mais precisos e +20% de prospectos vistos; começa com menos reputação (−5).' },
];

/** Idade mínima do perfil (anos). */
export const IDADE_MINIMA_PERFIL = 18;
/** Foto de perfil: redimensionada para x píxeis de lado. */
export const FOTO_PERFIL = { lado: 256 };
