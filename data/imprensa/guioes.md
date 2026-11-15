# FutCEO — Guiões de imprensa

Guiões para as conferências de imprensa do jogo. Cada pergunta tem 3 respostas possíveis. Os efeitos são pequenos e limitados (a imprensa nunca decide uma época), e os valores estão em escala de −3 a +3, para o Code os ler de um ficheiro e eu os afinar em config.

## Como ler cada entrada

- **ID:** identificador único (IMP-001...).
- **Quando:** o gatilho. O motor só escolhe a pergunta se a condição for verdadeira.
- **Modo:** DIR (Director de Futebol), DONO (Dono/CEO) ou AMBOS.
- **Jornalista:** quem pergunta (imprensa local, nacional, desportiva, estrangeira, canal do clube, blogue de adeptos). Muda o alcance: local pesa nos adeptos, nacional na reputação, estrangeira na imagem do clube lá fora.
- **Respostas A, B, C:** o texto que o jogador vê, o tom, e os efeitos.
- **Efeitos:** EQ = moral do plantel, AD = adeptos, DN = dono ou conselho, IM = imprensa (reputação mediática), TR = relação com o treinador, BL = balneário (coesão). Só se mostram os que mudam.
- **PROMESSA:** a resposta fica registada. Se a promessa falhar no fim da época, a satisfação de adeptos e do dono desce mais do que subiu (ver objectivos no Prompt 5). Cada promessa tem prazo.
- **MENTIRA:** a resposta contradiz um facto verdadeiro do jogo (por exemplo, "não há problemas de dinheiro" com o clube em crise). Se o jornalista voltar ao tema e a verdade sair, o efeito é negativo e dobrado.

## Variáveis de texto

{clube}, {adversario}, {competicao}, {treinador}, {jogador}, {capitao}, {jovem}, {ex_jogador}, {estadio}, {cidade}, {valor}, {posicao}, {objectivo}, {rival}, {liga}, {dono}.

## Regras de escolha (para o Code)

1. Escolher 3 a 5 perguntas por conferência (3 no pré-jogo e pós-jogo; 5 em eventos grandes: apresentação, fim de época, crise, final).
2. Dar prioridade às perguntas cujo gatilho seja mais raro. Evitar repetir a mesma pergunta antes de 12 conferências.
3. Perguntas de "memória" (promessas e contradições) têm prioridade máxima quando o gatilho se cumpre.
4. O jornalista pode voltar a uma resposta anterior (ex.: IMP-066).
5. Cada resposta tem sempre uma opção "prudente", uma "ambiciosa/firme" e uma "emocional/humorística ou provocadora", em posições A, B, C que variam de pergunta para pergunta, para não se decorar o padrão.
6. Num clube de adeptos ou com dono muito interferente, o efeito DN pesa mais; num clube grande, o efeito IM pesa mais.

---

## 1. Apresentação e início de ciclo

### IMP-001 — Apresentação do novo Director de Futebol
**Quando:** primeira conferência da carreira, modo DIR. **Jornalista:** imprensa local.
**Pergunta:** "Seja bem-vindo ao {clube}. Qual é a primeira mensagem que quer deixar aos adeptos?"
- **A (humilde):** "Venho trabalhar, ouvir e aprender com quem conhece este clube melhor do que eu. Os resultados vêm depois." AD +1, DN +1, IM 0.
- **B (ambiciosa):** "Este clube merece estar mais acima. Vou lutar para que isso aconteça já nesta época." AD +2, DN 0, EQ +1, PROMESSA (prazo: fim da época, tipo: subir de patamar).
- **C (directa):** "Prefiro não prometer nada. Digo que o projecto é sério e que vão ver o trabalho nos relvados." AD 0, DN +1, IM +1.

### IMP-002 — Apresentação do novo Dono
**Quando:** primeira conferência da carreira, modo DONO. **Jornalista:** imprensa nacional.
**Pergunta:** "Muitos clubes foram mal geridos por donos que chegaram com grandes promessas. Porque é que {clube} seria diferente?"
- **A (transparente):** "Porque vou mostrar as contas todos os anos e responder pelas decisões. Se falhar, os adeptos saberão logo." AD +2, IM +1.
- **B (confiante):** "Porque não estou aqui para vender ilusões. Estou a investir o meu dinheiro e o meu nome." AD +1, DN +1, IM +1, PROMESSA (finanças estáveis, 1 época).
- **C (defensiva):** "Não vou comparar com outros. Julguem-me pelo que fizer, não pelo que outros fizeram." AD 0, IM −1.

### IMP-003 — Sucessor de uma figura querida
**Quando:** o Director anterior ou o treinador anterior era muito querido pelos adeptos (reputação do saído acima de 70). **Jornalista:** blogue de adeptos.
**Pergunta:** "Está a substituir {ex_jogador}, uma figura histórica. Sente a pressão da comparação?"
- **A (respeitosa):** "Sinto, e é um privilégio. Ele deixou um legado que respeito, e vou construir o meu caminho." AD +1, IM +1.
- **B (confiante):** "Não vou entrar em comparações. Cada tempo tem as suas decisões, e eu tomarei as minhas." AD −1, DN +1.
- **C (humorística):** "A comparação é inevitável, mas eu prometo que não vou usar as chuteiras dele." AD +1, IM +1, EQ +1.

### IMP-004 — Clube recém-promovido
**Quando:** clube acabou de subir de divisão. **Jornalista:** imprensa nacional.
**Pergunta:** "A subida foi festejada, mas muitos clubes recém-promovidos descem logo. Qual é o plano?"
- **A (realista):** "Primeiro, não descer. Cada ponto conta, e vamos competir em cada jogo como se fosse o último." AD +1, DN +1, PROMESSA (não descer).
- **B (ambiciosa):** "Subimos para competir, não para sobreviver. Estamos aqui para surpreender." AD +2, EQ +1, DN −1, PROMESSA (metade superior da tabela).
- **C (prudente):** "Estamos focados no dia-a-dia. Os objectivos vão-se definindo à medida que a época avança." AD 0, IM −1.

### IMP-005 — Clube rebaixado
**Quando:** primeira conferência depois de uma descida. **Jornalista:** imprensa local.
**Pergunta:** "A descida deixou feridas profundas. O que vai fazer para recuperar a confiança dos sócios?"
- **A (assumindo):** "Falhámos, e assumo a minha parte. Vou reconstruir com honestidade e trabalho, começando por pedir desculpa aos adeptos." AD +2, DN +1, IM +1.
- **B (ambiciosa):** "A subida é o único objectivo. Quero um plantel pronto para voltar já na próxima época." AD +1, DN +1, PROMESSA (subir nesta época).
- **C (cuidadosa):** "É cedo para falar de objectivos. Primeiro, estabilizar o clube e perceber o que correu mal." AD −1, DN 0, IM 0.

