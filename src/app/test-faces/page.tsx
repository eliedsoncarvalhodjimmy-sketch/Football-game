// Página de teste dos rostos (/test-faces): 48 jogadores ao acaso em grelha, filtros por nacionalidade e por clube
// (muda a camisola), "Gerar novos 48" e a prova de determinismo ("Mesmo seed = mesma cara").
import { useMemo, useState } from 'react';
import { generatePlayerFace, mulberry32, type ClubKit, type Player } from '../../players/faceGenerator.ts';
import { ESTILOS_CARD, PlayerCard, PlayerFace } from '../../players/PlayerCard.tsx';
import { ISO2_DE_FIFA, NACIONALIDADES } from '../../players/nationalityPresets.ts';
import { nomePessoa } from '../../players/nomesPessoas.ts';
import { Rng } from '../../core/rng.ts';

/** Clubes de teste (cores e padrões de equipamento). */
export const CLUBES_TESTE: { id: string; nome: string; kit: ClubKit }[] = [
  { id: 'vermelhos', nome: 'Vermelhos da Serra', kit: { primaryColor: '#c62828', secondaryColor: '#ffffff', pattern: 'lisa', collar: 'redonda' } },
  { id: 'azuis', nome: 'Azuis do Mar', kit: { primaryColor: '#1565c0', secondaryColor: '#ffffff', pattern: 'lisa', collar: 'polo' } },
  { id: 'listados', nome: 'Listados do Norte', kit: { primaryColor: '#111111', secondaryColor: '#ffffff', pattern: 'riscas', collar: 'v' } },
  { id: 'canarinhos', nome: 'Canarinhos', kit: { primaryColor: '#f9c80e', secondaryColor: '#1b7a3a', pattern: 'lisa', collar: 'redonda' } },
  { id: 'xadrez', nome: 'Xadrez do Adriático', kit: { primaryColor: '#d32f2f', secondaryColor: '#ffffff', pattern: 'xadrez', collar: 'v' } },
  { id: 'celestes', nome: 'Celestes do Prata', kit: { primaryColor: '#7cc0ef', secondaryColor: '#ffffff', pattern: 'riscas', collar: 'polo' } },
  { id: 'verdes', nome: 'Verdes do Vale', kit: { primaryColor: '#2e7d32', secondaryColor: '#ffffff', pattern: 'lisa', collar: 'polo' } },
  { id: 'metades', nome: 'Metades da Ribeira', kit: { primaryColor: '#0d47a1', secondaryColor: '#c62828', pattern: 'metade', collar: 'redonda' } },
  { id: 'rubronegros', nome: 'Rubro-Negros', kit: { primaryColor: '#b71c1c', secondaryColor: '#111111', pattern: 'riscas', collar: 'v' } },
  { id: 'laranjas', nome: 'Laranjas do Delta', kit: { primaryColor: '#ef6c00', secondaryColor: '#111111', pattern: 'lisa', collar: 'redonda' } },
];
const KIT_POR_CLUBE = Object.fromEntries(CLUBES_TESTE.map((c) => [c.id, c.kit]));
const POSICOES = ['GR', 'DD', 'DC', 'DE', 'MDC', 'MC', 'MO', 'ED', 'EE', 'PL'];
const FIFA_DE_ISO2: Record<string, string> = Object.fromEntries(Object.entries(ISO2_DE_FIFA).map(([f, i]) => [i, f]));

/** 48 jogadores fictícios de um lote (determinístico pelo número do lote). */
export function gerarJogadoresTeste(lote: number, nacionalidade: string): Player[] {
  const r = mulberry32(lote * 7919 + 17);
  const out: Player[] = [];
  for (let i = 0; i < 48; i++) {
    const nac = nacionalidade || NACIONALIDADES[Math.floor(r() * NACIONALIDADES.length)].codigo;
    const nome = nomePessoa(FIFA_DE_ISO2[nac] ?? 'ENG', Rng.de(lote, 'nome', i));
    const idade = 16 + Math.floor(r() * 21);
    out.push({
      id: `t${lote}-${i}`, nome, nacionalidade: nac, idade, posicao: POSICOES[Math.floor(r() * POSICOES.length)],
      clubeId: CLUBES_TESTE[Math.floor(r() * CLUBES_TESTE.length)].id, overall: 55 + Math.floor(r() * 36),
    });
  }
  return out;
}

