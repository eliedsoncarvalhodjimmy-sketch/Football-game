# Decisões (FutCEO)

Registo das escolhas feitas perante ambiguidade, e das decisões do utilizador. Cada uma pode ser revista.

## Decisões do utilizador (validação da Paragem 1)

- **U1.** Tabela de 924 clubes aprovada **só para teste**.
- **U2.** Argentina e MLS: uma volta (29 jornadas) + **play-off de campeão com os 8 primeiros**.
- **U3.** Ligas pequenas (10–12 equipas): **duas voltas**.
- **U4.** Quotas europeias (grupos A/B/C) aprovadas **provisoriamente**, até chegarem os documentos de vagas.
- **U5.** Eerste Divisie: **sem descidas**, como na realidade.
- **U6.** MLS joga **Agosto–Maio já em 2026/27**.
- **U7.** **Todas as ligas** (incluindo as de calendário anual: Brasil, Argentina, Colômbia, Uruguai, Equador, Coreia, Noruega, Suécia, MLS) jogam **Agosto–Maio desde 2026/27**, no teste e no jogo real (resolve a pendência 4).
- **U8.** Índice de riqueza e reputações: virá um documento do utilizador. Até lá usam-se os valores provisórios do plano.

## Decisões tomadas por mim

1. **Sem pré-eliminatórias europeias.** Quem na UEFA real entraria numa pré-eliminatória passa para a competição seguinte. Mantém o total real de vagas dos 8 grandes e fecha as 104 vagas sem défice.
2. **Vagas de desempenho UEFA (EPS) desligadas.**
3. **Play-offs internos** a jogo único em casa do melhor classificado, final neutra; **barragens entre divisões** a duas mãos.
4. **Equipas B / "Jong" / U23** não existem nesta fase; todos os clubes podem subir.
5. **Motor determinístico por jogo**: cada stream de RNG deriva de hash(semente, etiquetas), não da ordem de simulação.
6. **Sem framework de UI** (TypeScript simples no ecrã "Mundo").
7. **"Ligue 3"** para o 3.º escalão francês (renomeado em 2026/27).
8. **Liga africana**: duas voltas (46 jornadas), sem play-off de campeão (a resposta 2 falava de "ambas", entendida como Argentina e MLS).
9. **Um só modelo de calendário** ("ago_mai") para todas as ligas, em `src/config/calendario.ts`. Semana 0 = semana de 1 de Julho. Janelas de selecções aproximadas (semanas 10, 14, 19, 38): por confirmar.
10. **Fim de época**: última jornada a 22–23 Mai; finais das taças no fim-de-semana seguinte (semana 47); finais continentais na semana 48; play-offs de subida, barragens e play-off de campeão nas semanas 49–51 (Junho), para nunca chocarem com finais.
11. **Jornadas a meio da semana** (ligas com > 38 jornadas: Championship, League One, League Two, Segunda, liga africana) só em semanas sem continentais, sem taça e sem selecções. Há 11 dessas semanas; o máximo usado é 8.
12. **Sequências casa/fora**: máximo de 2 seguidas dentro de cada volta e 3 na passagem de volta (tabela de Berger com segunda volta espelhada).
13. **Bandas de reputação por liga** guardadas no próprio ficheiro da liga (`geracao.rep_tecto/rep_piso`), para que um país novo não exija mexer em código; sem esses campos usa-se uma fórmula sobre o índice de riqueza.
14. **Nomes fictícios**: gerados por sílabas próprias de cada língua, com lista de bloqueio de cidades reais conhecidas. Pode haver coincidências com localidades pequenas; os clubes ficam todos marcados `teste`.
15. **Força (Fase 1)**: `reputação × (0,85 + 0,15 × índice_liga/100)` com ruído próprio em ataque e defesa (σ = 3). A calibração dos golos vem na Paragem 3.
16. **Taças**: com 3 ou mais níveis, os dois mais baixos entram na 1.ª ronda e cada nível acima entra uma ronda depois; com 2 níveis, o 2.º entra na 1.ª ronda e o 1.º na 2.ª. A taça é sempre a jogo único, com final neutra.

## Paragem 3 (simulação)

17. **Golos esperados pela diferença de força**, não pela razão: `xG = base × exp(gama × (ataque − defesa adversária)) × casa`. Com a razão, as ligas de reputação baixa ficavam muito mais desiguais (últimos com 0 pontos). Valores calibrados em `config/simulacao.ts`: base 1,265; casa 1,17; gama 0,03; rho −0,05.
18. **Correcções ao Poisson**: os empates com golos têm peso ×1,13 (o Poisson independente dá poucos empates); os resultados com mais de 5 golos são amortecidos ×0,6 por golo a mais (o Poisson dá goleadas a mais).
19. **Força com ruído por época** (σ = 4 em ataque e defesa, nova sorte em cada época): representa as mudanças de plantel e dá variedade de campeões.
20. **1.ª época (2026/27)**: não há época anterior, por isso as vagas continentais vão para os clubes de maior reputação de cada 1.ª divisão (o "vencedor da taça" é o seguinte da lista). Da 2.ª época em diante usam-se as classificações e as taças.
21. **Eliminatórias continentais com cabeças-de-série** (em vez de quadro fixo ou sorteio): play-off 9.º–24.º emparelhado 9.º–24.º, 10.º–23.º, ...; nos oitavos o 1.º joga com o vencedor do play-off pior classificado; nos quartos e meias o melhor que resta joga com o pior. Libertadores e Ásia: 1.os de grupo cabeças-de-série contra 2.os (pode repetir-se um adversário do grupo).
22. **Calendário de fim de época**: finais das taças no sábado da semana 47; finais da Liga Europa e da Conferência a meio da semana 48, finais da Champions, Libertadores e Ásia no sábado da semana 48; play-offs nas semanas 49–51; barragens na semana 51 (1.ª mão na quarta, em casa do clube da divisão de baixo; 2.ª mão no domingo).
23. **Prolongamento** com ⅓ dos golos esperados; **penáltis** quase 50/50, com ligeira vantagem do clube de maior reputação (+2 pontos percentuais por cada 10 de diferença, máximo 65%).
24. **Taças**: enquanto ainda entram clubes, um número ímpar dá isenção ao mais forte; depois da última entrada, se o número não for potência de 2, joga-se uma pré-eliminatória só entre os mais fracos. Casa = primeiro sorteado. Final no sábado da semana 47, em campo neutro.
25. **Reputação**: alvo = banda da liga na posição final + bónus (campeão +2, subida +3, descida −3, taça +2/+1, continentais por fase × prestígio); `nova = antiga + limita(0,2 × (alvo − antiga), ±5)`.
26. **Clubes do exterior**: reputação = piso da liga − 4 (± 2). Quando as combinações simples de nomes se esgotam (ao fim de muitas épocas), acrescenta-se um qualificativo ("do Norte", "Al Jadida") ou uma sílaba extra.
27. **Histórico**: guarda-se para sempre classificações, campeões, movimentos, taças, continentais, estatísticas e reputações. O detalhe dos jogos fica completo nas últimas 3 épocas; nas anteriores só nas 8 ligas principais (1.ª divisão de ENG, ESP, GER, ITA, FRA, POR, NED, BEL) e nas continentais. Gravação binária (JSON + Int32) com gzip, uma entrada por época no IndexedDB.
28. **Domínio em Espanha e Itália** (o mesmo clube ganha quase sempre): resulta das bandas de reputação provisórias (Espanha 95→55; o 1.º fica muito acima do 2.º). A corrigir com o documento de reputações do utilizador.
