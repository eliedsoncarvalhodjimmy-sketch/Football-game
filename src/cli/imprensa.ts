// Converte e valida os guiões de imprensa: data/imprensa/guioes.md → data/imprensa/guioes.json.
// Uso: npm run imprensa
import { readFileSync, writeFileSync } from 'node:fs';
import { lerGuioes, validarGuioes } from '../imprensa/guioes';

const md = readFileSync('data/imprensa/guioes.md', 'utf8');
const g = lerGuioes(md);
const { erros, avisos } = validarGuioes(g);
const respostas = g.reduce((s, p) => s + p.respostas.length, 0);
const conta = (f: (r: (typeof g)[0]['respostas'][0]) => unknown) => g.flatMap((p) => p.respostas).filter(f).length;
console.log(`${g.length} perguntas, ${respostas} respostas, ${new Set(g.map((p) => p.seccao)).size} contextos`);
console.log(`promessas: ${conta((r) => r.promessa)}, mentiras: ${conta((r) => r.mentira)}, com multa: ${conta((r) => r.multa)}, condicionais (IMP-066): ${conta((r) => r.disponivel)}`);
console.log(`modo: DIR ${g.filter((p) => p.modo === 'DIR').length}, DONO ${g.filter((p) => p.modo === 'DONO').length}, AMBOS ${g.filter((p) => p.modo === 'AMBOS').length}`);
for (const a of avisos) console.log('aviso:', a);
for (const e of erros) console.log('ERRO:', e);
writeFileSync('data/imprensa/guioes.json', JSON.stringify(g, null, 1));
console.log('escrito data/imprensa/guioes.json');
if (erros.length) process.exit(1);