---

## 2. Objectivos e ambição

### IMP-006 — Reunião de objectivos (início de época)
**Quando:** primeira conferência da época, depois da reunião de objectivos. **Modo:** AMBOS.
**Pergunta:** "O objectivo declarado é {objectivo}. Acha que o plantel tem qualidade para isso?"
- **A (confiante):** "Acho que sim, e confio neste grupo. Se acontecerem lesões, o plano mantém-se." AD +1, EQ +1, DN +1.
- **B (cautelosa):** "O objectivo é exigente, mas realista. Dependemos de manter os jogadores-chave em forma." AD 0, DN +1.
- **C (provocadora):** "Se quiserem mais, terão de me dar mais orçamento. Com o que tenho, é isto." DN −2, AD 0, IM +1.

### IMP-007 — Objectivo mais ambicioso do que o plantel
**Quando:** o objectivo está acima do que o OVR médio do plantel sugere. **Jornalista:** imprensa desportiva.
**Pergunta:** "Os números dizem que {clube} está abaixo de {rival}. Como se explica a ambição?"
- **A (firme):** "Os números não jogam. O que conta é a vontade, e este grupo tem fome." AD +1, EQ +1, DN +1, PROMESSA (cumprir {objectivo}).
- **B (analítica):** "Concordo, estamos abaixo. Mas há margem de crescimento, e vamos usar o mercado e a academia." AD 0, IM +1.
- **C (humilde):** "É verdade, somos o mais fraco desta lista. Mas os pequenos também ganham, e vamos tentar." AD +1, DN −1.

### IMP-008 — Falhar o objectivo a meio da época
**Quando:** a meio da época, com o clube em risco de falhar o {objectivo}. **Modo:** AMBOS.
**Pergunta:** "Estão a {posicao} lugares do objectivo. Já se pode dizer que a época está comprometida?"
- **A (combativa):** "Nem pensar. Faltam muitos jogos e acredito que o grupo reage." AD +1, EQ +1, PROMESSA (recuperar até ao fim).
- **B (honesta):** "Está difícil, não vou mentir. Mas enquanto houver hipóteses, vamos lutar." AD 0, IM +1.
- **C (evasiva):** "Prefiro não responder a essa pergunta. Vamos jogo a jogo." AD −1, IM −1.

### IMP-009 — Mudança de objectivo
**Quando:** o conselho ou o dono baixou o objectivo. **Jornalista:** imprensa nacional.
**Pergunta:** "Baixaram o objectivo a meio da época. Isso é um sinal de desistência?"
- **A (justificando):** "É um ajuste realista à nossa situação. Preferimos metas claras a sonhos que depois desiludem." DN +1, AD −1.
- **B (firme):** "De forma nenhuma. Os objectivos mudam com a realidade, mas a ambição fica." AD 0, IM +1.
- **C (assumindo):** "Reconheço que as coisas não correram como esperado. Mudar a meta é uma decisão difícil mas honesta." AD +1, DN 0, IM +1.

---

## 3. Antes dos jogos

### IMP-010 — Derbi
**Quando:** jogo contra {rival} (rivalidade 2 ou 3). **Jornalista:** imprensa local.
**Pergunta:** "É o derbi. O que significa este jogo para o clube?"
- **A (emotiva):** "Significa tudo para esta cidade. Jogamos por quem está nas bancadas." AD +2, EQ +1, BL +1.
- **B (comedida):** "É um jogo de três pontos, como os outros. O ambiente é especial, mas mantemos a cabeça fria." AD 0, EQ +1, TR +1.
- **C (provocadora):** "Eles falam muito, nós jogamos. Vemos no domingo quem ri." AD +1, EQ +1, IM −1. Aumenta a intensidade do jogo (rivalidade +1 por este jogo).

### IMP-011 — Jogo contra um grande
**Quando:** o adversário tem reputação muito acima. **Jornalista:** imprensa nacional.
**Pergunta:** "O {adversario} chega como grande favorito. Têm alguma hipótese?"
- **A (confiante):** "No futebol tudo é possível. Vamos ao campo para ganhar." AD +1, EQ +1.
- **B (humilde):** "Reconheço que eles são melhores no papel, mas já houve surpresas e queremos provocar mais uma." AD +1, IM +1.
- **C (descontraída):** "Se calhar, a pressão está toda do lado deles. Nós só temos a ganhar." EQ +1, AD 0.

### IMP-012 — Final
**Quando:** véspera de uma final (taça ou continental). **Jornalista:** imprensa desportiva.
**Pergunta:** "Uma final decide épocas inteiras. Como estão os nervos no balneário?"
- **A (calma):** "Estão tranquilos. Já passámos por muita coisa, e este grupo sabe lidar com a pressão." EQ +1, TR +1.
- **B (honesta):** "Há ansiedade, claro. É normal numa final. O importante é transformá-la em energia." EQ 0, IM +1.
- **C (ambiciosa):** "Estamos aqui para ganhar o troféu. Não viemos passear." AD +2, EQ +1, PROMESSA (ganhar a final).

### IMP-013 — Jogo logo a seguir a uma eliminação
**Quando:** primeiro jogo depois de uma eliminação numa taça ou competição continental. **Jornalista:** imprensa local.
**Pergunta:** "A eliminação foi dura. O grupo está preparado para reagir já no próximo jogo?"
- **A (confiante):** "Está. Os jogadores já viraram a página. A resposta vai dar-se no campo." EQ +1, AD +1.
- **B (admitindo):** "A pancada foi grande e não vou fingir o contrário. Mas temos de nos levantar." EQ 0, IM +1.
- **C (evasiva):** "Prefiro não falar do jogo anterior. Está esquecido." AD −1, IM −1.

### IMP-014 — Jogo após pausa internacional
**Quando:** primeira jornada depois de uma pausa FIFA com jogadores lesionados ou cansados. **Jornalista:** imprensa desportiva.
**Pergunta:** "Voltou com vários jogadores lesionados da selecção. Isso é um problema para o clube?"
- **A (crítica):** "É sempre um risco. Gostava que as selecções respeitassem mais os clubes que pagam os salários." IM −1, AD +1, BL −1 (jogadores).
- **B (diplomática):** "Faz parte do jogo. Temos um plantel largo e confiamos em quem está disponível." IM +1, BL +1.
- **C (humorística):** "Os jogadores adoram os clubes e as selecções. Eu adoro quando regressam inteiros." IM +1, AD 0.

---

## 4. Depois de vitórias

