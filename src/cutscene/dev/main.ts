// Prompt 11, Blocos 3-4 (PARAGEM C/D): página de teste manual. Usa o AudioManager e o Cutscene a sério (não é uma
// maqueta à parte); a cena já é a final (fotografias/logótipos reais, escudo genérico — nenhum escudo de clube
// foi ainda fornecido, ver Bloco 2). Abre em npm run dev → /test-cutscene/.
import '../../ui/estilo.css';
import { AudioManager } from '../../audio/AudioManager.ts';
import { abrirCutscene } from '../../ui/cutscene.ts';
import { TL_CHAMPIONS } from '../timelines/champions.ts';
import { TL_EUROPA } from '../timelines/europa.ts';
import { carregarImagensCompeticao, criarCenaEuropeia } from '../cena.ts';
import { CUTSCENE } from '../../config/cutscene.ts';
import type { DadosCutscene, IdCompeticao } from '../tipos.ts';
import type { Catalogo, ItemCatalogo } from '../../audio/tipos.ts';
import type { ImagensCena } from '../cena.ts';

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const estado = (s: string) => { $('#estado').textContent = s; };

let comp: IdCompeticao = 'champions';
let urlAudio: Record<string, string> = {};
$('#bCL').addEventListener('click', () => { comp = 'champions'; estado('Champions League escolhida.'); });
$('#bEL').addEventListener('click', () => { comp = 'europa'; estado('Liga Europa escolhida.'); });

$('#fAudio').addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  urlAudio = { ...urlAudio, [comp === 'champions' ? 'cut_champions' : 'cut_europa']: url };
  estado(`Áudio carregado para ${comp === 'champions' ? 'Champions' : 'Liga Europa'}: ${f.name}.`);
});

const catalogo: Catalogo = {
  obter(id) {
    const ficheiro = urlAudio[id];
    if (!ficheiro) return undefined;
    return { id, ficheiro, categoria: 'cutscene', duracao: 38, loop: false, volumeBase: 1 } satisfies ItemCatalogo;
  },
};
const audio = new AudioManager(catalogo);
audio.ligarAutomatismos();
audio.desbloquear(); // o próprio toque nos botões já desbloqueia; isto é só para o ▶ a seguir funcionar logo.

function dadosExemplo(c: IdCompeticao): DadosCutscene {
  return {
    competicao: c,
    fase: c === 'champions' ? 'Oitavos de final · 1.ª mão' : 'Play-off · 2.ª mão',
    estadio: 'Estádio Nacional', cidade: 'Luanda', data: `12 Mar 2027 · ${CUTSCENE.hora_fixa}`,
    casa: { nome: 'GCI United', sigla: 'GCI', cor: '#1f6feb' },
    fora: { nome: 'FC Exemplo', sigla: 'EXE', cor: '#d7263d' },
  };
}

// Sem escudos de clube fornecidos ainda (Bloco 2): ambos ficam com o escudo genérico.
const imagens: Record<IdCompeticao, ImagensCena | null> = { champions: null, europa: null };
async function carregarTudo() {
  $('#bPlay').setAttribute('disabled', 'true'); estado('A carregar imagens…');
  const base = import.meta.env.BASE_URL;
  [imagens.champions, imagens.europa] = await Promise.all([carregarImagensCompeticao('champions', base), carregarImagensCompeticao('europa', base)]);
  $('#bPlay').removeAttribute('disabled');
  const faltam = Object.entries({ ...imagens.champions, ...imagens.europa }).filter(([, v]) => !v).map(([k]) => k);
  estado(faltam.length ? `Imagens carregadas (faltam: ${faltam.join(', ')} — a cena usa um fundo simples).` : 'Imagens carregadas.');
}
carregarTudo();

function abrir(reduzidoForcado = false) {
  const tl = comp === 'champions' ? TL_CHAMPIONS : TL_EUROPA;
  const desenhar = criarCenaEuropeia(imagens[comp] ?? {}, { casa: null, fora: null });
  if (reduzidoForcado) {
    // Simula o modo reduzido sem precisar de mudar as definições do sistema (só para este teste).
    const original = window.matchMedia;
    (window as unknown as { matchMedia: typeof matchMedia }).matchMedia = ((q: string) => ({ matches: q.includes('reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof matchMedia;
    abrirCutscene({ idComp: comp, tl, dados: dadosExemplo(comp), desenhar, audio }, () => { window.matchMedia = original; estado('Cutscene (reduzida) terminou.'); });
    return;
  }
  abrirCutscene({ idComp: comp, tl, dados: dadosExemplo(comp), desenhar, audio }, () => estado('Cutscene terminou (ou foi saltada). Repara se a música/ambiente voltariam aqui (Bloco 5).'));
}
$('#bPlay').addEventListener('click', () => abrir(false));
$('#bReduzido').addEventListener('click', () => abrir(true));
