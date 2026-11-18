// Card do jogador: rosto + nome + posição + idade + overall (a posição só aparece no card, não muda o rosto).
import { memo, useMemo } from 'react';
import { generatePlayerFace, type ClubKit, type Player } from './faceGenerator.ts';
import { presetDe } from './nationalityPresets.ts';

/** Rosto em SVG (o texto vem da cache do gerador; o componente só volta a desenhar se o rosto mudar). */
export const PlayerFace = memo(function PlayerFace({ player, kit, largura }: { player: Player; kit?: ClubKit; largura?: number }) {
  const svg = useMemo(
    () => generatePlayerFace(player, { kit }),
    [player.id, player.faceNationality, player.faceVersion, player.nacionalidade, player.idade, player.clubeId, kit?.primaryColor, kit?.secondaryColor, kit?.pattern, kit?.collar],
  );
  return <div className="pf-rosto" style={largura ? { width: largura } : undefined} dangerouslySetInnerHTML={{ __html: svg }} />;
});

/** Cor do overall (como nos jogos de gestão: verde alto, amarelo médio, laranja baixo). */
function corOverall(o: number): string {
  if (o >= 85) return '#1f9d55';
  if (o >= 75) return '#5bb349';
  if (o >= 65) return '#d4a72c';
  return '#d9792b';
}

export const PlayerCard = memo(function PlayerCard({ player, kit }: { player: Player; kit?: ClubKit }) {
  const ovr = player.overall ?? 0;
  return (
    <article className="pf-card">
      <div className="pf-topo">
        {ovr > 0 && <span className="pf-ovr" style={{ background: corOverall(ovr) }}>{ovr}</span>}
        <span className="pf-pos">{player.posicao}</span>
      </div>
      <PlayerFace player={player} kit={kit} />
      <div className="pf-info">
        <strong className="pf-nome">{player.nome}</strong>
        <span className="pf-meta">{presetDe(player.nacionalidade).nome} · {player.idade} anos</span>
      </div>
    </article>
  );
});

/** Estilos do card (sem dependências): inseridos uma vez pela página que usa o card. */
export const ESTILOS_CARD = `
.pf-card { position: relative; display: grid; gap: 6px; background: linear-gradient(180deg, #232a35 0%, #171c24 100%); border: 1px solid #2f3846; border-radius: 14px; padding: 10px 10px 12px; color: #e8ecf2; }
.pf-topo { position: absolute; top: 10px; left: 10px; display: grid; gap: 4px; justify-items: center; z-index: 1; }
.pf-ovr { display: inline-grid; place-items: center; min-width: 34px; height: 30px; border-radius: 8px; font: 700 17px/1 system-ui, sans-serif; color: #fff; }
.pf-pos { font: 700 12px/1 system-ui, sans-serif; color: #c9d2de; letter-spacing: .04em; }
.pf-rosto { width: 100%; aspect-ratio: 200 / 240; }
.pf-rosto svg { display: block; width: 100%; height: 100%; }
.pf-info { display: grid; gap: 2px; text-align: center; }
.pf-nome { font: 600 14px/1.25 system-ui, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf-meta { font: 12px/1.3 system-ui, sans-serif; color: #9aa6b6; }
`;