### IMP-015 — Goleada
**Quando:** vitória por 4 ou mais golos de diferença. **Jornalista:** canal do clube.
**Pergunta:** "Foi uma exibição imponente. Qual foi a chave da noite?"
- **A (colectiva):** "O grupo. Todos fizeram a sua parte e o resultado reflecte isso." EQ +1, BL +1.
- **B (comedida):** "Foi um bom resultado, mas não vamos entusiasmar. O próximo jogo é outro desafio." EQ 0, TR +1.
- **C (provocadora):** "Há quem dissesse que não tínhamos qualidade. Hoje o campo respondeu." AD +1, IM −1, EQ +1.

### IMP-016 — Vitória tardia
**Quando:** golo decisivo depois dos 85 minutos. **Jornalista:** imprensa local.
**Pergunta:** "O golo tardio salvou três pontos. Sente que a sorte esteve ao seu lado?"
- **A (humilde):** "Um pouco de sorte ajuda sempre. Mas persistimos até ao fim, e isso também conta." AD +1, EQ +1.
- **B (orgulhosa):** "Sorte não: carácter. Este grupo nunca desiste." AD +2, EQ +1, BL +1.
- **C (honesta):** "Reconheço que não jogámos bem. Mas ganhar sem jogar bem é uma qualidade de campeão." AD 0, IM +1, TR −1.

### IMP-017 — Sequência de vitórias
**Quando:** 5 vitórias seguidas. **Jornalista:** imprensa nacional.
**Pergunta:** "Cinco vitórias seguidas. Já podemos sonhar com mais do que o objectivo inicial?"
- **A (sonhadora):** "Sonhar é de graça, mas só se ganha o próximo jogo. Estamos a viver um bom momento." AD +2, EQ +1.
- **B (prudente):** "Tudo isso é prematuro. Vamos manter o foco e os pés assentes na terra." EQ +1, DN +1, TR +1.
- **C (firme):** "Sim, o novo objectivo é mais alto. Quero ver este grupo a lutar pelo título." AD +2, EQ +1, DN −1, PROMESSA (nova meta superior).

### IMP-018 — Título conquistado
**Quando:** o clube é campeão da liga ou da taça. **Jornalista:** todos.
**Pergunta:** "É campeão! Qual é o sentimento neste momento?"
- **A (emotiva):** "Não há palavras. É o culminar de um trabalho enorme e dedico-o a todos os adeptos." AD +3, EQ +2, DN +2, IM +1.
- **B (agradecida):** "Quero agradecer a toda a estrutura: treinador, jogadores, funcionários. Sem eles nada era possível." EQ +2, TR +2, BL +2.
- **C (ambiciosa):** "Estamos felizes, mas já pensamos no próximo. Um campeão não pode dormir." AD +2, DN +1, IM +1, PROMESSA (defender o título).

### IMP-019 — Vitória do clube pequeno contra um grande
**Quando:** clube de reputação baixa vence um grande. **Jornalista:** imprensa nacional.
**Pergunta:** "David bateu Golias. Foi o melhor dia da vossa época?"
- **A (orgulhosa):** "Foi um dia para recordar. Mostra que, com organização e vontade, tudo é possível." AD +2, EQ +2, IM +1.
- **B (modesta):** "Foi um bom dia, mas a época é longa. Não nos devemos deixar deslumbrar." EQ +1, TR +1.
- **C (provocadora):** "O mérito é todo nosso. Eles vieram cá com a mão no bolso e saíram sem pontos." AD +1, IM −1, EQ +1.

---

## 5. Depois de derrotas e empates

### IMP-020 — Derrota pesada
**Quando:** derrota por 3 ou mais golos de diferença. **Jornalista:** imprensa nacional.
**Pergunta:** "Foi uma derrota humilhante. Quem é o responsável?"
- **A (assumindo):** "Sou eu, em última instância. Assumo as falhas e vamos corrigi-las." AD +1, DN +1, EQ +1, TR +1.
- **B (colectiva):** "Falhámos todos. Esta noite doeu, mas o grupo vai responder." EQ +1, BL +1.
- **C (reactiva):** "Não vou procurar culpados. A análise faz-se internamente, não nos jornais." AD −1, IM −1.

### IMP-021 — Sequência negativa
**Quando:** 4 jogos sem vencer. **Jornalista:** imprensa local.
**Pergunta:** "Quatro jogos sem ganhar. O {treinador} está em risco?"
- **A (confiança):** "O treinador tem a minha confiança total. Nas más fases, é quando mais precisamos de estabilidade." TR +2, DN −1, AD −1 (aumenta a pressão sobre o treinador).
- **B (cautelosa):** "Estamos a analisar tudo, como em todas as fases. Não vou comentar situações individuais." TR 0, IM 0.
- **C (firme):** "Todos estão em avaliação, incluindo eu. Quem não render, sai." DN +1, TR −2, EQ −1, BL −1.

### IMP-022 — Derrota num derbi
**Quando:** derrota contra {rival}. **Jornalista:** blogue de adeptos.
**Pergunta:** "Perder o derbi é inaceitável. Os adeptos esperavam mais. O que lhes diz?"
- **A (humilde):** "Têm razão em estar zangados. Pedimos desculpa e prometemos trabalhar mais." AD +2, EQ −1.
- **B (equilibrada):** "Perdemos um jogo, não uma guerra. A época continua e vamos recuperar." AD 0, EQ 0, IM +1.
- **C (provocadora):** "Os adeptos que vêm cá sabem que o clube é maior do que um resultado." AD −1, EQ 0.

### IMP-023 — Empate com polémica de arbitragem
**Quando:** golo anulado ou penálti polémico num empate ou derrota. **Jornalista:** imprensa desportiva.
**Pergunta:** "O árbitro anulou um golo que parecia legal. Está indignado com a arbitragem?"
- **A (calma):** "Não comento arbitragem. O que posso dizer é que não fomos beneficiados." IM +1, EQ 0.
- **B (indignada):** "Foi uma decisão escandalosa. Vamos apresentar queixa formal." AD +1, EQ +1, IM −1. Risco de multa (probabilidade 30%).
- **C (irónica):** "Se calhar os árbitros também precisam de treinar mais, como os jogadores." AD +1, IM +1, risco de multa (probabilidade 15%).

### IMP-024 — Empate sem golos
**Quando:** 0-0 em casa. **Jornalista:** imprensa local.
**Pergunta:** "Foi um jogo sem emoção. Faltou ousadia?"
- **A (autocrítica):** "Concordo, faltou ousadia. Vamos trabalhar para o ataque ter mais ideias." AD +1, TR −1, EQ 0.
- **B (defendendo):** "O equilíbrio defensivo foi bom. O resultado foi justo para o que se viu." TR +1, AD −1.
- **C (humorística):** "A equipa estava tão focada em não sofrer que se esqueceu do outro lado." AD 0, IM +1.