const ESTILOS_PAGINA = `
body { margin: 0; background: #0f1319; color: #e8ecf2; font: 14px/1.4 system-ui, sans-serif; }
.tf { max-width: 1280px; margin: 0 auto; padding: 16px; }
.tf h1 { font-size: 22px; margin: 4px 0 12px; }
.tf-barra { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin-bottom: 14px; }
.tf-barra label { display: grid; gap: 4px; font-size: 12px; color: #9aa6b6; }
.tf-barra select, .tf-barra button { min-height: 40px; border-radius: 10px; border: 1px solid #2f3846; background: #1b212b; color: #e8ecf2; padding: 0 12px; font: inherit; }
.tf-barra button { cursor: pointer; font-weight: 600; }
.tf-barra button.prim { background: #c62828; border-color: #c62828; }
.tf-nota { color: #9aa6b6; font-size: 13px; }
.tf-grelha { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.tf-prova { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; background: #171c24; border: 1px solid #2f3846; border-radius: 14px; padding: 12px; margin-bottom: 14px; }
.tf-prova .pf-rosto { width: 120px; }
.tf-ok { color: #5bd17a; font-weight: 700; }
.tf-erro { color: #ff6b6b; font-weight: 700; }
`;

export default function TestFacesPage() {
  const [lote, setLote] = useState(1);
  const [nacionalidade, setNacionalidade] = useState('');
  const [clube, setClube] = useState('');
  const [prova, setProva] = useState<{ iguais: number; total: number; ms: number } | null>(null);

  const jogadores = useMemo(() => gerarJogadoresTeste(lote, nacionalidade), [lote, nacionalidade]);
  const kitDe = (p: Player) => KIT_POR_CLUBE[clube || p.clubeId];

  // Desempenho: 100 rostos (texto SVG) por medição.
  const tempo100 = useMemo(() => {
    const ps = gerarJogadoresTeste(lote + 1000, nacionalidade).concat(gerarJogadoresTeste(lote + 2000, nacionalidade), gerarJogadoresTeste(lote + 3000, nacionalidade)).slice(0, 100);
    const t0 = performance.now();
    for (const p of ps) generatePlayerFace(p, { kit: kitDe(p) });
    return performance.now() - t0;
  }, [lote, nacionalidade, clube]);

  /** Gera os 48 rostos outra vez do zero e compara com os primeiros: o mesmo seed tem de dar o mesmo SVG. */
  function provarDeterminismo() {
    const a = jogadores.map((p) => generatePlayerFace(p, { kit: kitDe(p) }));
    const t0 = performance.now();
    const b = gerarJogadoresTeste(lote, nacionalidade).map((p) => generatePlayerFace(p, { kit: kitDe(p) }));
    const ms = performance.now() - t0;
    setProva({ iguais: a.filter((x, i) => x === b[i]).length, total: a.length, ms });
  }

  return (
    <main className="tf">
      <style>{ESTILOS_PAGINA + ESTILOS_CARD}</style>
      <h1>Rostos dos jogadores</h1>
      <div className="tf-barra">
        <label>Nacionalidade
          <select value={nacionalidade} onChange={(e) => { setNacionalidade(e.target.value); setProva(null); }}>
            <option value="">Todas</option>
            {NACIONALIDADES.map((n) => <option key={n.codigo} value={n.codigo}>{n.nome} ({n.codigo})</option>)}
          </select>
        </label>
        <label>Clube (camisola)
          <select value={clube} onChange={(e) => { setClube(e.target.value); setProva(null); }}>
            <option value="">O clube de cada jogador</option>
            {CLUBES_TESTE.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <button className="prim" onClick={() => { setLote((x) => x + 1); setProva(null); }}>Gerar novos 48</button>
        <button onClick={provarDeterminismo}>Mesmo seed = mesma cara</button>
        <span className="tf-nota">Lote {lote} · 100 rostos gerados em {tempo100.toFixed(1)} ms</span>
      </div>
      {prova && (
        <section className="tf-prova" aria-live="polite">
          <PlayerFace player={jogadores[0]} kit={kitDe(jogadores[0])} />
          <PlayerFace player={{ ...jogadores[0] }} kit={kitDe(jogadores[0])} />
          <div>
            <div className={prova.iguais === prova.total ? 'tf-ok' : 'tf-erro'}>{prova.iguais} de {prova.total} rostos idênticos ao gerar de novo</div>
            <div className="tf-nota">Mesmo id + nome → mesma semente → o mesmo SVG, byte a byte ({prova.ms.toFixed(1)} ms para os 48).</div>
          </div>
        </section>
      )}
      <div className="tf-grelha">
        {jogadores.map((p) => <PlayerCard key={p.id} player={p} kit={kitDe(p)} />)}
      </div>
    </main>
  );
}
