// Prompt 11, Bloco 2: liga escudos reais (fornecidos pelo utilizador em assets/escudos-fonte/) aos clubes, por nome
// normalizado (ver src/cutscene/combinarEscudos.ts). Converte cada um para WebP, ≤ 256×256, ≤ 20 KB, fundo
// transparente (ffmpeg), em public/escudos/<clubeId>.webp, e escreve public/escudos/escudos.json. Sem a pasta de
// origem (ou vazia): escreve um manifesto vazio e não falha — todos os clubes ficam com o escudo genérico.
// Uso: npx tsx scripts/cutscene/gerar-escudos.ts [pasta-de-origem]
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { LocalFileSource } from '../../src/data/LocalFileSource.ts';
import { carregarDados } from '../../src/data/load.ts';
import { combinarEscudos } from '../../src/cutscene/combinarEscudos.ts';
import { RAIZ_PACKS } from '../../src/cli/args.ts';

const ORIGEM = process.argv[2] ?? new URL('../../assets/escudos-fonte/', import.meta.url).pathname;
const DESTINO = new URL('../../public/escudos/', import.meta.url).pathname;
const MANIFESTO = `${DESTINO}escudos.json`;
const EXT = /\.(png|jpg|jpeg|webp)$/i;

const d = await carregarDados(new LocalFileSource(RAIZ_PACKS));
const clubes = d.pacotes.flatMap((p) => p.clubes.map((c) => ({ id: c.id, nome: c.nome, nome_curto: c.nome_curto })));

const ficheiros = existsSync(ORIGEM) ? readdirSync(ORIGEM).filter((f) => EXT.test(f)) : [];
const { mapa, clubesSemImagem, ficheirosNaoUsados } = combinarEscudos(clubes, ficheiros);

mkdirSync(DESTINO, { recursive: true });
const manifesto: Record<string, string> = {};
let falhas = 0;
for (const [clubeId, ficheiro] of mapa) {
  const saida = `${DESTINO}${clubeId}.webp`;
  if (!converter(`${ORIGEM}${ficheiro}`, saida)) { falhas++; continue; }
  manifesto[clubeId] = `${clubeId}.webp`;
}
writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2) + '\n');

/** Redimensiona (≤ 256×256, mantendo a proporção), mantém a transparência e baixa a qualidade até ≤ 20 KB. */
function converter(origem: string, saida: string): boolean {
  for (const q of [80, 60, 45, 30, 20, 12]) {
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', origem, '-vf', "scale='min(256,iw)':'min(256,ih)':force_original_aspect_ratio=decrease", '-c:v', 'libwebp', '-q:v', String(q), saida], { stdio: 'pipe' });
    } catch (e) { console.warn(`  (ffmpeg falhou em ${origem}: ${(e as Error).message.split('\n')[0]})`); return false; }
    if (statSync(saida).size <= 20 * 1024) return true;
  }
  return statSync(saida).size <= 20 * 1024;
}

console.log(`Clubes no jogo: ${clubes.length}. Escudos encontrados: ${manifesto ? Object.keys(manifesto).length : 0} (${falhas} falharam a converter).`);
if (ficheirosNaoUsados.length) console.log(`Ficheiros em "${ORIGEM}" sem clube correspondente (${ficheirosNaoUsados.length}): ${ficheirosNaoUsados.join(', ')}`);
if (clubesSemImagem.length) console.log(`Clubes sem escudo (${clubesSemImagem.length}, ficam com o genérico): ${clubesSemImagem.slice(0, 20).map((c) => `${c.id} (${c.nome})`).join(', ')}${clubesSemImagem.length > 20 ? ', …' : ''}`);
console.log(`Manifesto escrito em ${MANIFESTO}.`);
