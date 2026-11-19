# FutCEO — Motor 2D táctico: especificação para o Claude Code

Este ficheiro é a referência do motor de partida em 2D (estilo FM clássico). Quando houver dúvida sobre comportamento, este documento manda; o que for interpretado regista-se em DECISIONS.md. Todos os números ficam em `src/config/match2d/` para afinar.

> Estado: só a secção 0 foi recebida. As secções referidas (2, 7.3, …) ainda não chegaram.

## 0. Diagnóstico: porque é que o motor actual parece caótico

Antes de escrever código, confirmar quais destas causas existem hoje no motor:

1. **Cada jogador decide sozinho, sem estrutura colectiva.** No futebol real, 80% do movimento de um jogador é "manter a posição certa dentro do bloco da equipa". Só uma minoria do tempo é decisão individual.
2. **As decisões são recalculadas a cada frame.** O alvo muda constantemente e as bolinhas tremem e ziguezagueiam. Decisões têm de ter compromisso (secção 7.3).
3. **Velocidades irreais por causa da compressão de tempo.** 90 min em 15 min = 6x. Se o motor desenhar jogadores a 6x da velocidade real, um sprint de 8 m/s aparece como 48 m/s no ecrã: isso parece caos mesmo com IA perfeita. Ver secção 2.
4. **A bola teletransporta-se ou é resolvida sem trajectória.** Um passe tem de viajar no espaço, com velocidade, e poder ser interceptado pelo caminho.
5. **Não há fases de jogo.** A equipa não sabe se está a construir, a defender em bloco ou em transição, e por isso não muda de forma.
