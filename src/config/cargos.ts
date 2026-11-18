// Cargos do staff (texto do utilizador em data/staff/cargos.md): departamentos, cargos e atributos (1–20) de cada um.
// Substituirá o "nível" único de src/config/staff.ts quando for aprovado (PARAGEM dos cargos). Os efeitos são propostas.
import type { IdEstilo } from './estilos.ts';

export const ATRIBUTOS_STAFF = {
  estilo: 'Estilo táctico / esquema preferido', // categórico: um dos 8 estilos + um dos seus esquemas
  conhecimento_tactico: 'Conhecimento táctico',
  trabalho_jovens: 'Trabalho com jovens',
  gestao_pessoas: 'Gestão de pessoas',
  motivacao: 'Motivação',
  flexibilidade: 'Flexibilidade e adaptabilidade táctica',
  treino: 'Treino',
  treino_area: 'Treino (área: Ataque / Defesa / Posse / Táctica)',
  bolas_paradas: 'Bolas paradas',
  treino_gr: 'Treino de guarda-redes',
  condicao_fisica: 'Condição física',
  prevencao_lesoes: 'Prevenção de lesões',
  fisioterapia: 'Fisioterapia',
  recuperacao_lesoes: 'Recuperação de lesões',
  avaliacao_potencial: 'Avaliação de potencial',
  avaliacao_habilidade: 'Avaliação de habilidade',
  avaliacao: 'Avaliação (habilidade e potencial): qualidade',
  scout_quantidade: 'Scout: quantidade',
  adaptabilidade: 'Adaptabilidade',
  determinacao: 'Determinação',
  disciplina: 'Disciplina',
  gestao_financeira: 'Gestão financeira',
  negociacao: 'Negociação',
  marketing: 'Marketing',
} as const;
export type AtributoStaff = keyof typeof ATRIBUTOS_STAFF;

export type Departamento = 'academia' | 'recrutamento' | 'tecnica' | 'financeiro' | 'comercial';
export const NOME_DEPARTAMENTO: Record<Departamento, string> = {
  academia: 'Departamento de Academia', recrutamento: 'Departamento de Recrutamento', tecnica: 'Equipa Técnica Principal', financeiro: 'Diretor Financeiro', comercial: 'Diretor Comercial',
};

const TREINADOR: AtributoStaff[] = ['estilo', 'conhecimento_tactico', 'trabalho_jovens', 'gestao_pessoas', 'motivacao', 'flexibilidade', 'treino'];
const OLHEIRO: AtributoStaff[] = ['avaliacao', 'scout_quantidade', 'adaptabilidade', 'determinacao'];

export interface CargoDef { id: string; num: number; nome: string; departamento: Departamento; atributos: AtributoStaff[]; quantos: [number, number] }
export const CARGOS_STAFF: CargoDef[] = [
  { id: 'chefe_juvenil', num: 1, nome: 'Chefe de Desenvolvimento Juvenil', departamento: 'academia', atributos: ['avaliacao_potencial', 'avaliacao_habilidade', 'trabalho_jovens', 'determinacao', 'disciplina', 'motivacao'], quantos: [1, 1] },
  { id: 'treinador_sub21', num: 2, nome: 'Treinador Sub-21', departamento: 'academia', atributos: TREINADOR, quantos: [1, 1] },
  { id: 'treinador_sub18', num: 3, nome: 'Treinador Sub-18', departamento: 'academia', atributos: TREINADOR, quantos: [1, 1] },
  { id: 'chefe_recrutamento', num: 5, nome: 'Chefe de Recrutamento', departamento: 'recrutamento', atributos: OLHEIRO, quantos: [1, 1] },
  { id: 'olheiro', num: 6, nome: 'Olheiro', departamento: 'recrutamento', atributos: OLHEIRO, quantos: [1, 6] },
  { id: 'olheiro_jovens', num: 7, nome: 'Olheiro de Jovens', departamento: 'recrutamento', atributos: OLHEIRO, quantos: [0, 3] },
  { id: 'treinador_principal', num: 9, nome: 'Treinador Principal', departamento: 'tecnica', atributos: TREINADOR, quantos: [1, 1] },
  { id: 'treinador_assistente', num: 10, nome: 'Treinador Assistente', departamento: 'tecnica', atributos: TREINADOR, quantos: [1, 2] },
  { id: 'coach', num: 11, nome: 'Coach (Treinador de Campo)', departamento: 'tecnica', atributos: ['treino_area', 'bolas_paradas', 'determinacao', 'disciplina', 'motivacao'], quantos: [0, 4] },
  { id: 'treinador_gr', num: 12, nome: 'Treinador de Guarda-redes', departamento: 'tecnica', atributos: ['treino_gr', 'determinacao', 'disciplina', 'motivacao'], quantos: [1, 1] },
  { id: 'preparador_fisico', num: 13, nome: 'Preparador Físico', departamento: 'tecnica', atributos: ['condicao_fisica', 'prevencao_lesoes', 'disciplina', 'motivacao'], quantos: [1, 2] },
  { id: 'fisioterapeuta', num: 14, nome: 'Fisioterapeuta / Médico', departamento: 'tecnica', atributos: ['fisioterapia', 'recuperacao_lesoes', 'prevencao_lesoes', 'gestao_pessoas'], quantos: [1, 2] },
  { id: 'diretor_financeiro', num: 15, nome: 'Diretor Financeiro', departamento: 'financeiro', atributos: ['gestao_financeira', 'negociacao', 'gestao_pessoas'], quantos: [1, 1] },
  { id: 'diretor_comercial', num: 16, nome: 'Diretor Comercial', departamento: 'comercial', atributos: ['negociacao', 'marketing', 'gestao_pessoas'], quantos: [1, 1] },
];
export const CARGO_POR_ID = Object.fromEntries(CARGOS_STAFF.map((c) => [c.id, c])) as Record<string, CargoDef>;

