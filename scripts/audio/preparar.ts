// Prompt 10, Bloco 2: catálogo e manifesto de áudio. Lê `assets/audio-fonte/` (fora do git, fornecida pelo
// utilizador), valida os nomes contra o catálogo fixo, converte cada ficheiro (mp3 128 kbps, normaliza o volume,
// corta silêncio das pontas, suaviza o loop com um fade curto nas duas pontas) para `public/audio/<id>.mp3` e
// escreve `public/audio/audio.json`. Nunca apaga nem altera `assets/audio-fonte/`; nomes desconhecidos só avisam.
// Pasta vazia (ou inexistente): escreve um manifesto vazio e não falha — o jogo arranca em silêncio.
// Uso: npx tsx scripts/audio/preparar.ts [pasta-de-origem]
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ORIGEM = process.argv[2] ?? new URL('../../assets/audio-fonte/', import.meta.url).pathname;
const DESTINO = new URL('../../public/audio/', import.meta.url).pathname;
const MANIFESTO = `${DESTINO}audio.json`;
const TEMP = new URL('../../public/audio/.tmp/', import.meta.url).pathname;

type Categoria = 'ambiente' | 'musica' | 'cutscene';
interface Definicao { categoria: Categoria; loop: boolean; lufs: number; pesoMaximo: number }

/** Catálogo de nomes fixos (podem faltar) — ver Prompt 10, Bloco 2. */
const CATALOGO: Record<string, Definicao> = {
  amb_estadio_cheio: { categoria: 'ambiente', loop: true, lufs: -18, pesoMaximo: 800 * 1024 },
  amb_estadio_vazio: { categoria: 'ambiente', loop: true, lufs: -18, pesoMaximo: 800 * 1024 },
  amb_estadio_tensao: { categoria: 'ambiente', loop: true, lufs: -18, pesoMaximo: 800 * 1024 },
  amb_imprensa: { categoria: 'ambiente', loop: true, lufs: -18, pesoMaximo: 800 * 1024 },
  mus_menu: { categoria: 'musica', loop: true, lufs: -16, pesoMaximo: 5 * 1024 * 1024 },
  mus_gestao_1: { categoria: 'musica', loop: true, lufs: -16, pesoMaximo: 5 * 1024 * 1024 },
  mus_gestao_2: { categoria: 'musica', loop: true, lufs: -16, pesoMaximo: 5 * 1024 * 1024 },
  mus_gestao_3: { categoria: 'musica', loop: true, lufs: -16, pesoMaximo: 5 * 1024 * 1024 },
  mus_gestao_4: { categoria: 'musica', loop: true, lufs: -16, pesoMaximo: 5 * 1024 * 1024 },
  mus_gestao_5: { categoria: 'musica', loop: true, lufs: -16, pesoMaximo: 5 * 1024 * 1024 },
  mus_partida: { categoria: 'musica', loop: true, lufs: -16, pesoMaximo: 5 * 1024 * 1024 },
  cut_champions: { categoria: 'cutscene', loop: false, lufs: -14, pesoMaximo: 1024 * 1024 },
  cut_europa: { categoria: 'cutscene', loop: false, lufs: -14, pesoMaximo: 1024 * 1024 },
};
const PESO_TOTAL_MAXIMO = 30 * 1024 * 1024;
const EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
const FADE_LOOP_S = 0.2; // ~200 ms: fade nas duas pontas de um loop, para não dar estalido ao repetir.

interface ManifestoItem { id: string; ficheiro: string; categoria: Categoria; duracao: number; peso: number; loop: boolean; volumeBase: number }

function duracaoSegundos(caminho: string): number {
  const saida = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', caminho]).toString().trim();
  return Number(saida) || 0;
}

/** Normaliza o volume (loudnorm) e corta silêncio das duas pontas, para um WAV intermédio (sem perdas, antes da
 *  compressão final em mp3). */
function tratarIntermedio(origem: string, intermedio: string, def: Definicao) {
  const filtros = [
    `loudnorm=I=${def.lufs}:TP=-1.5:LRA=11`,
    'silenceremove=start_periods=1:start_duration=0.05:start_threshold=-50dB:detection=peak',
    'areverse', 'silenceremove=start_periods=1:start_duration=0.05:start_threshold=-50dB:detection=peak', 'areverse',
  ].join(',');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', origem, '-af', filtros, intermedio], { stdio: 'pipe' });
}