---

## 6. Mercado e transferências

### IMP-025 — Rumor de saída da estrela
**Quando:** jogador com valor no top 3 do plantel tem proposta de outro clube. **Jornalista:** imprensa desportiva.
**Pergunta:** "O {jogador} tem uma oferta do {adversario}. Vai sair?"
- **A (firme):** "O {jogador} não está à venda. É uma peça fundamental no nosso projecto." AD +2, EQ +1, DN −1. Aumenta o preço pedido. Se vender depois, penaliza AD e DN (MENTIRA).
- **B (aberta):** "Se houver uma proposta à altura, o clube tem de a analisar. Todos têm um preço." AD −1, EQ −1, DN +1.
- **C (evasiva):** "Não comento rumores. Quando houver novidades, comunicamos." AD 0, IM −1.

### IMP-026 — Contratação cara
**Quando:** contratação acima de 20% do orçamento de transferências. **Jornalista:** imprensa nacional.
**Pergunta:** "{valor} milhões por {jogador}. Não é um valor excessivo?"
- **A (confiante):** "Não. É um investimento no futuro. Se olhar para a qualidade e para a idade, é um negócio que se paga." AD +1, DN +1, EQ +1.
- **B (defensiva):** "O mercado está inflacionado, mas só se contrata quem se quer. O {jogador} era a prioridade." AD 0, DN 0, IM 0.
- **C (provocadora):** "Se acha caro, venha negociar no meu lugar." IM −1, AD 0, EQ +1.

### IMP-027 — Falta de reforços
**Quando:** última semana da janela e orçamento de transferências por usar, ou posição sem cobertura. **Jornalista:** blogue de adeptos.
**Pergunta:** "A janela fecha e o plantel continua curto na posição de {posicao}. Os adeptos sentem-se enganados?"
- **A (honesta):** "Entendo a frustração. Tentámos, mas o mercado não ajudou. Vamos confiar nos que cá estão." AD −1, IM +1.
- **B (compromisso):** "Estamos a trabalhar até ao último minuto. Pode ainda haver surpresas." AD +1, PROMESSA (reforço até ao fecho da janela).
- **C (ofensiva):** "Os adeptos têm direito de opinar, mas quem gere o clube sou eu." AD −2, DN +1.

### IMP-028 — Venda de um ídolo
**Quando:** venda do jogador mais querido (capitão ou ídolo). **Jornalista:** imprensa local.
**Pergunta:** "Vendeu o {jogador}, símbolo do clube. Traiu os adeptos?"
- **A (justificando):** "Foi uma decisão difícil, mas necessária para a sustentabilidade do clube. Os adeptos vão perceber." AD −1, DN +2, IM 0.
- **B (emocional):** "Foi doloroso. O {jogador} sai com a nossa gratidão eterna, e a porta está sempre aberta." AD +1, DN +1, BL +1.
- **C (firme):** "Não tomo decisões para agradar. Tomo-as pelo que é melhor para o clube." AD −2, DN +1, IM −1.

### IMP-029 — Último dia da janela
**Quando:** último dia da janela. **Jornalista:** imprensa desportiva.
**Pergunta:** "Estamos nas últimas horas. Há algum negócio na calha?"
- **A (misteriosa):** "Há conversas, mas nada garantido. Vamos ver até ao último minuto." AD +1, IM +1.
- **B (directa):** "Não. O plantel está fechado, e confio nele." AD 0, EQ +1, TR +1.
- **C (provocadora):** "Os adversários que estejam atentos. Podemos fazer barulho." AD +1, IM 0.

### IMP-030 — Jogador livre
**Quando:** contratação de um jogador livre (sem custo de transferência) ou jogador veterano. **Jornalista:** imprensa nacional.
**Pergunta:** "Contratou um jogador aos {idade} anos. É uma aposta de risco?"
- **A (confiante):** "A experiência é valiosa, e o jogador tem muito para dar. Não é risco, é equilíbrio." AD +1, BL +1, TR +1.
- **B (cuidadosa):** "É uma opção com baixo custo e potencial alto. Se não correr bem, o prejuízo é pequeno." DN +1, AD 0.
- **C (irónica):** "A idade é só um número, e os números não correm. Os jogadores sim." IM +1, AD +1.

---

## 7. Treinador

### IMP-031 — Voto de confiança
**Quando:** pressão sobre o treinador (3 jogos sem vencer e rumores de despedimento). **Jornalista:** imprensa nacional.
**Pergunta:** "Garante que o {treinador} continua?"
- **A (garantia):** "Garanto. Tem a nossa confiança total." TR +2, EQ +1, AD −1, PROMESSA (manter o treinador; se despedir nos próximos 30 dias: MENTIRA, DN −2, IM −2, BL −1).
- **B (prudente):** "Não faço garantias. Avaliamos o trabalho em cada momento." TR −1, EQ −1, IM +1.
- **C (firme):** "Ninguém tem a vida garantida no futebol. Nem ele, nem eu." TR −1, DN +1, AD 0.

### IMP-032 — Despedimento do treinador
**Quando:** despedimento do treinador. **Jornalista:** imprensa nacional.
**Pergunta:** "Despediu o {treinador}. Como justifica a decisão?"
- **A (respeitosa):** "É uma decisão difícil. Agradeço-lhe o trabalho, mas era preciso mudar o rumo." AD 0, IM +1, TR +1 (reputação junto de outros treinadores).
- **B (directa):** "Os resultados falaram. O clube precisa de resultados, e foi essa a razão." AD +1, DN +1, TR −1 (reputação).
- **C (reservada):** "Prefiro não entrar em pormenores. É uma decisão interna." IM −1, AD 0.

### IMP-033 — Apresentação do novo treinador
**Quando:** contratação de novo treinador. **Jornalista:** imprensa local.
**Pergunta:** "Porquê o {treinador}? Que perfil procuravam?"
- **A (filosofia):** "Procurávamos um treinador que se alinhasse com a nossa filosofia, e ele encaixa perfeitamente." AD +1, DN +1, TR +1.
- **B (resultados):** "Procurávamos resultados. E os resultados do {treinador} falam por si." AD +1, IM +1.
- **C (honesta):** "Era a opção possível dentro do nosso orçamento, e estamos confiantes." AD −1, TR −1, DN +1.

