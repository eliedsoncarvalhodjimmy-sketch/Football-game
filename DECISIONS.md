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
