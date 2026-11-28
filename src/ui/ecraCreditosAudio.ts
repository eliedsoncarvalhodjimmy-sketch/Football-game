// Prompt 10, Bloco 4: ecrã "Créditos de áudio" nas Definições. Lista estática (mesma tabela de
// docs/audio_creditos.md) — as músicas e as intros da UEFA são comerciais/oficiais, "sem licença — uso privado";
// avisa que têm de ser substituídas antes de qualquer publicação do jogo.
interface CreditoAudio { ficheiro: string; fonte: string; licenca: string }

const CREDITOS: CreditoAudio[] = [
  { ficheiro: 'amb_estadio_cheio.mp3', fonte: 'Fornecido pelo utilizador', licenca: 'sem licença — uso privado' },
  { ficheiro: 'amb_imprensa.mp3', fonte: 'Fornecido pelo utilizador', licenca: 'sem licença — uso privado' },
  { ficheiro: 'cut_champions.mp3', fonte: 'Intro oficial da UEFA Champions League', licenca: 'sem licença — uso privado (oficial/comercial)' },
  { ficheiro: 'cut_europa.mp3', fonte: 'Intro oficial da UEFA Europa League', licenca: 'sem licença — uso privado (oficial/comercial)' },
  { ficheiro: 'mus_menu.mp3', fonte: 'Música comercial', licenca: 'sem licença — uso privado' },
  { ficheiro: 'mus_gestao_1.mp3', fonte: 'Música comercial', licenca: 'sem licença — uso privado' },
  { ficheiro: 'mus_gestao_2.mp3', fonte: 'Música comercial', licenca: 'sem licença — uso privado' },
  { ficheiro: 'mus_gestao_3.mp3', fonte: 'Música comercial', licenca: 'sem licença — uso privado' },
  { ficheiro: 'mus_gestao_4.mp3', fonte: 'Música comercial', licenca: 'sem licença — uso privado' },
];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function htmlCreditosAudio(): string {
  return `<div class="grelha">
    <section class="c s12"><h2>Créditos de áudio</h2>
      <div class="rot" style="margin-bottom:10px">As músicas e as intros da UEFA fornecidas são comerciais/oficiais — têm de ser substituídas por conteúdo livre de direitos (ou licenciado) antes de qualquer publicação do jogo.</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr><th style="text-align:left;padding:4px 8px">Ficheiro</th><th style="text-align:left;padding:4px 8px">Fonte</th><th style="text-align:left;padding:4px 8px">Licença</th></tr></thead>
        <tbody>${CREDITOS.map((c) => `<tr><td style="padding:4px 8px">${esc(c.ficheiro)}</td><td style="padding:4px 8px">${esc(c.fonte)}</td><td style="padding:4px 8px">${esc(c.licenca)}</td></tr>`).join('')}</tbody>
      </table>
    </section>
  </div>`;
}