### IMP-034 — Conflito de filosofia
**Quando:** filosofia do clube (ex.: jovens) contraria o estilo do treinador. **Jornalista:** imprensa desportiva.
**Pergunta:** "Corre que o treinador não quer apostar nos jovens, ao contrário do que o clube defende. Há tensão?"
- **A (negar):** "Nenhuma. Estamos todos alinhados." TR +1, IM −1. MENTIRA se a tensão for pública.
- **B (reconhecer):** "Há debate saudável. Mas o rumo é do clube, e ele vai cumpri-lo." TR −1, DN +1, AD +1.
- **C (dividir):** "Discordamos em algumas coisas, mas respeitamo-nos. Vamos chegar a um meio-termo." TR 0, EQ 0, IM +1.

### IMP-035 — Renovação do treinador
**Quando:** treinador com bons resultados e contrato a terminar. **Jornalista:** imprensa local.
**Pergunta:** "O contrato do {treinador} acaba no fim da época. Vão renovar?"
- **A (comprometida):** "Quero renovar e já estamos em conversas. É uma peça fundamental." TR +2, AD +1, EQ +1.
- **B (cautelosa):** "Há tempo para tudo. Primeiro, concentração na época." TR 0, IM 0.
- **C (negociadora):** "Quem tem sucesso aumenta o seu preço. Veremos o que o clube pode oferecer." TR −1, DN +1.

---

## 8. Finanças, dono e fair play

### IMP-036 — Dívida elevada
**Quando:** dívida acima de um limiar (config). **Jornalista:** imprensa económica.
**Pergunta:** "A dívida do clube cresceu. Qual é o plano para a reduzir?"
- **A (transparente):** "Temos um plano de amortização e vamos publicar os números. A dívida é gerível." AD +1, DN +1, IM +1. PROMESSA (reduzir a dívida).
- **B (minimizando):** "A dívida está dentro do normal para um clube do nosso tamanho. Não há motivo para alarme." AD 0, IM −1. MENTIRA se o estado financeiro for "crise".
- **C (ofensiva):** "A dívida é consequência de más gestões passadas. Estou a resolver o que me deixaram." DN −1, IM 0, AD +1 (se o dono anterior era impopular).

### IMP-037 — Sanção de fair play
**Quando:** o clube é sancionado por fair play financeiro. **Jornalista:** imprensa nacional.
**Pergunta:** "O clube foi sancionado por violar o fair play. Como é que isto aconteceu?"
- **A (assumindo):** "Assumimos o erro e vamos cumprir a sanção. Já ajustámos a política salarial." DN +1, IM +1, AD 0.
- **B (contestando):** "Discordamos da leitura das regras e vamos recorrer." AD +1, DN 0, IM −1.
- **C (relativizando):** "Todos os clubes grandes são multados. É o preço de competir." AD +1, DN −1, IM −1.

### IMP-038 — Injecção de capital do dono
**Quando:** o dono injectou capital ou emprestou dinheiro ao clube. **Jornalista:** imprensa local.
**Pergunta:** "O dono voltou a pôr dinheiro no clube. É sustentável depender dele?"
- **A (agradecida):** "O dono acredita no projecto, e é graças a ele que temos condições. Mas queremos ser autossustentáveis." DN +2, AD +1.
- **B (realista):** "Não é o ideal. Estamos a trabalhar para equilibrar receitas e despesas." DN −1, IM +1.
- **C (evasiva):** "Não comento negócios entre accionistas." IM −1, DN 0.

### IMP-039 — Rumores de venda do clube
**Quando:** modo DONO com satisfação dos adeptos baixa (crise) ou investidor interessado. **Jornalista:** imprensa nacional.
**Pergunta:** "Corre que investidores estão interessados em comprar o clube. Está disposto a vender?"
- **A (firme):** "O clube não está à venda. Quero continuar o projecto." AD +2, DN −1. PROMESSA (não vender nesta época; se vender: MENTIRA, AD −3).
- **B (aberta):** "Se aparecer uma proposta boa para o clube, eu ouço. Mas não vendo por vender." AD 0, IM +1.
- **C (ambígua):** "Neste momento não há nada. O futuro logo se vê." AD −1, IM 0.

### IMP-040 — Patrocinador a sair
**Quando:** patrocinador principal rescinde ou não renova. **Jornalista:** imprensa económica.
**Pergunta:** "O principal patrocinador abandona o clube. Isso é um sinal de crise?"
- **A (calma):** "Não. Há muito interesse de outras marcas, e vamos encontrar uma solução." DN +1, IM +1.
- **B (honesta):** "É um golpe, não nego. Mas o clube é maior do que um patrocinador." AD +1, IM +1, DN 0.
- **C (recriminadora):** "Quem sai agora não merece voltar. Os adeptos sabem quem esteve ao nosso lado." AD +1, IM −1.

### IMP-041 — Resultados financeiros anuais
**Quando:** fecho do ano financeiro. **Jornalista:** imprensa económica.
**Pergunta:** "As contas anuais saíram. {clube} teve {lucro_ou_prejuizo}. Como as analisa?"
- **A (satisfeita):** "Estamos no caminho certo. Os resultados reflectem a disciplina da gestão." DN +1, IM +1.
- **B (autocrítica):** "Podíamos ter feito melhor, e vamos corrigir. A sustentabilidade é uma prioridade." DN +1, AD +1.
- **C (distraída):** "As contas são só um instrumento. O que conta é o que acontece em campo." IM −1, DN −1.

---

## 9. Jogadores, balneário e academia

### IMP-042 — Lesão grave de uma estrela
**Quando:** lesão grave (acima de 3 meses) de um titular importante. **Jornalista:** imprensa desportiva.
**Pergunta:** "A lesão do {jogador} é um golpe. Como vai compensar a ausência?"
- **A (confiante):** "Temos um grupo forte, e outros vão assumir esse papel. Vamos suportar a ausência." EQ +1, BL +1.
- **B (realista):** "É uma perda enorme, e não vamos encontrar um substituto igual. Vamos olhar para o mercado." AD 0, IM +1.
- **C (solidária):** "O {jogador} vai ter todo o apoio do clube durante a recuperação. Está em primeiro lugar." EQ +1, BL +2.

### IMP-043 — Jogador descontente
**Quando:** jogador titular ou ex-titular com moral baixa, pediu para sair. **Jornalista:** imprensa desportiva.
**Pergunta:** "O {jogador} não está feliz e quer sair. O que vai fazer?"
- **A (firme):** "Tem contrato e vai cumpri-lo. Aqui não se trocam jogadores por birras." AD +1, BL −1, EQ −1, DN +1. Jogador mantém-se descontente (moral continua baixa).
- **B (dialogante):** "Vamos falar com ele e perceber os motivos. Todos têm direito a ser ouvidos." BL +1, EQ +1, AD 0.
- **C (aberta):** "Se for o desejo dele e a proposta for justa, avaliamos a saída." BL +1 (do jogador), AD −1, DN +1. Abre a porta a negociações.

