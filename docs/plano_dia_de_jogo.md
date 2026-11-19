# Bloco B — Dia de jogo (plano para aprovação)

Protótipo: ecrã "Dia de jogo" em `docs/prototipo/futceo-prototipo.html` (Início → "Dia de jogo ›").

## O que o Presidente vê e faz

1. **Antes do jogo** (quando o Continuar chega à semana com um jogo do clube):
   - onze e banco escolhidos pelo treinador, com a formação;
   - onze provável do adversário (nomes e OVR pelo que os olheiros sabem);
   - a sugestão táctica da semana e a resposta do treinador;
   - escolha: **Ver o jogo** ou **Só o resultado**.
2. **Ao vivo:**
   - placar e minuto;
   - campo 2D com a bola no último lance e os remates de cada equipa (golos a amarelo);
   - relato minuto a minuto (golos, remates, cantos, faltas, cartões, lesões, substituições);
   - estatísticas em barras: posse, remates, xG, cantos, faltas e cartões;
   - velocidade 1×/2×/4×/8×, pausa e "saltar para o fim".
3. **Intervalo:** o jogo pára e o Presidente pode dar uma indicação ao treinador:
   - arriscar mais;
   - segurar o resultado;
   - sugerir a entrada de um suplente;
   - não dizer nada.

   O treinador decide pelo motor de interferência que já existe (capital, autoridade e conflito). Aceitar muda a 2.ª parte; cada indicação gasta capital, como as sugestões semanais.
4. **Fim:** resultado, notas de todos os jogadores, homem do jogo, estatísticas e os outros resultados da jornada; depois o Continuar segue para o resto da semana.

## No motor (depois da aprovação)

- **Motor detalhado:** o jogo do clube do utilizador passa a usar o motor detalhado (`jogoDetalhado`, eventos com posição no campo), sempre. Também ao recarregar uma gravação, para o resultado ser o mesmo. Os outros jogos continuam no motor rápido. A calibração do detalhado é revista contra a do rápido: golos por jogo, vantagem caseira e % de vitórias do mais forte.
- **Semana dividida em duas:** o "Continuar" simula até ao dia do jogo do utilizador. O jogo é calculado e enviado à interface para o relato, e o resto da semana corre depois. Num "Só o resultado" é tudo seguido.
- **Indicação ao intervalo:** é um comando gravado, com a semana e o jogo a que se aplica. A 2.ª parte é calculada a partir do estado ao intervalo (placar, cansaço, cartões e minuto), com a decisão do treinador. Sem indicação, o jogo é o mesmo que "Só o resultado". Para isto o motor detalhado tem de poder começar a meio, numa função `continuarJogo(estado, alterações)`.
- **Notas e homem do jogo:** saem das notas que o motor já calcula para a evolução, a forma e os prémios.
- **Estatísticas:** guardam-se as do último jogo do clube, para o Início e a ficha do jogador ("últimos 3 jogos").

## Fica para depois

- Substituições decididas pelo Presidente durante o jogo: não, porque quem decide é o treinador (modo Dono).
- O replay 2D completo, com os jogadores a mexer: o protótipo mostra só a bola e os remates.
- A conferência de imprensa depois do jogo é do Bloco C.

## Perguntas

1. As indicações ao intervalo são estas 4, ou queres outras (por exemplo, "pedir mais pressão", "dar descanso a um jogador")?
2. Ver o jogo deve ser a opção por omissão em todos os jogos, ou só nos jogos grandes (dérbis, taças, competições europeias), ficando os outros em "só o resultado"?
3. Velocidade por omissão: 2×?
