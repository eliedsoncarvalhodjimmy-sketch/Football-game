// npm run validate-pack [-- <pacote>]
// Diz, por pacote, quantos clubes, jogadores, treinadores e donos são reais e
// quantos serão gerados, e lista os erros de formato e coerência.
import { LocalFileSource } from '../data/LocalFileSource.ts';
import { carregarDados } from '../data/load.ts';
import { validar } from '../data/validate.ts';
import { args, RAIZ_PACKS } from './args.ts';

const a = args();
const dados = await carregarDados(new LocalFileSource(RAIZ_PACKS));
const filtro = typeof a._ === 'string' ? a._ : null;
const problemas = validar(dados);

console.log('| Pacote | Clubes reais | Clubes gerados | Jogadores reais | Treinadores reais | Donos reais | Erros | Avisos |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
let totErros = 0;
let totClubes = 0;
for (const p of dados.pacotes) {
  const id = p.manifest.id;
  if (filtro && id !== filtro) continue;
  const c = dados.contagens[id];
  const vagas = p.ligas.reduce((s, l) => s + l.formato.equipas, 0);
  totClubes += vagas;
  const reais = (k: string) => (c[k]?.real ?? 0) + (c[k]?.manual ?? 0);
  const pr = problemas.filter((x) => x.pacote === id);
  const ne = pr.filter((x) => x.nivel === 'erro').length;
  totErros += ne;
  console.log(`| ${id} | ${reais('clubes')} | ${vagas - p.clubes.length} | ${reais('players')} | ${reais('treinadores')} | ${reais('donos')} | ${ne} | ${pr.length - ne} |`);
}
console.log(`\nTotal de vagas de clubes: ${totClubes}`);
const mostrar = problemas.filter((x) => (!filtro || x.pacote === filtro) && (x.nivel === 'erro' || a.avisos));
if (mostrar.length) {
  console.log('\nProblemas:');
  for (const x of mostrar) console.log(`- [${x.nivel}] ${x.pacote}: ${x.msg}`);
}
const contErr = problemas.filter((x) => x.pacote === '_continental' && x.nivel === 'erro').length;
if (!filtro) console.log(`\nContinental: ${contErr === 0 ? 'OK' : contErr + ' erro(s)'}`);
console.log(totErros + contErr === 0 ? '\nSem erros.' : `\n${totErros + contErr} erro(s).`);
process.exitCode = totErros + contErr ? 1 : 0;