### IMP-044 — Promoção de um jovem da academia
**Quando:** jovem sub-18 ou sub-21 promovido à equipa principal com bom rendimento. **Jornalista:** blogue de adeptos.
**Pergunta:** "O {jovem} brilhou. A academia vai ser a base do futuro do clube?"
- **A (orgulhosa):** "A academia é o nosso orgulho. Vamos continuar a investir nela e a dar oportunidades." AD +2, DN +1, BL +1.
- **B (cuidadosa):** "É cedo para o dizer. O {jovem} tem talento, mas tem de continuar a crescer." AD 0, IM +1.
- **C (comercial):** "Um jovem que brilha também atrai olhares. Estamos atentos ao valor de mercado." AD −1, DN +1.

### IMP-045 — Indisciplina
**Quando:** jogador expulso ou com polémica fora de campo. **Jornalista:** imprensa nacional.
**Pergunta:** "O {jogador} foi expulso/envolveu-se em polémica. Que medidas vão tomar?"
- **A (rigorosa):** "Haverá sanção interna. Ninguém está acima do clube." BL −1, EQ −1, AD +1, DN +1.
- **B (compreensiva):** "Foi um deslize isolado e vamos falar com ele. Conhecemos o carácter do jogador." BL +1, IM −1.
- **C (silenciosa):** "Assuntos internos tratam-se internamente. Não vou comentar mais." IM −1, AD 0.

### IMP-046 — Capitão e liderança
**Quando:** o {capitao} tem moral baixa ou forma má. **Jornalista:** imprensa local.
**Pergunta:** "O capitão {capitao} tem estado abaixo do esperado. Mantém-lhe a braçadeira?"
- **A (confiante):** "Mantenho. A liderança não se mede só pelos golos, e ele continua a ser uma referência." BL +1, EQ +1.
- **B (exigente):** "A braçadeira exige exemplo. Se não melhorar, teremos de reavaliar." EQ −1, BL −1.
- **C (protectora):** "Os jogadores passam por fases, e o capitão tem todo o meu apoio." BL +1, AD −1.

### IMP-047 — Cláusula de rescisão
**Quando:** jogador com cláusula de rescisão activada por outro clube. **Jornalista:** imprensa desportiva.
**Pergunta:** "O {adversario} pagou a cláusula de rescisão do {jogador}. Estão impotentes?"
- **A (resignada):** "A cláusula existe para isto. É um direito do jogador, e vamos usar o dinheiro de forma inteligente." DN +1, AD −1.
- **B (queixosa):** "É um valor muito abaixo do que ele vale. Foi um erro negociá-la naquele patamar." AD −1, DN −1, IM +1.
- **C (orgulhosa):** "Formámos um jogador que vale tanto dinheiro. Isso é uma vitória do clube." AD +1, DN +1.

---

## 10. Adeptos, estádio e infraestruturas

### IMP-048 — Preço dos bilhetes
**Quando:** o clube subiu os preços dos bilhetes ou das quotas. **Jornalista:** blogue de adeptos.
**Pergunta:** "Os bilhetes subiram. Os adeptos já pagam muito. Isso é justo?"
- **A (justificando):** "Os custos subiram e queremos manter a qualidade do plantel. Acreditamos que vale a pena." AD −2, DN +1.
- **B (compensando):** "Percebemos a revolta. Vamos criar descontos para jovens e sócios históricos." AD 0, DN 0, IM +1.
- **C (recuando):** "Ouvimos e vamos baixar os preços." AD +2, DN −1.

### IMP-049 — Protestos dos adeptos
**Quando:** modo DONO com satisfação dos adeptos abaixo de 40. **Jornalista:** imprensa nacional.
**Pergunta:** "Os adeptos protestaram à porta do estádio. Entende o descontentamento?"
- **A (compreensiva):** "Entendo, e peço desculpa pelo sofrimento. Vou ouvir uma delegação de adeptos esta semana." AD +2, DN +1. PROMESSA (reunião em 7 dias).
- **B (firme):** "Entendo, mas protestar à porta não ajuda ninguém. O diálogo é a via." AD −1, IM +1.
- **C (provocadora):** "Os adeptos que protestam são uma minoria. A grande maioria apoia-nos." AD −3, DN 0, IM −1.

### IMP-050 — Obras no estádio
**Quando:** obra de infraestrutura concluída ou anunciada. **Jornalista:** imprensa local.
**Pergunta:** "As obras no {estadio} avançaram. O que vão ganhar os adeptos?"
- **A (entusiasmada):** "Mais conforto, mais capacidade e mais ambiente. Vai ser uma casa à altura do clube." AD +2, DN +1.
- **B (cautelosa):** "As obras trazem incómodos, mas o resultado final compensa. Pedimos paciência." AD 0, IM +1.
- **C (comercial):** "É também um investimento: mais capacidade significa mais receitas e mais competitividade." DN +2, AD +1.

### IMP-051 — Estádio vazio
**Quando:** ocupação do estádio abaixo de 60% durante três jogos. **Jornalista:** imprensa desportiva.
**Pergunta:** "O estádio está meio vazio. Os adeptos desistiram do clube?"
- **A (compreensiva):** "Não desistiram. Estão desiludidos, e é a nós que cabe reconquistá-los com resultados." AD +1, DN +1.
- **B (apelativa):** "Peço a todos que venham apoiar. Os jogadores precisam do vosso calor." AD +1, EQ +1.
- **C (ofendida):** "Os adeptos de verdade estão connosco, e os outros não fazem falta." AD −3, IM −1.

---

## 11. Competições continentais e selecções

### IMP-052 — Sorteio continental
**Quando:** sorteio da fase de liga ou de eliminatórias. **Jornalista:** imprensa nacional.
**Pergunta:** "O sorteio colocou-vos {adversario}. É um sorteio difícil?"
- **A (confiante):** "Contra os melhores é que se mede a nossa capacidade. Estamos prontos." AD +1, EQ +1.
- **B (realista):** "É um sorteio duro. Mas ninguém disse que seria fácil." IM +1, EQ 0.
- **C (descontraída):** "Preferíamos outro, mas não escolhemos. Vamos dar o nosso melhor." AD 0, IM 0.

### IMP-053 — Qualificação para a competição europeia
**Quando:** o clube garante uma vaga europeia (Champions, Liga Europa ou Conferência). **Jornalista:** imprensa local.
**Pergunta:** "O clube vai jogar na Europa. Qual é o objectivo na competição?"
- **A (ambiciosa):** "Passar a fase de liga e fazer história. Temos qualidade para isso." AD +2, EQ +1, PROMESSA (passar a fase de liga).
- **B (prudente):** "Primeiro, experiência. Queremos competir e aprender com os melhores." AD 0, DN +1.
- **C (financeira):** "Cada jogo europeu traz receitas importantes. É uma oportunidade para a saúde financeira do clube." DN +2, AD 0.