/** Comprime para mp3 a `kbps`; nos loops, aplica um fade curto nas duas pontas (sem estalido a repetir). */
function comprimir(intermedio: string, saida: string, def: Definicao, kbps: number) {
  const dur = duracaoSegundos(intermedio);
  const af = def.loop && dur > 2 * FADE_LOOP_S ? `afade=t=in:d=${FADE_LOOP_S},afade=t=out:st=${(dur - FADE_LOOP_S).toFixed(3)}:d=${FADE_LOOP_S}` : null;
  const args = ['-y', '-loglevel', 'error', '-i', intermedio, ...(af ? ['-af', af] : []), '-codec:a', 'libmp3lame', '-b:a', `${kbps}k`, saida];
  execFileSync('ffmpeg', args, { stdio: 'pipe' });
}

function converter(origem: string, id: string, def: Definicao): ManifestoItem | null {
  const intermedio = `${TEMP}${id}.wav`;
  const saida = `${DESTINO}${id}.mp3`;
  try {
    tratarIntermedio(origem, intermedio, def);
  } catch (e) {
    console.warn(`  ✗ ${id}: falhou a tratar (${(e as Error).message.split('\n')[0]}) — fica sem ficheiro (silêncio).`);
    return null;
  }
  for (const kbps of [128, 96, 64]) {
    try {
      comprimir(intermedio, saida, def, kbps);
    } catch (e) {
      console.warn(`  ✗ ${id}: falhou a comprimir (${(e as Error).message.split('\n')[0]}) — fica sem ficheiro (silêncio).`);
      return null;
    }
    const peso = statSync(saida).size;
    if (peso <= def.pesoMaximo || kbps === 64) {
      if (peso > def.pesoMaximo) console.warn(`  ! ${id}: ${(peso / 1024).toFixed(0)} KB, acima do orçamento (${(def.pesoMaximo / 1024).toFixed(0)} KB) mesmo a 64 kbps.`);
      return { id, ficheiro: `${id}.mp3`, categoria: def.categoria, duracao: duracaoSegundos(saida), peso, loop: def.loop, volumeBase: 1 };
    }
  }
  return null; // nunca chega aqui (kbps===64 sempre devolve), mas o TS pede um caminho de saída
}

mkdirSync(DESTINO, { recursive: true });
mkdirSync(TEMP, { recursive: true });

const ficheiros = existsSync(ORIGEM) ? readdirSync(ORIGEM, { withFileTypes: true }).filter((e) => e.isFile() && EXT.test(e.name)) : [];
const manifesto: ManifestoItem[] = [];
const desconhecidos: string[] = [];
let falhas = 0;

for (const f of ficheiros) {
  const id = f.name.replace(/\.[^.]+$/, '');
  const def = CATALOGO[id];
  if (!def) { desconhecidos.push(f.name); continue; }
  console.log(`A tratar ${f.name}…`);
  const item = converter(`${ORIGEM}${f.name}`, id, def);
  if (item) manifesto.push(item); else falhas++;
}

rmSync(TEMP, { recursive: true, force: true });
writeFileSync(MANIFESTO, `${JSON.stringify(manifesto, null, 2)}\n`);

const pesoTotal = manifesto.reduce((s, m) => s + m.peso, 0);
const emFalta = Object.keys(CATALOGO).filter((id) => !manifesto.some((m) => m.id === id));

console.log(`\n${manifesto.length} som(ns) no catálogo (${(pesoTotal / 1024 / 1024).toFixed(2)} MB${pesoTotal > PESO_TOTAL_MAXIMO ? ` — ACIMA do orçamento de ${PESO_TOTAL_MAXIMO / 1024 / 1024} MB` : ''}).`);
if (falhas) console.log(`${falhas} ficheiro(s) falharam a converter (sem ficheiro no catálogo: silêncio).`);
if (desconhecidos.length) console.log(`Nomes desconhecidos em "${ORIGEM}" (ignorados, não apagados): ${desconhecidos.join(', ')}.`);
if (emFalta.length) console.log(`Em falta do catálogo fixo (silêncio para esses ids): ${emFalta.join(', ')}.`);
const extrasDir = `${ORIGEM}extras/`;
if (existsSync(extrasDir)) {
  const extras = readdirSync(extrasDir, { withFileTypes: true }).filter((e) => e.isFile() && EXT.test(e.name)).map((e) => e.name);
  if (extras.length) console.log(`Fora do catálogo (pasta "extras/", ignorados de propósito): ${extras.join(', ')}.`);
}
console.log(`Manifesto escrito em ${MANIFESTO}.`);