/** Áreas do Coach. */
export const AREAS_COACH = ['ataque', 'defesa', 'posse', 'tactica'] as const;

/** Estilo de um treinador: estilo + esquema preferido (um dos 3 do estilo). */
export interface EstiloTreinador { estilo: IdEstilo; esquema: string }

/**
 * Efeitos propostos (fracção por ponto acima/abaixo de 10, salvo indicação; limites em EFEITOS_STAFF.limite).
 * Ligam cada atributo ao sistema do motor que já existe.
 */
export const EFEITOS_CARGOS: Record<string, Partial<Record<AtributoStaff, string>>> = {
  treinador_principal: {
    conhecimento_tactico: 'parcela "táctica" dos modificadores de jogo (já existe: atributo tactica)',
    motivacao: 'moral antes dos jogos e reacção após derrotas (já existe: motivacao)',
    gestao_pessoas: 'regresso da moral e conflitos no balneário (já existe: gestao)',
    flexibilidade: 'muda de plano quando o plantel não serve o estilo (já existe: adaptabilidade)',
    treino: 'evolução dos seniores (já existe: desenvolvimento)',
    trabalho_jovens: 'minutos e evolução dos jogadores ≤ 21 anos na equipa principal',
    estilo: 'estilo e esquema que usa por omissão',
  },
  treinador_assistente: { conhecimento_tactico: 'atenua as fraquezas do principal (adjunto)', treino: 'soma à evolução', estilo: 'treinador interino natural' },
  coach: { treino_area: '+ evolução dos atributos da área escolhida', bolas_paradas: '+ golos de bola parada a favor e − contra' },
  treinador_gr: { treino_gr: '+ evolução dos guarda-redes (já existe)' },
  preparador_fisico: { condicao_fisica: 'recuperação de condição entre jogos e cansaço no fim dos jogos', prevencao_lesoes: '− taxa de lesões (já existe)' },
  fisioterapeuta: { fisioterapia: '− dias de lesão (já existe)', recuperacao_lesoes: '− risco de recaída', prevencao_lesoes: '− taxa de lesões' },
  chefe_juvenil: { avaliacao_potencial: 'precisão do potencial dos prospectos', trabalho_jovens: 'evolução dos juniores (já existe: coordenador)', avaliacao_habilidade: 'precisão do OVR dos juniores' },
  treinador_sub21: { treino: 'evolução do sub-21', trabalho_jovens: 'evolução do sub-21', estilo: 'os juniores chegam já adaptados a este estilo' },
  treinador_sub18: { treino: 'evolução do sub-18', trabalho_jovens: 'evolução do sub-18' },
  chefe_recrutamento: { avaliacao: 'precisão dos relatórios (intervalos mais estreitos)', scout_quantidade: 'jogadores observados por semana', adaptabilidade: 'menos perda de qualidade fora da região de origem' },
  olheiro: { avaliacao: 'precisão', scout_quantidade: 'quantidade', adaptabilidade: 'regiões estrangeiras' },
  olheiro_jovens: { avaliacao: 'precisão em jovens', scout_quantidade: 'quantidade de prospectos' },
  diretor_financeiro: { gestao_financeira: 'juros, custos e previsões', negociacao: 'vendas e compras de jogadores (o clube cede menos)' },
  diretor_comercial: { negociacao: 'valor dos patrocínios', marketing: 'merchandising, bilheteira e base de adeptos' },
};