### IMP-054 — Eliminação europeia
**Quando:** eliminação numa competição continental. **Jornalista:** imprensa nacional.
**Pergunta:** "O clube ficou pelo caminho na Europa. Foi uma desilusão?"
- **A (autocrítica):** "Sim, esperávamos mais. Mas aprendemos, e a experiência vai servir no futuro." AD 0, IM +1, EQ 0.
- **B (positiva):** "Honrámos o clube e os adeptos. Competimos com os melhores, e isso conta." AD +1, EQ +1.
- **C (crítica):** "A eliminação mostra que o plantel é curto. É preciso reforçar nas próximas janelas." AD +1, DN −1, TR −1.

### IMP-055 — Convocatórias das selecções
**Quando:** vários jogadores do plantel são convocados. **Jornalista:** imprensa desportiva.
**Pergunta:** "Seis jogadores seus foram convocados. Orgulho ou preocupação com o desgaste?"
- **A (orgulho):** "Orgulho. É o reconhecimento do trabalho que fazem aqui, e é bom para o clube." AD +1, BL +1.
- **B (preocupação):** "Orgulho e preocupação em partes iguais. Os minutos pesam, e quero os jogadores inteiros." AD 0, IM +1.
- **C (crítica):** "As selecções deviam pagar os salários se querem usar os jogadores tantos dias." AD +1, IM −1, BL −1.

---

## 12. Fim de época e rescaldo

### IMP-056 — Balanço da época (objectivo cumprido)
**Quando:** fim de época com o objectivo cumprido. **Jornalista:** imprensa local.
**Pergunta:** "A época terminou com o objectivo cumprido. Que balanço faz?"
- **A (satisfeita):** "Muito positivo. O grupo trabalhou, e os resultados chegaram. Mas queremos mais." AD +2, DN +2, EQ +1.
- **B (modesta):** "Foi uma boa época, com margem para crescer. Não vamos descansar." AD +1, DN +1.
- **C (ambiciosa):** "Cumprimos, mas o próximo objectivo já é mais alto. Quero lutar por outro patamar." AD +1, DN 0, PROMESSA (meta superior na próxima época).

### IMP-057 — Balanço da época (objectivo falhado)
**Quando:** fim de época com o objectivo falhado. **Jornalista:** imprensa nacional.
**Pergunta:** "Falharam o objectivo. Quem é o responsável?"
- **A (assumindo):** "Sou o primeiro responsável. Assumo a falha e vou trabalhar para corrigir." AD +1, DN 0, IM +1.
- **B (colectiva):** "Falhámos todos, do plantel à direcção. Temos de aprender e reerguer." AD 0, BL +1.
- **C (defensiva):** "As lesões e a falta de sorte ajudaram. Mas assumo o resultado final." AD −1, IM −1, DN −1.

### IMP-058 — Descida
**Quando:** o clube desce de divisão. **Jornalista:** todos.
**Pergunta:** "O {clube} desceu. É o pior momento da história recente?"
- **A (humilde):** "É um dos momentos mais tristes. Peço desculpa aos adeptos e prometo trabalhar para voltar." AD +2, DN +1, IM +1.
- **B (digna):** "É doloroso, mas o clube é maior do que uma descida. Vamos levantar a cabeça." AD +1, EQ +1.
- **C (silenciosa):** "Não tenho palavras. Prefiro falar com os adeptos num outro momento." AD −2, IM −2.

### IMP-059 — Subida
**Quando:** o clube sobe de divisão. **Jornalista:** todos.
**Pergunta:** "O {clube} voltou! O que significa esta subida?"
- **A (emotiva):** "É a recompensa de um trabalho enorme, e a festa é de todos os adeptos." AD +3, EQ +2, DN +1.
- **B (focada):** "Estamos felizes, mas o trabalho não acabou. O próximo nível exige muito mais." AD +1, DN +1, EQ +1.
- **C (ambiciosa):** "Subimos para ficar e para lutar por mais. Não vamos ser figuras de corpo presente." AD +2, EQ +1, PROMESSA (metade superior da tabela).

---

## 13. Clubes e contextos específicos

### IMP-060 — Clube de adeptos (tipo 50+1)
**Quando:** o clube pertence aos sócios. **Jornalista:** blogue de adeptos.
**Pergunta:** "O clube é dos sócios. Como equilibra os desejos deles com as realidades financeiras?"
- **A (democrática):** "Ouvindo-os sempre, mas explicando os números. Os sócios merecem transparência." AD +2, DN +1.
- **B (pragmática):** "Os sócios elegem a direcção para decidir, não para gerir todos os pormenores." AD −1, DN +1, IM +1.
- **C (aberta):** "Vamos fazer mais assembleias e consultas. A voz dos sócios é o nosso maior activo." AD +2, DN 0, PROMESSA (assembleia aberta).

### IMP-061 — Clube de dono bilionário
**Quando:** o dono é do tipo bilionário ou fundo estatal. **Jornalista:** imprensa estrangeira.
**Pergunta:** "O clube tem um dono muito rico. Isso torna a competição injusta para os outros?"
- **A (defensiva):** "O dinheiro ajuda, mas não ganha jogos sozinho. Trabalhamos com as mesmas regras que os outros." IM +1, AD +1.
- **B (compreensiva):** "Percebo a crítica. Mas investimento significa emprego, infraestruturas e desenvolvimento do futebol." DN +1, IM +1.
- **C (irónica):** "Se o dinheiro ganhasse sozinho, os jogos nem precisavam de ser disputados." IM −1, AD +1.

### IMP-062 — Clube formador
**Quando:** arquétipo formador, com muitos jovens no plantel. **Jornalista:** imprensa desportiva.
**Pergunta:** "Apostam muito nos jovens. Isso não limita a ambição de ganhar?"
- **A (convicta):** "Não. Os jovens também ganham jogos, e dão-nos identidade e futuro." AD +1, DN +1, TR +1.
- **B (equilibrada):** "Misturamos jovens e experiência. O equilíbrio é a chave." AD 0, EQ +1.
- **C (provocadora):** "Os jovens mostram mais vontade do que muitos que ganham dez vezes mais." AD +1, BL −1, IM +1.

