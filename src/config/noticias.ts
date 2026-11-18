// Imprensa simplificada (pedido do utilizador): um feed de notícias geradas pelos acontecimentos, filtrado por relevância,
// com ligações ("Ver mais") e, nalguns casos, consequências reais. Substitui opinião, relação com os meios e "Reagir".
// As conferências de imprensa (guiões em data/imprensa/guioes.md) mantêm-se, a partir do feed.

export type Peso = 'alto' | 'medio' | 'baixo';
export type Seccao = 'destaques' | 'liga' | 'outras_ligas' | 'mercado';
export type Ligacao = 'classificacao' | 'jogador' | 'transferencias' | 'clube' | 'mensagem';

export interface TipoNoticia { id: string; seccao: Seccao; peso: Peso; gatilho: string; ligacao: Ligacao; consequencia?: string; exemplo: string }

/** 1. Notícias que reagem ao utilizador; 2. notícias que criam curiosidade sobre o mundo. */
export const TIPOS_NOTICIA: TipoNoticia[] = [
  { id: 'resultado', seccao: 'destaques', peso: 'alto', gatilho: 'fim de jogo do clube', ligacao: 'classificacao', exemplo: 'Vitória convincente do {clube} por 3-0' },
  { id: 'crise', seccao: 'destaques', peso: 'alto', gatilho: '3+ derrotas seguidas', ligacao: 'clube', consequencia: 'treinador sob pressão: mais uma derrota e o conselho pode despedi-lo', exemplo: 'Pressão aumenta sobre o treinador após 3 derrotas seguidas' },
  { id: 'elogio_jovem', seccao: 'destaques', peso: 'alto', gatilho: 'jogador ≤ 21 anos com nota ≥ 7,5', ligacao: 'jogador', exemplo: 'Jovem da academia rouba a atenção com exibição de gala' },
  { id: 'proposta', seccao: 'destaques', peso: 'alto', gatilho: 'proposta recebida por um jogador do clube', ligacao: 'mensagem', consequencia: 'a proposta aparece nas mensagens', exemplo: '{clube_x} negoceia a contratação de {jogador}' },
  { id: 'lesao', seccao: 'destaques', peso: 'alto', gatilho: 'lesão de 14+ dias de um jogador do clube', ligacao: 'jogador', exemplo: 'Preocupação: {jogador} sai lesionado' },
  { id: 'classificacao', seccao: 'liga', peso: 'alto', gatilho: 'mudança de posição do clube na jornada', ligacao: 'classificacao', exemplo: '{clube} sobe ao 3.º lugar após a jornada' },
  { id: 'insatisfeito', seccao: 'destaques', peso: 'alto', gatilho: 'jogador do clube com moral ≤ 6 ou poucos minutos', ligacao: 'jogador', consequencia: 'a moral do jogador desce mais se a notícia não tiver resposta', exemplo: '{jogador} está insatisfeito com os minutos' },
  { id: 'liga_topo_fundo', seccao: 'liga', peso: 'medio', gatilho: 'jornada da liga do utilizador: líder perde, surpresa no topo, lanterna', ligacao: 'classificacao', exemplo: 'Líder tropeça e a liga aperta' },
  { id: 'outras_ligas', seccao: 'outras_ligas', peso: 'medio', gatilho: 'a cada jornada: 1–2 notícias de ligas estrangeiras (topo e fundo da tabela)', ligacao: 'classificacao', exemplo: 'Surpresa na Premier League: {equipa_pequena} no top 4' },
  { id: 'rumor', seccao: 'mercado', peso: 'medio', gatilho: 'janelas de transferências + rumores aleatórios durante a época', ligacao: 'jogador', exemplo: '{clube_x} prepara proposta de {valor} por {jogador}' },
  { id: 'transferencia', seccao: 'mercado', peso: 'medio', gatilho: 'transferência concluída acima de um valor no mundo', ligacao: 'jogador', exemplo: 'Jovem promessa do Brasil a caminho da Europa' },
  { id: 'recorde', seccao: 'mercado', peso: 'baixo', gatilho: 'marco: golos no clube, jogos, vitórias do treinador, títulos', ligacao: 'jogador', exemplo: '{jogador} torna-se o melhor marcador histórico do clube' },
  { id: 'bastidores', seccao: 'mercado', peso: 'baixo', gatilho: 'evento aleatório por época: demissão, crise financeira', ligacao: 'transferencias', consequencia: 'clube em crise põe jogadores à venda abaixo do valor', exemplo: '{clube_x} em crise financeira: jogadores à venda' },
];

/** Bloco ("jornada de notícias") gerado a cada avanço com jogos ou a cada segunda-feira: 5–8 notícias. */
export const BLOCO_NOTICIAS = {
  minimo: 5,
  maximo: 8,
  /** Quotas por secção (o peso alto entra sempre; médio e baixo preenchem o resto até ao máximo). */
  quotas: { destaques: 2, liga: 2, outras_ligas: 2, mercado: [1, 2] as [number, number] },
  /** Probabilidade de uma notícia de peso baixo entrar num bloco com espaço. */
  prob_baixo: 0.35,
  /** Só notícias do clube, da liga do utilizador, das ligas que segue, ou de jogadores do clube/da shortlist; o resto vai para o feed geral. */
  filtro_relevancia: ['clube', 'liga', 'ligas_seguidas', 'jogadores_clube', 'shortlist'],
  /** Blocos guardados no feed (os antigos são podados). */
  guardar: 12,
};