### IMP-063 — Clube em administração
**Quando:** clube em administração por insolvência. **Jornalista:** imprensa nacional.
**Pergunta:** "O clube está em administração. Ainda há esperança?"
- **A (esperançosa):** "Há. Estamos a trabalhar num plano de recuperação e vamos sair desta situação." AD +1, DN +1, PROMESSA (recuperação em 2 épocas).
- **B (realista):** "É difícil, e vamos precisar de sacrifícios de todos. Mas o clube resiste." AD 0, IM +1.
- **C (ofensiva):** "Não entro em jogos de culpas. O que interessa é salvar o clube." AD −1, DN 0.

### IMP-064 — Rivalidade entre vizinhos
**Quando:** clube tem rival na mesma cidade ou região. **Jornalista:** imprensa local.
**Pergunta:** "A cidade está dividida. Que mensagem deixa aos adeptos rivais?"
- **A (cordial):** "Rivalidade, sim, violência, nunca. Que o futebol una em vez de dividir." AD +1, IM +1.
- **B (competitiva):** "Eles são adversários, não inimigos. Mas queremos ganhar-lhes sempre." AD +1, EQ +1.
- **C (provocadora):** "Os adeptos deles sabem o que esperar. A cidade é nossa." AD +2, IM −2, EQ +1. Aumenta a intensidade do próximo derbi.

---

## 14. Perguntas curtas, de curiosidade e de memória

### IMP-065 — Pergunta "inocente" sobre estilo de jogo
**Quando:** qualquer momento calmo. **Jornalista:** imprensa desportiva.
**Pergunta:** "Que estilo de jogo quer ver neste clube?"
- **A (ofensivo):** "Futebol ofensivo, com posse e golos. É assim que se conquistam adeptos." AD +1, EQ +1, TR +1 se o treinador for ofensivo (−1 se defensivo).
- **B (pragmático):** "O que dá resultados. O estilo é um meio, não um fim." DN +1, TR +1 se o treinador for pragmático.
- **C (equilibrado):** "Um jogo organizado, adaptado ao adversário. Sem dogmas." IM +1, TR 0.

### IMP-066 — Promessa do passado
**Quando:** existe uma promessa registada (PROMESSA) por cumprir ou cumprida. **Jornalista:** o mesmo que recebeu a promessa original.
**Pergunta:** "Há uns meses prometeu {promessa}. Como está esse compromisso?"
- **A (cumprida):** "Cumprimos, como disse. E vamos continuar a cumprir." AD +2, DN +1, IM +1 (só disponível se cumprida).
- **B (em curso):** "Estamos a caminho. Falta um pouco, mas vamos chegar lá." AD 0, IM +1 (só disponível se estiver em curso e com prazo ainda por terminar).
- **C (desculpa):** "As circunstâncias mudaram. Prometer é fácil, mas o futebol é imprevisível." AD −2, DN −1, IM −1 (só disponível se falhada).

### IMP-067 — Pergunta pessoal
**Quando:** qualquer momento calmo (cooldown alto). **Jornalista:** imprensa nacional.
**Pergunta:** "Fora do futebol, o que faz para desligar?"
- **A (pessoal):** "Estar com a família e ler. É importante ter um refúgio longe dos relvados." IM +1, AD 0.
- **B (humorística):** "Desligar? Esse verbo não existe na minha vida. Ando sempre a pensar em reforços." IM +1, AD +1.
- **C (reservada):** "Prefiro manter a vida privada fora dos jornais." IM 0, AD 0.

### IMP-068 — Pergunta de imprensa estrangeira
**Quando:** clube com reputação acima de 70 ou com jogador estrangeiro de topo. **Jornalista:** imprensa estrangeira.
**Pergunta:** "Fora do país, {clube} é visto como um clube em crescimento. Concorda?"
- **A (orgulhosa):** "Fico feliz. Trabalhamos para que o clube seja reconhecido além-fronteiras." AD +1, DN +1, IM +2.
- **B (modesta):** "Ainda há muito caminho por fazer. Não nos queremos deslumbrar." AD 0, IM +1.
- **C (comercial):** "É importante para a marca e para os patrocínios. O crescimento internacional faz parte do plano." DN +2, IM +1, AD 0.

### IMP-069 — Pergunta sobre rivalidade com um treinador adversário
**Quando:** o treinador adversário fez uma crítica pública. **Jornalista:** imprensa desportiva.
**Pergunta:** "O treinador do {adversario} disse que {clube} joga um futebol feio. Responde?"
- **A (educada):** "Respeito a opinião dele, mas os resultados mostram que o nosso modelo funciona." IM +1, TR +1.
- **B (afiada):** "Quem vive de vidro não deve atirar pedras. Que olhe para a classificação dele." AD +1, IM −1, TR +1.
- **C (ignorando):** "Não respondo a provocações. Concentro-me no meu trabalho." IM +1, AD 0.

### IMP-070 — Fim de ciclo
**Quando:** o utilizador está há 5 ou mais épocas no clube. **Jornalista:** imprensa nacional.
**Pergunta:** "Está há muito tempo no clube. Já se vê a sair, ou o ciclo continua?"
- **A (comprometida):** "O meu projecto aqui ainda não acabou. Há muito para construir." AD +2, DN +1.
- **B (aberta):** "Ninguém é eterno. Quando sentir que é altura, serei o primeiro a saber." AD −1, DN 0, IM +1. Aumenta a probabilidade de propostas de outros clubes (modo DIR).
- **C (provocadora):** "Se me quiserem despedir, que o façam. Mas vão ter de explicar aos adeptos." AD +1, DN −2, IM −1.

---

## Notas finais para o Code

- Contagem: 70 perguntas, cada uma com 3 respostas (210 respostas). Cobrem 14 contextos: apresentação, objectivos, pré-jogo, vitórias, derrotas e empates, mercado, treinador, finanças e dono, jogadores e academia, adeptos e estádio, competições continentais e selecções, fim de época, contextos de clube e perguntas curtas.
- Todos os efeitos e probabilidades de multa ficam em config. Os textos em português de Portugal, com as variáveis acima.
- Para cada pergunta, o motor só deve mostrar as opções cujo gatilho se cumpra (ex.: a opção C de IMP-066 só aparece se a promessa tiver falhado). Se uma pergunta tiver menos de 3 opções disponíveis, não a escolher.
- As respostas de risco (MENTIRA e PROMESSA) devem ficar registadas num histórico de imprensa visível no ecrã Clube e dono (Prompt 5), com a data, o texto escolhido e o estado (pendente, cumprida, falhada).
- Para variar, o motor pode rodar a ordem das opções A, B e C dentro de cada pergunta.
- Se faltarem perguntas para algum contexto (por exemplo, um clube específico de uma liga), acrescentar perguntas locais no pacote de dados do país, com o mesmo formato.
